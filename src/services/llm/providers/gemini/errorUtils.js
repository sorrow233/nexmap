// Errors that are likely transient and worth retrying
export const RETRYABLE_ERRORS = [
    'Upstream service unavailable',
    'upstream connect error',
    'Service Unavailable',
    'temporarily unavailable',
    'overloaded',
    'rate limit'
];

export function isRetryableError(errorMessage) {
    if (!errorMessage) return false;
    const lower = errorMessage.toLowerCase();
    return RETRYABLE_ERRORS.some(e => lower.includes(e.toLowerCase()));
}
