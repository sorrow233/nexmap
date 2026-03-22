import { idbDel, idbGet, idbGetEntriesByPrefix, idbSet } from './db/indexedDB';

const BACKGROUND_CACHE_PREFIX = 'bgimg_';
const BACKGROUND_CACHE_LIMIT_BYTES = 300 * 1024 * 1024;
const IN_FLIGHT_BACKGROUND_FETCHES = new Map();

const normalizeRecord = (storedValue) => {
    if (!storedValue || typeof storedValue !== 'object') return null;
    if (!(storedValue.blob instanceof Blob)) return null;

    return {
        blob: storedValue.blob,
        sizeBytes: Number(storedValue.sizeBytes) || storedValue.blob.size || 0,
        contentType: storedValue.contentType || storedValue.blob.type || 'application/octet-stream',
        createdAt: Number(storedValue.createdAt) || 0,
        updatedAt: Number(storedValue.updatedAt) || 0,
        sourceUrl: typeof storedValue.sourceUrl === 'string' ? storedValue.sourceUrl : ''
    };
};

const buildCacheKey = (sourceUrl) => `${BACKGROUND_CACHE_PREFIX}${encodeURIComponent(sourceUrl)}`;

export const isCacheableBackgroundUrl = (sourceUrl) => {
    if (typeof sourceUrl !== 'string') return false;
    const normalized = sourceUrl.trim();
    if (!normalized) return false;
    if (normalized.startsWith('data:') || normalized.startsWith('blob:')) return false;
    return /^https?:\/\//i.test(normalized);
};

const ensureBackgroundCacheBudget = async (incomingBytes, incomingKey) => {
    const entries = await idbGetEntriesByPrefix(BACKGROUND_CACHE_PREFIX);
    const records = entries.map((entry) => {
        const normalized = normalizeRecord(entry.value);
        if (!normalized) return null;
        return {
            key: entry.key,
            sizeBytes: normalized.sizeBytes,
            updatedAt: normalized.updatedAt || normalized.createdAt || 0
        };
    }).filter(Boolean);

    const currentBytesExcludingIncoming = records
        .filter((record) => record.key !== incomingKey)
        .reduce((sum, record) => sum + record.sizeBytes, 0);

    if (incomingBytes > BACKGROUND_CACHE_LIMIT_BYTES) {
        throw new Error('Single background exceeds local background cache limit.');
    }

    if (currentBytesExcludingIncoming + incomingBytes <= BACKGROUND_CACHE_LIMIT_BYTES) {
        return;
    }

    const reclaimTarget = (currentBytesExcludingIncoming + incomingBytes) - BACKGROUND_CACHE_LIMIT_BYTES;
    let reclaimed = 0;
    const candidates = records
        .filter((record) => record.key !== incomingKey)
        .sort((a, b) => a.updatedAt - b.updatedAt);

    for (const candidate of candidates) {
        await idbDel(candidate.key);
        reclaimed += candidate.sizeBytes;
        if (reclaimed >= reclaimTarget) break;
    }
};

export const getCachedBackgroundBlob = async (sourceUrl) => {
    if (!isCacheableBackgroundUrl(sourceUrl)) return null;

    const key = buildCacheKey(sourceUrl);
    const storedValue = await idbGet(key);
    const normalized = normalizeRecord(storedValue);
    if (!normalized) return null;

    const now = Date.now();
    await idbSet(key, {
        blob: normalized.blob,
        sizeBytes: normalized.sizeBytes,
        contentType: normalized.contentType,
        sourceUrl: normalized.sourceUrl || sourceUrl,
        createdAt: normalized.createdAt || now,
        updatedAt: now
    });

    return normalized.blob;
};

export const cacheBackgroundBlob = async (sourceUrl, blob) => {
    if (!isCacheableBackgroundUrl(sourceUrl) || !(blob instanceof Blob)) return false;

    const key = buildCacheKey(sourceUrl);
    const now = Date.now();
    await ensureBackgroundCacheBudget(blob.size || 0, key);
    await idbSet(key, {
        blob,
        sizeBytes: blob.size || 0,
        contentType: blob.type || 'application/octet-stream',
        sourceUrl,
        createdAt: now,
        updatedAt: now
    });
    return true;
};

export const fetchAndCacheBackgroundBlob = async (sourceUrl, { signal } = {}) => {
    if (!isCacheableBackgroundUrl(sourceUrl)) return null;

    if (IN_FLIGHT_BACKGROUND_FETCHES.has(sourceUrl)) {
        return IN_FLIGHT_BACKGROUND_FETCHES.get(sourceUrl);
    }

    const fetchTask = (async () => {
        const response = await fetch(sourceUrl, {
            signal,
            cache: 'force-cache'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch background image: HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType && !contentType.startsWith('image/')) {
            throw new Error(`Unexpected background content type: ${contentType}`);
        }

        const blob = await response.blob();
        await cacheBackgroundBlob(sourceUrl, blob);
        return blob;
    })();

    IN_FLIGHT_BACKGROUND_FETCHES.set(sourceUrl, fetchTask);

    try {
        return await fetchTask;
    } finally {
        IN_FLIGHT_BACKGROUND_FETCHES.delete(sourceUrl);
    }
};
