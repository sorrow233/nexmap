import { getImageFromIDB } from '../imageStore';

const IMAGE_RESOLVE_CONCURRENCY = 2;
const IMAGE_RESOLVE_RETRY_ATTEMPTS = 2;
const IMAGE_RESOLVE_RETRY_DELAY_MS = 160;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runWithConcurrency = async (items = [], concurrency = 1, worker) => {
    const results = new Array(items.length);
    let nextIndex = 0;

    const runWorker = async () => {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await worker(items[index], index);
        }
    };

    const workerCount = Math.min(Math.max(1, concurrency), items.length);
    await Promise.all(Array.from({ length: workerCount }, runWorker));
    return results;
};

const withRetry = async (operation, attempts = IMAGE_RESOLVE_RETRY_ATTEMPTS) => {
    let lastError = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < attempts - 1) {
                await delay(IMAGE_RESOLVE_RETRY_DELAY_MS * (attempt + 1));
            }
        }
    }

    throw lastError;
};

const blobToBase64 = async (blob) => (
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    })
);

const buildResolvedImagePart = (mediaType, data) => ({
    type: 'image',
    source: {
        media_type: mediaType || 'image/png',
        data
    }
});

const fetchImageAsBase64 = async (url) => withRetry(async () => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    const blob = await resp.blob();
    return {
        data: await blobToBase64(blob),
        mediaType: blob.type || 'image/png'
    };
});

const resolveImagePart = async (part) => {
    const source = part?.source;
    if (!source) {
        console.warn('[LLM Utils] Image part has no source, skipping');
        return null;
    }

    try {
        if (source.type === 'idb' && source.id) {
            const data = await withRetry(async () => {
                const idbData = await getImageFromIDB(source.id);
                if (!idbData) throw new Error(`IDB image not found: ${source.id}`);
                return idbData;
            });
            return buildResolvedImagePart(source.media_type || 'image/png', data);
        }

        if (source.type === 'url' || source.media_type === 'url') {
            const url = source.url || source.data;
            const result = await fetchImageAsBase64(url);
            return buildResolvedImagePart(result.mediaType, result.data);
        }

        if (source.data) {
            return buildResolvedImagePart(source.media_type || 'image/png', source.data);
        }

        if (source.s3Url) {
            const result = await fetchImageAsBase64(source.s3Url);
            return buildResolvedImagePart(result.mediaType || source.media_type, result.data);
        }

        console.warn('[LLM Utils] Unknown image source type, skipping:', source);
        return null;
    } catch (error) {
        console.error('[LLM Utils] Image resolution failed:', error);
        return null;
    }
};

/**
 * Utility: Resolve ALL image types to Base64
 * Supports: idb (IndexedDB), url (remote), base64 (passthrough)
 * 
 * This is the primary image resolution function - use this for LLM calls.
 */
export const resolveAllImages = async (messages) => {
    const resolved = JSON.parse(JSON.stringify(messages));
    const imageJobs = [];

    resolved.forEach((msg, messageIndex) => {
        if (Array.isArray(msg.content)) {
            msg.content.forEach((part, partIndex) => {
                if (part?.type !== 'image') return;
                imageJobs.push({ messageIndex, partIndex, part });
            });
        }
    });

    const resolvedImageParts = await runWithConcurrency(
        imageJobs,
        IMAGE_RESOLVE_CONCURRENCY,
        (job) => resolveImagePart(job.part)
    );

    const resolvedImageByPosition = new Map();
    imageJobs.forEach((job, index) => {
        resolvedImageByPosition.set(`${job.messageIndex}:${job.partIndex}`, resolvedImageParts[index] || null);
    });

    for (let messageIndex = 0; messageIndex < resolved.length; messageIndex += 1) {
        const msg = resolved[messageIndex];
        if (!Array.isArray(msg.content)) continue;

        const filteredContent = [];
        msg.content.forEach((part, partIndex) => {
            if (part?.type !== 'image') {
                filteredContent.push(part);
                return;
            }

            const resolvedPart = resolvedImageByPosition.get(`${messageIndex}:${partIndex}`);
            if (resolvedPart) {
                filteredContent.push(resolvedPart);
            }
        });
        msg.content = filteredContent;
    }

    return resolved;
};

/**
 * @deprecated Use resolveAllImages instead
 * Utility: Resolve remote image URLs to Base64 (legacy)
 */
export const resolveRemoteImages = async (messages) => {
    console.warn('[LLM Utils] resolveRemoteImages is deprecated, use resolveAllImages');
    return resolveAllImages(messages);
};

/**
 * Utility: Determine auth method from URL
 */
export const getAuthMethod = (url) => {
    if (url.indexOf('googleapis.com') !== -1) return 'query';
    return 'bearer';
};
