// Errors that are likely transient and worth retrying
export const RETRYABLE_ERRORS = [
    'Upstream service unavailable',
    'upstream connect error',
    'Upstream Error 524',
    'API Error 524',
    'Service Unavailable',
    'temporarily unavailable',
    'overloaded',
    'rate limit'
];

export const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504, 522, 524]);

export function isRetryableError(errorMessage) {
    if (!errorMessage) return false;
    const lower = errorMessage.toLowerCase();
    return RETRYABLE_ERRORS.some(e => lower.includes(e.toLowerCase()));
}

export function isRetryableStatusCode(status) {
    return RETRYABLE_STATUS_CODES.has(Number(status));
}

function createAbortError() {
    if (typeof DOMException === 'function') {
        return new DOMException('The operation was aborted.', 'AbortError');
    }

    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return error;
}

export async function sleepWithAbort(ms, signal) {
    if (!Number.isFinite(ms) || ms <= 0) return;

    if (signal?.aborted) {
        throw createAbortError();
    }

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            resolve();
        }, ms);

        const cleanup = () => {
            clearTimeout(timer);
            if (signal && abortHandler) {
                signal.removeEventListener('abort', abortHandler);
            }
        };

        let abortHandler = null;
        if (signal) {
            abortHandler = () => {
                cleanup();
                reject(createAbortError());
            };
            signal.addEventListener('abort', abortHandler, { once: true });
        }
    });
}
