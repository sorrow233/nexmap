const VERBOSE_CONSOLE_KEY = 'nexmap_verbose_console';
const PERSISTENCE_TRACE_CONSOLE_KEY = 'nexmap_persistence_trace_console';
const BLOCKED_RESOURCE_PATTERNS = [
    'beacon.min.js',
    '/beacon',
    'googletagmanager',
    'google-analytics',
    'gtag/js',
    'doubleclick',
    'clarity.ms'
];

const isDebugBuild = import.meta.env.DEV || import.meta.env.MODE === 'development' || import.meta.env.MODE === 'beta';

const readRuntimeFlag = (key) => {
    if (typeof window === 'undefined') return false;

    try {
        if (window.sessionStorage.getItem(key) === 'true') return true;
    } catch {
        // Ignore sessionStorage access errors.
    }

    try {
        if (window.localStorage.getItem(key) === 'true') return true;
    } catch {
        // Ignore localStorage access errors.
    }

    return window[`__${key.toUpperCase()}__`] === true;
};

const writeRuntimeFlag = (key, enabled) => {
    if (typeof window === 'undefined') return;

    window[`__${key.toUpperCase()}__`] = enabled === true;

    try {
        if (enabled) {
            window.localStorage.setItem(key, 'true');
        } else {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Ignore localStorage write errors.
    }
};

export const isVerboseConsoleEnabled = () => (
    isDebugBuild || readRuntimeFlag(VERBOSE_CONSOLE_KEY)
);

export const isPersistenceTraceConsoleEnabled = () => (
    isVerboseConsoleEnabled() || readRuntimeFlag(PERSISTENCE_TRACE_CONSOLE_KEY)
);

export const runtimeLog = (...args) => {
    if (!isVerboseConsoleEnabled()) return;
    console.log(...args);
};

export const runtimeWarn = (...args) => {
    if (!isVerboseConsoleEnabled()) return;
    console.warn(...args);
};

export const installRuntimeLoggingControls = () => {
    if (typeof window === 'undefined') return;
    if (window.__NEXMAP_RUNTIME_LOGGING_CONTROLS__ === true) return;

    window.__NEXMAP_RUNTIME_LOGGING_CONTROLS__ = true;
    window.enableVerboseClientLogs = () => writeRuntimeFlag(VERBOSE_CONSOLE_KEY, true);
    window.disableVerboseClientLogs = () => writeRuntimeFlag(VERBOSE_CONSOLE_KEY, false);
    window.enablePersistenceTraceConsole = () => writeRuntimeFlag(PERSISTENCE_TRACE_CONSOLE_KEY, true);
    window.disablePersistenceTraceConsole = () => writeRuntimeFlag(PERSISTENCE_TRACE_CONSOLE_KEY, false);
};

const getResourceErrorDetails = (target) => {
    if (!target || target === window) return null;

    return {
        tagName: target.tagName || 'UNKNOWN',
        source: target.src || target.href || '',
        id: target.id || '',
        className: typeof target.className === 'string' ? target.className : ''
    };
};

const isBlockedThirdPartyResourceNoise = (event, resourceDetails = {}) => {
    const source = String(resourceDetails.source || '').toLowerCase();
    const message = [
        event?.message,
        event?.error?.message
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (message.includes('err_blocked_by_client')) {
        return true;
    }

    if (!source) {
        return false;
    }

    return BLOCKED_RESOURCE_PATTERNS.some((pattern) => source.includes(pattern));
};

const normalizeFetchRequest = (input, init = {}) => {
    if (typeof Request !== 'undefined' && input instanceof Request) {
        return {
            url: input.url,
            method: init.method || input.method || 'GET'
        };
    }

    return {
        url: typeof input === 'string' ? input : String(input),
        method: init.method || 'GET'
    };
};

export const installGlobalErrorLogging = () => {
    if (typeof window === 'undefined') return;
    if (window.__NEXMAP_GLOBAL_ERROR_LOGGING__ === true) return;

    window.__NEXMAP_GLOBAL_ERROR_LOGGING__ = true;

    window.addEventListener('error', (event) => {
        const resourceDetails = getResourceErrorDetails(event.target);

        if (resourceDetails) {
            if (isBlockedThirdPartyResourceNoise(event, resourceDetails)) {
                runtimeWarn('[GlobalError] Ignored blocked third-party resource', resourceDetails);
                return;
            }
            console.error('[GlobalError] Resource load failed', resourceDetails);
            return;
        }

        console.error('[GlobalError] Unhandled runtime error', {
            message: event.message || '',
            filename: event.filename || '',
            lineno: event.lineno || 0,
            colno: event.colno || 0,
            error: event.error || null
        });
    }, true);

    window.addEventListener('unhandledrejection', (event) => {
        console.error('[GlobalError] Unhandled promise rejection', event.reason || event);
    });
};

export const installFetchErrorLogging = () => {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    if (window.__NEXMAP_FETCH_ERROR_LOGGING__ === true) return;

    window.__NEXMAP_FETCH_ERROR_LOGGING__ = true;
    const originalFetch = window.fetch.bind(window);
    const isAbortLikeError = (error) => (
        error?.name === 'AbortError' ||
        String(error?.message || '').toLowerCase().includes('aborted')
    );

    window.fetch = async (input, init) => {
        const startedAt = Date.now();
        const requestMeta = normalizeFetchRequest(input, init);

        try {
            const response = await originalFetch(input, init);
            if (!response.ok) {
                console.error('[GlobalFetchError] Non-OK response', {
                    ...requestMeta,
                    status: response.status,
                    statusText: response.statusText || '',
                    elapsedMs: Date.now() - startedAt
                });
            }
            return response;
        } catch (error) {
            if (isAbortLikeError(error)) {
                throw error;
            }
            console.error('[GlobalFetchError] Request failed', {
                ...requestMeta,
                elapsedMs: Date.now() - startedAt
            }, error);
            throw error;
        }
    };
};
