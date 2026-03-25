const PERF_STORE_KEY = '__NEXMAP_PERF_PROBE__';
const PERF_TIMERS_KEY = '__NEXMAP_PERF_PROBE_TIMERS__';
const MAX_PERF_ENTRIES = 300;

const isBrowser = typeof window !== 'undefined';

const getPerfEntries = () => {
    if (!isBrowser) return [];

    if (!Array.isArray(window[PERF_STORE_KEY])) {
        window[PERF_STORE_KEY] = [];
    }

    if (!(window[PERF_TIMERS_KEY] instanceof Map)) {
        window[PERF_TIMERS_KEY] = new Map();
    }

    if (typeof window.copyPerfProbe !== 'function') {
        window.copyPerfProbe = () => JSON.stringify(window[PERF_STORE_KEY] || [], null, 2);
    }

    if (typeof window.clearPerfProbe !== 'function') {
        window.clearPerfProbe = () => {
            window[PERF_STORE_KEY] = [];
            if (window[PERF_TIMERS_KEY] instanceof Map) {
                window[PERF_TIMERS_KEY].clear();
            }
        };
    }

    return window[PERF_STORE_KEY];
};

const getPerfTimers = () => {
    if (!isBrowser) return new Map();
    getPerfEntries();
    return window[PERF_TIMERS_KEY];
};

const toRoundedNumber = (value, digits = 2) => {
    if (!Number.isFinite(value)) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
};

const readHeapSnapshot = () => {
    if (!isBrowser || !window.performance) {
        return {
            usedJSHeapSizeMB: null,
            totalJSHeapSizeMB: null,
            jsHeapSizeLimitMB: null
        };
    }

    const memory = window.performance.memory;
    if (!memory) {
        return {
            usedJSHeapSizeMB: null,
            totalJSHeapSizeMB: null,
            jsHeapSizeLimitMB: null
        };
    }

    return {
        usedJSHeapSizeMB: toRoundedNumber(memory.usedJSHeapSize / (1024 * 1024)),
        totalJSHeapSizeMB: toRoundedNumber(memory.totalJSHeapSize / (1024 * 1024)),
        jsHeapSizeLimitMB: toRoundedNumber(memory.jsHeapSizeLimit / (1024 * 1024))
    };
};

export const captureDomCount = (root = (isBrowser ? document : null)) => {
    if (!isBrowser || !root?.querySelectorAll) return null;
    return root.querySelectorAll('*').length;
};

const pushPerfEntry = (entry = {}) => {
    if (!isBrowser) return entry;

    const entries = getPerfEntries();
    entries.push(entry);

    if (entries.length > MAX_PERF_ENTRIES) {
        entries.splice(0, entries.length - MAX_PERF_ENTRIES);
    }

    return entry;
};

const createPerfEntry = (type, label, meta = {}) => ({
    type,
    label,
    ts: Date.now(),
    perfNowMs: toRoundedNumber(typeof performance !== 'undefined' ? performance.now() : 0, 3),
    domNodes: captureDomCount(),
    ...readHeapSnapshot(),
    ...meta
});

export const markPerfEvent = (label, meta = {}) => (
    pushPerfEntry(createPerfEntry('mark', label, meta))
);

export const startPerfMeasure = (label, meta = {}) => {
    const timers = getPerfTimers();
    timers.set(label, {
        startedAt: typeof performance !== 'undefined' ? performance.now() : 0,
        meta
    });

    return markPerfEvent(`${label}:start`, meta);
};

export const endPerfMeasure = (label, meta = {}) => {
    const timers = getPerfTimers();
    const timer = timers.get(label);
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const durationMs = timer ? toRoundedNumber(now - timer.startedAt, 3) : null;

    if (timer) {
        timers.delete(label);
    }

    return pushPerfEntry(createPerfEntry('measure', label, {
        durationMs,
        ...(timer?.meta || {}),
        ...meta
    }));
};

export const capturePerfSnapshot = (label, meta = {}) => (
    pushPerfEntry(createPerfEntry('snapshot', label, meta))
);
