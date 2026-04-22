const PERF_DIAG_STORE_KEY = '__NEXMAP_PERFORMANCE_DIAGNOSTICS__';
const PERF_DIAG_MARKS_KEY = '__NEXMAP_PERFORMANCE_DIAGNOSTIC_MARKS__';
const PERF_DIAG_MAX_ENTRIES = 700;
const DEFAULT_SLOW_THRESHOLD_MS = 16;
const RESOURCE_SLOW_THRESHOLD_MS = 900;
const RESOURCE_LARGE_THRESHOLD_BYTES = 750 * 1024;

const isBrowser = typeof window !== 'undefined';

const toRoundedNumber = (value, digits = 2) => {
    if (!Number.isFinite(value)) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
};

const safeReadLocalStorage = (key) => {
    if (!isBrowser) return null;
    try {
        return window.localStorage?.getItem?.(key) || null;
    } catch {
        return null;
    }
};

const safeWriteLocalStorage = (key, value) => {
    if (!isBrowser) return;
    try {
        window.localStorage?.setItem?.(key, value);
    } catch {
        // Ignore storage restrictions.
    }
};

const safeRemoveLocalStorage = (key) => {
    if (!isBrowser) return;
    try {
        window.localStorage?.removeItem?.(key);
    } catch {
        // Ignore storage restrictions.
    }
};

const isPerfDiagnosticsEnabled = () => (
    safeReadLocalStorage('nexmap_perf_diagnostics') !== 'off'
);

const readHeapSnapshot = () => {
    if (!isBrowser || !window.performance?.memory) {
        return {
            usedJSHeapSizeMB: null,
            totalJSHeapSizeMB: null,
            jsHeapSizeLimitMB: null
        };
    }

    const memory = window.performance.memory;
    return {
        usedJSHeapSizeMB: toRoundedNumber(memory.usedJSHeapSize / (1024 * 1024)),
        totalJSHeapSizeMB: toRoundedNumber(memory.totalJSHeapSize / (1024 * 1024)),
        jsHeapSizeLimitMB: toRoundedNumber(memory.jsHeapSizeLimit / (1024 * 1024))
    };
};

const readDomSnapshot = () => {
    if (!isBrowser || !document?.querySelectorAll) {
        return {
            totalNodes: null,
            canvasCards: null,
            chatMessages: null,
            images: null,
            canvases: null
        };
    }

    return {
        totalNodes: document.querySelectorAll('*').length,
        canvasCards: document.querySelectorAll('[data-nexmap-card-id]').length,
        chatMessages: document.querySelectorAll('[id^="message-"]').length,
        images: document.querySelectorAll('img').length,
        canvases: document.querySelectorAll('canvas').length
    };
};

const sanitizeValue = (value, depth = 0) => {
    if (depth > 3) return '[MaxDepth]';
    if (value == null) return value;
    if (typeof value === 'number') return Number.isFinite(value) ? toRoundedNumber(value, 3) : null;
    if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}...` : value;
    if (typeof value === 'boolean') return value;
    if (value instanceof Set) return { type: 'Set', size: value.size };
    if (value instanceof Map) return { type: 'Map', size: value.size };
    if (Array.isArray(value)) {
        if (value.length > 30) {
            return {
                type: 'Array',
                length: value.length,
                sample: value.slice(0, 8).map((item) => sanitizeValue(item, depth + 1))
            };
        }
        return value.map((item) => sanitizeValue(item, depth + 1));
    }
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue, depth + 1)])
        );
    }

    return String(value);
};

const ensurePerformanceDiagnosticsStore = () => {
    if (!isBrowser) return [];

    if (!Array.isArray(window[PERF_DIAG_STORE_KEY])) {
        window[PERF_DIAG_STORE_KEY] = [];
    }

    if (!(window[PERF_DIAG_MARKS_KEY] instanceof Map)) {
        window[PERF_DIAG_MARKS_KEY] = new Map();
    }

    if (typeof window.copyPerformanceDiagnostics !== 'function') {
        window.copyPerformanceDiagnostics = () => JSON.stringify(window[PERF_DIAG_STORE_KEY] || [], null, 2);
    }

    if (typeof window.copyAllNexMapDiagnostics !== 'function') {
        window.copyAllNexMapDiagnostics = () => JSON.stringify({
            performance: window[PERF_DIAG_STORE_KEY] || [],
            memory: window.__NEXMAP_MEMORY_TRACE__ || [],
            perfProbe: window.__NEXMAP_PERF_PROBE__ || []
        }, null, 2);
    }

    if (typeof window.clearPerformanceDiagnostics !== 'function') {
        window.clearPerformanceDiagnostics = () => {
            window[PERF_DIAG_STORE_KEY] = [];
            if (window[PERF_DIAG_MARKS_KEY] instanceof Map) {
                window[PERF_DIAG_MARKS_KEY].clear();
            }
            console.info('[NexMap Performance] cleared');
        };
    }

    if (typeof window.enablePerformanceDiagnostics !== 'function') {
        window.enablePerformanceDiagnostics = () => {
            safeRemoveLocalStorage('nexmap_perf_diagnostics');
            console.info('[NexMap Performance] enabled');
        };
    }

    if (typeof window.disablePerformanceDiagnostics !== 'function') {
        window.disablePerformanceDiagnostics = () => {
            safeWriteLocalStorage('nexmap_perf_diagnostics', 'off');
            console.info('[NexMap Performance] disabled');
        };
    }

    return window[PERF_DIAG_STORE_KEY];
};

const buildEntry = (label, meta = {}) => ({
    label,
    ts: Date.now(),
    tsIso: new Date().toISOString(),
    perfNowMs: toRoundedNumber(typeof performance !== 'undefined' ? performance.now() : 0, 3),
    route: isBrowser ? window.location?.pathname || '' : '',
    heap: readHeapSnapshot(),
    dom: readDomSnapshot(),
    meta: sanitizeValue(meta)
});

const pushPerformanceEntry = (entry) => {
    if (!isBrowser) return entry;
    const entries = ensurePerformanceDiagnosticsStore();
    entries.push(entry);

    if (entries.length > PERF_DIAG_MAX_ENTRIES) {
        entries.splice(0, entries.length - PERF_DIAG_MAX_ENTRIES);
    }

    return entry;
};

const isInterestingDiagnostic = (meta = {}, options = {}) => {
    if (options.force === true) return true;
    const durationMs = Number(meta?.durationMs);
    const thresholdMs = Number.isFinite(Number(options.thresholdMs))
        ? Number(options.thresholdMs)
        : DEFAULT_SLOW_THRESHOLD_MS;
    return Number.isFinite(durationMs) && durationMs >= thresholdMs;
};

const logPerformanceEntry = (entry, options = {}) => {
    if (!isBrowser || !isPerfDiagnosticsEnabled()) return;

    console.groupCollapsed(`[NexMap Performance] ${entry.label}`, {
        durationMs: entry.meta?.durationMs,
        usedMB: entry.heap.usedJSHeapSizeMB,
        domNodes: entry.dom.totalNodes
    });
    console.log(entry);
    console.table([{
        label: entry.label,
        durationMs: entry.meta?.durationMs,
        usedMB: entry.heap.usedJSHeapSizeMB,
        totalMB: entry.heap.totalJSHeapSizeMB,
        domNodes: entry.dom.totalNodes,
        canvasCards: entry.dom.canvasCards,
        chatMessages: entry.dom.chatMessages
    }]);
    console.groupEnd();
};

export const recordPerformanceDiagnostic = (label, meta = {}, options = {}) => {
    if (!isBrowser) return null;
    if (!isInterestingDiagnostic(meta, options)) return null;

    const entry = pushPerformanceEntry(buildEntry(label, meta));
    logPerformanceEntry(entry, options);
    return entry;
};

export const measureSyncPerformance = (label, callback, meta = {}, options = {}) => {
    if (!isBrowser || typeof performance === 'undefined') {
        return callback();
    }

    const startedAt = performance.now();
    const result = callback();
    const durationMs = toRoundedNumber(performance.now() - startedAt, 3);
    if (!isInterestingDiagnostic({ ...meta, durationMs }, options)) {
        return result;
    }

    recordPerformanceDiagnostic(label, {
        ...meta,
        durationMs
    }, options);
    return result;
};

export const startPerformanceDiagnostic = (label, meta = {}) => {
    if (!isBrowser || typeof performance === 'undefined') return;
    ensurePerformanceDiagnosticsStore();
    window[PERF_DIAG_MARKS_KEY].set(label, {
        startedAt: performance.now(),
        meta
    });
};

export const endPerformanceDiagnostic = (label, meta = {}, options = {}) => {
    if (!isBrowser || typeof performance === 'undefined') return null;
    ensurePerformanceDiagnosticsStore();
    const mark = window[PERF_DIAG_MARKS_KEY].get(label);
    const durationMs = mark ? toRoundedNumber(performance.now() - mark.startedAt, 3) : null;
    if (mark) {
        window[PERF_DIAG_MARKS_KEY].delete(label);
    }
    return recordPerformanceDiagnostic(label, {
        ...(mark?.meta || {}),
        ...meta,
        durationMs
    }, options);
};

const summarizeResourceTiming = (entry) => ({
    name: entry.name,
    initiatorType: entry.initiatorType,
    durationMs: toRoundedNumber(entry.duration, 3),
    transferSizeKB: toRoundedNumber((Number(entry.transferSize) || 0) / 1024),
    encodedBodySizeKB: toRoundedNumber((Number(entry.encodedBodySize) || 0) / 1024),
    decodedBodySizeKB: toRoundedNumber((Number(entry.decodedBodySize) || 0) / 1024)
});

const recordSlowResourceTiming = (entry) => {
    const transferSize = Number(entry.transferSize) || 0;
    const encodedBodySize = Number(entry.encodedBodySize) || 0;
    const isSlow = entry.duration >= RESOURCE_SLOW_THRESHOLD_MS;
    const isLarge = Math.max(transferSize, encodedBodySize) >= RESOURCE_LARGE_THRESHOLD_BYTES;
    if (!isSlow && !isLarge) return;

    recordPerformanceDiagnostic('resource-load', summarizeResourceTiming(entry), {
        force: true
    });
};

const recordNavigationTiming = () => {
    const navEntry = performance.getEntriesByType?.('navigation')?.[0];
    if (!navEntry) return;

    recordPerformanceDiagnostic('navigation-timing', {
        durationMs: toRoundedNumber(navEntry.duration, 3),
        domInteractiveMs: toRoundedNumber(navEntry.domInteractive, 3),
        domContentLoadedMs: toRoundedNumber(navEntry.domContentLoadedEventEnd, 3),
        loadEventMs: toRoundedNumber(navEntry.loadEventEnd, 3),
        transferSizeKB: toRoundedNumber((Number(navEntry.transferSize) || 0) / 1024),
        encodedBodySizeKB: toRoundedNumber((Number(navEntry.encodedBodySize) || 0) / 1024)
    }, {
        force: true
    });
};

const recordResourceSummary = () => {
    const resources = performance.getEntriesByType?.('resource') || [];
    const summary = resources.reduce((acc, entry) => {
        acc.count += 1;
        acc.totalDurationMs += Number(entry.duration) || 0;
        acc.totalTransferKB += (Number(entry.transferSize) || 0) / 1024;
        acc.totalEncodedKB += (Number(entry.encodedBodySize) || 0) / 1024;
        if (entry.duration > acc.slowest.durationMs) {
            acc.slowest = summarizeResourceTiming(entry);
        }
        return acc;
    }, {
        count: 0,
        totalDurationMs: 0,
        totalTransferKB: 0,
        totalEncodedKB: 0,
        slowest: { durationMs: 0 }
    });

    recordPerformanceDiagnostic('resource-summary', {
        count: summary.count,
        totalDurationMs: toRoundedNumber(summary.totalDurationMs, 3),
        totalTransferKB: toRoundedNumber(summary.totalTransferKB),
        totalEncodedKB: toRoundedNumber(summary.totalEncodedKB),
        slowest: summary.slowest
    }, {
        force: true
    });
};

export const installBrowserPerformanceDiagnostics = () => {
    if (!isBrowser || window.__NEXMAP_PERFORMANCE_DIAGNOSTICS_INSTALLED__) {
        return;
    }

    window.__NEXMAP_PERFORMANCE_DIAGNOSTICS_INSTALLED__ = true;
    ensurePerformanceDiagnosticsStore();

    if (typeof PerformanceObserver === 'function') {
        try {
            const longTaskObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    recordPerformanceDiagnostic('browser-long-task', {
                        durationMs: toRoundedNumber(entry.duration, 3),
                        name: entry.name,
                        startTimeMs: toRoundedNumber(entry.startTime, 3)
                    }, {
                        force: true
                    });
                });
            });
            longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch {
            // Long task observation is not available in all browsers.
        }

        try {
            const resourceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(recordSlowResourceTiming);
            });
            resourceObserver.observe({ type: 'resource', buffered: true });
        } catch {
            // Resource observation can be restricted by browser support.
        }
    }

    window.setTimeout(() => {
        recordNavigationTiming();
        recordResourceSummary();
    }, 1800);
};
