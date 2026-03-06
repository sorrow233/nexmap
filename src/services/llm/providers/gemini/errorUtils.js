// Errors that are likely transient and worth retrying
export const RETRYABLE_ERRORS = [
    'upstream service unavailable',
    'upstream connect error',
    'service unavailable',
    'temporarily unavailable',
    'overloaded',
    'rate limit',
    'too many requests',
    'deadline exceeded',
    'backend error',
    'network',
    'fetch failed',
    'quic'
];

// 429 removed from both sets: rate-limit must NEVER trigger retry (amplifies requests)
// and must NEVER mark a key as "failed" (causes key-rotation that drains the pool).
export const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 500, 502, 503, 504, 524]);
export const KEY_FAILURE_STATUS_CODES = new Set([401, 403]);

export function isRetryableError(errorMessage) {
    if (!errorMessage) return false;
    const lower = String(errorMessage).toLowerCase();
    return RETRYABLE_ERRORS.some(e => lower.includes(e));
}

export function isRetryableStatus(statusCode) {
    return RETRYABLE_STATUS_CODES.has(Number(statusCode));
}

export function isKeyFailureStatus(statusCode) {
    return KEY_FAILURE_STATUS_CODES.has(Number(statusCode));
}

export function isAbortError(error) {
    return error?.name === 'AbortError';
}

export function isRetryableNetworkError(error) {
    if (!error) return false;
    if (isAbortError(error)) return false;

    const msg = String(error?.message || error).toLowerCase();
    return msg.includes('network') ||
        msg.includes('fetch failed') ||
        msg.includes('failed to fetch') ||
        msg.includes('quic') ||
        msg.includes('socket') ||
        msg.includes('timeout') ||
        msg.includes('timed out') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout');
}

export function computeBackoffDelay(attempt, baseMs = 900, maxMs = 10000) {
    const exp = Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1)));
    const jitter = Math.floor(Math.random() * 250);
    return exp + jitter;
}
