const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 500, 502, 503, 504, 524]);
const RETRYABLE_ERROR_PATTERNS = [
    'temporarily unavailable',
    'service unavailable',
    'overloaded',
    'upstream',
    'timeout',
    'timed out',
    'network',
    'unavailable'
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function computeBackoffDelay(attempt, baseMs = 700, maxMs = 8000) {
    const exp = Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1)));
    const jitter = Math.floor(Math.random() * 250);
    return exp + jitter;
}

function isRetryableText(text = '') {
    const lower = String(text).toLowerCase();
    return RETRYABLE_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}

function shouldRetryUpstream({ statusCode, errorText = '', error = null }) {
    const code = Number(statusCode);

    if (code === 429 || code === 401 || code === 403) {
        return false;
    }

    if (RETRYABLE_STATUS_CODES.has(code)) {
        return true;
    }

    if (isRetryableText(errorText)) {
        return true;
    }

    if (error) {
        if (error.name === 'AbortError') return true;
        if (isRetryableText(error.message || String(error))) return true;
        return true;
    }

    return false;
}

function getRetryPolicy(stream = false) {
    if (stream) {
        return {
            maxAttempts: 1,
            timeoutMs: 22000
        };
    }

    return {
        maxAttempts: 2,
        timeoutMs: 45000
    };
}

export async function fetchUpstreamWithRetry(url, requestInit, { stream = false } = {}) {
    const { maxAttempts, timeoutMs } = getRetryPolicy(stream);
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts) {
        attempt += 1;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort('upstream_timeout'), timeoutMs);

        try {
            const response = await fetch(url, {
                ...requestInit,
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                const canRetry = attempt < maxAttempts && shouldRetryUpstream({
                    statusCode: response.status,
                    errorText
                });

                if (canRetry) {
                    await wait(computeBackoffDelay(attempt));
                    continue;
                }

                return { response, errorText };
            }

            return { response, errorText: '' };
        } catch (error) {
            clearTimeout(timer);
            const isTimeoutAbort = controller.signal.aborted && error?.name === 'AbortError';
            lastError = isTimeoutAbort
                ? new Error(`Upstream timeout after ${timeoutMs}ms`)
                : error;

            const canRetry = attempt < maxAttempts && shouldRetryUpstream({ error: lastError });
            if (canRetry) {
                await wait(computeBackoffDelay(attempt));
                continue;
            }

            throw lastError;
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error('Upstream request failed after retries');
}
