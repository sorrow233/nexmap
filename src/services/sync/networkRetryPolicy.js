export const REMOTE_METADATA_RETRY_BASE_MS = 10_000;
export const REMOTE_METADATA_RETRY_MAX_MS = 300_000;
export const REMOTE_METADATA_RETRY_JITTER = 0.2;

const RETRYABLE_FIRESTORE_ERROR_CODES = new Set([
    'aborted',
    'cancelled',
    'deadline-exceeded',
    'internal',
    'resource-exhausted',
    'unavailable',
    'unknown'
]);

const normalizeAttempt = (attempt) => Math.max(0, Math.floor(Number(attempt) || 0));

export const getRemoteMetadataRetryDelay = (
    attempt,
    {
        random = Math.random,
        baseMs = REMOTE_METADATA_RETRY_BASE_MS,
        maxMs = REMOTE_METADATA_RETRY_MAX_MS,
        jitter = REMOTE_METADATA_RETRY_JITTER
    } = {}
) => {
    const safeBaseMs = Math.max(1, Number(baseMs) || REMOTE_METADATA_RETRY_BASE_MS);
    const safeMaxMs = Math.max(safeBaseMs, Number(maxMs) || REMOTE_METADATA_RETRY_MAX_MS);
    const safeJitter = Math.min(1, Math.max(0, Number(jitter) || 0));
    const exponentialDelay = Math.min(
        safeMaxMs,
        safeBaseMs * (2 ** Math.min(normalizeAttempt(attempt), 20))
    );
    const randomValue = Math.min(1, Math.max(0, Number(random()) || 0));
    const jitterMultiplier = 1 - safeJitter + ((safeJitter * 2) * randomValue);

    return Math.min(safeMaxMs, Math.round(exponentialDelay * jitterMultiplier));
};

export const isNetworkAvailable = () => (
    typeof navigator === 'undefined' || navigator.onLine !== false
);

export const isRetryableFirestoreError = (error) => {
    const normalizedCode = String(error?.code || '')
        .replace(/^firestore\//, '')
        .toLowerCase();

    if (!normalizedCode) {
        return true;
    }

    return RETRYABLE_FIRESTORE_ERROR_CODES.has(normalizedCode);
};
