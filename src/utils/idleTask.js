const FALLBACK_IDLE_TIMEOUT_MS = 200;

export const runWhenBrowserIdle = (callback, options = {}) => {
    if (typeof window === 'undefined') {
        const timeoutId = setTimeout(() => {
            callback({
                didTimeout: false,
                timeRemaining: () => 0
            });
        }, 0);

        return () => clearTimeout(timeoutId);
    }

    if (typeof window.requestIdleCallback === 'function') {
        const idleId = window.requestIdleCallback(callback, {
            timeout: options.timeout ?? 1000
        });
        return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(() => {
        callback({
            didTimeout: false,
            timeRemaining: () => 0
        });
    }, options.fallbackDelay ?? FALLBACK_IDLE_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
};
