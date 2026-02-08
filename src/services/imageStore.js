import { idbSet, idbGet, idbDel, idbGetEntriesByPrefix } from './db/indexedDB';

const IMAGE_PREFIX = 'img_';
const IMAGE_CACHE_LIMIT_BYTES = 300 * 1024 * 1024; // 300MB

const estimateBase64Bytes = (base64Data = '') => {
    if (!base64Data) return 0;
    const len = base64Data.length;
    let padding = 0;
    if (base64Data.endsWith('==')) padding = 2;
    else if (base64Data.endsWith('=')) padding = 1;
    return Math.floor((len * 3) / 4) - padding;
};

const normalizeRecord = (storedValue) => {
    if (!storedValue) return null;

    if (typeof storedValue === 'string') {
        return {
            data: storedValue,
            sizeBytes: estimateBase64Bytes(storedValue),
            createdAt: 0,
            updatedAt: 0,
            legacy: true
        };
    }

    if (typeof storedValue === 'object' && typeof storedValue.data === 'string') {
        return {
            data: storedValue.data,
            sizeBytes: storedValue.sizeBytes || estimateBase64Bytes(storedValue.data),
            createdAt: storedValue.createdAt || 0,
            updatedAt: storedValue.updatedAt || 0,
            legacy: false
        };
    }

    return null;
};

const ensureImageCacheBudget = async (incomingBytes, incomingKey) => {
    const entries = await idbGetEntriesByPrefix(IMAGE_PREFIX);
    const records = entries.map(entry => {
        const normalized = normalizeRecord(entry.value);
        if (!normalized) return null;
        return {
            key: entry.key,
            sizeBytes: normalized.sizeBytes,
            updatedAt: normalized.updatedAt || normalized.createdAt || 0
        };
    }).filter(Boolean);

    const currentBytesExcludingIncoming = records
        .filter(record => record.key !== incomingKey)
        .reduce((sum, record) => sum + record.sizeBytes, 0);

    if (incomingBytes > IMAGE_CACHE_LIMIT_BYTES) {
        throw new Error('Single image exceeds local image cache limit (300MB).');
    }

    if (currentBytesExcludingIncoming + incomingBytes <= IMAGE_CACHE_LIMIT_BYTES) {
        return;
    }

    const reclaimTarget = (currentBytesExcludingIncoming + incomingBytes) - IMAGE_CACHE_LIMIT_BYTES;
    let reclaimed = 0;
    const candidates = records
        .filter(record => record.key !== incomingKey)
        .sort((a, b) => a.updatedAt - b.updatedAt);

    for (const candidate of candidates) {
        await idbDel(candidate.key);
        reclaimed += candidate.sizeBytes;
        if (reclaimed >= reclaimTarget) break;
    }
};

export const saveImageToIDB = async (imageId, base64Data) => {
    if (!imageId || !base64Data) return;
    try {
        const key = IMAGE_PREFIX + imageId;
        const now = Date.now();
        const sizeBytes = estimateBase64Bytes(base64Data);

        await ensureImageCacheBudget(sizeBytes, key);
        await idbSet(key, {
            data: base64Data,
            sizeBytes,
            createdAt: now,
            updatedAt: now
        });
        return true;
    } catch (e) {
        console.error('[Storage] Failed to save image to IDB', e);
        return false;
    }
};

export const getImageFromIDB = async (imageId) => {
    if (!imageId) return null;
    try {
        const key = IMAGE_PREFIX + imageId;
        const storedValue = await idbGet(key);
        const normalized = normalizeRecord(storedValue);
        if (!normalized) return null;

        // Touch for LRU; also migrate legacy string records.
        const now = Date.now();
        await idbSet(key, {
            data: normalized.data,
            sizeBytes: normalized.sizeBytes,
            createdAt: normalized.createdAt || now,
            updatedAt: now
        });

        return normalized.data;
    } catch (e) {
        console.error('[Storage] Failed to get image from IDB', e);
        return null;
    }
};

// Helper: Download image from S3 URL and convert to base64
export const downloadImageAsBase64 = async (url) => {
    try {
        console.log('[S3 Download] Fetching:', url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('text/html') !== -1) {
            throw new Error('Received HTML content instead of image (fetch likely redirected to SPA index)');
        }

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                console.log('[S3 Download] Success:', url.substring(0, 50) + '...');
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('[S3 Download] Failed:', error);
        return null;
    }
};
