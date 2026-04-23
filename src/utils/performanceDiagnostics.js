const PERFORMANCE_DIAG_STORE_KEY = '__NEXMAP_PERFORMANCE_DIAGNOSTICS__';
const PERFORMANCE_DIAG_INSTALL_KEY = '__NEXMAP_PERFORMANCE_DIAGNOSTICS_INSTALLED__';
const MAX_PERFORMANCE_DIAG_ENTRIES = 800;

const LONG_TASK_THRESHOLD_MS = 50;
const CRITICAL_LONG_TASK_THRESHOLD_MS = 250;
const EVENT_LOOP_LAG_THRESHOLD_MS = 150;
const CRITICAL_EVENT_LOOP_LAG_THRESHOLD_MS = 500;
const EVENT_LOOP_SAMPLE_INTERVAL_MS = 1000;
const BACKGROUND_TIMER_THROTTLE_GAP_MS = 30000;
const FRAME_STALL_THRESHOLD_MS = 80;
const CRITICAL_FRAME_STALL_THRESHOLD_MS = 250;
const FRAME_SAMPLER_RESET_GAP_MS = 5000;
const FPS_WINDOW_MS = 5000;
const LOW_FPS_THRESHOLD = 45;
const RESOURCE_SLOW_THRESHOLD_MS = 1500;
const RESOURCE_LARGE_THRESHOLD_BYTES = 2 * 1024 * 1024;
const HEAP_GROWTH_THRESHOLD_MB = 128;
const HEAP_PRESSURE_RATIO = 0.65;
const INPUT_EVENT_BATCH_WINDOW_MS = 160;
const FRAME_STALL_BATCH_WINDOW_MS = 160;
const DEFAULT_CONSOLE_LOG_THROTTLE_MS = 300;
const CONSOLE_LOG_THROTTLE_MS_BY_LABEL = {
    'cpu.long-task': 500,
    'cpu.event-loop-lag': 3000,
    'input.slow-event-batch': 700,
    'render.frame-stall-batch': 1200,
    'render.fps-window': 2500,
    'resource.slow-or-large': 5000,
    'memory.heap-pressure': 2000
};

const isBrowser = typeof window !== 'undefined';
const FIRESTORE_CHANNEL_RESOURCE_PATTERN = /firestore\.googleapis\.com\/google\.firestore\.v1\.Firestore\/(?:Listen|Write)\/channel/i;
const STREAMING_RESOURCE_PATTERN = /(?::streamGenerateContent|\/google\.firestore\.v1\.Firestore\/(?:Listen|Write)\/channel)/i;
const consoleLogAtByKey = new Map();
const consoleSuppressedByKey = new Map();

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
        // Best-effort diagnostic controls only.
    }
};

const safeRemoveLocalStorage = (key) => {
    if (!isBrowser) return;
    try {
        window.localStorage?.removeItem?.(key);
    } catch {
        // Best-effort diagnostic controls only.
    }
};

const isPerformanceDiagnosticsEnabled = () => (
    safeReadLocalStorage('nexmap_performance_diagnostics') !== 'off'
);

const getEntries = () => {
    if (!isBrowser) return [];
    if (!Array.isArray(window[PERFORMANCE_DIAG_STORE_KEY])) {
        window[PERFORMANCE_DIAG_STORE_KEY] = [];
    }
    return window[PERFORMANCE_DIAG_STORE_KEY];
};

const readHeapSnapshot = () => {
    const memory = isBrowser ? window.performance?.memory : null;
    if (!memory) {
        return {
            usedJSHeapSizeMB: null,
            totalJSHeapSizeMB: null,
            jsHeapSizeLimitMB: null,
            heapUsedRatio: null
        };
    }

    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    const totalMB = memory.totalJSHeapSize / (1024 * 1024);
    const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

    return {
        usedJSHeapSizeMB: toRoundedNumber(usedMB),
        totalJSHeapSizeMB: toRoundedNumber(totalMB),
        jsHeapSizeLimitMB: toRoundedNumber(limitMB),
        heapUsedRatio: limitMB > 0 ? toRoundedNumber(usedMB / limitMB, 4) : null
    };
};

const readDomSnapshot = () => {
    if (!isBrowser || !document?.querySelectorAll) {
        return {
            totalNodes: null,
            canvasCards: null,
            chatMessages: null,
            canvases: null,
            images: null
        };
    }

    return {
        totalNodes: document.querySelectorAll('*').length,
        canvasCards: document.querySelectorAll('[data-nexmap-card-id]').length,
        chatMessages: document.querySelectorAll('[id^="message-"]').length,
        canvases: document.querySelectorAll('canvas').length,
        images: document.querySelectorAll('img').length
    };
};

const readStoreSnapshot = () => {
    const state = isBrowser ? window.useStore?.getState?.() : null;
    if (!state) {
        return {
            boardId: null,
            cards: null,
            expandedCardId: null,
            generatingCards: null,
            isBoardLoading: null
        };
    }

    return {
        boardId: state.currentBoardId || null,
        cards: Array.isArray(state.cards) ? state.cards.length : null,
        expandedCardId: state.expandedCardId || null,
        generatingCards: state.generatingCardIds?.size || 0,
        selectedCards: Array.isArray(state.selectedIds) ? state.selectedIds.length : 0,
        isBoardLoading: state.isBoardLoading === true
    };
};

const readSystemSnapshot = () => {
    if (!isBrowser) {
        return {
            hardwareConcurrency: null,
            deviceMemoryGB: null
        };
    }

    return {
        hardwareConcurrency: Number(navigator.hardwareConcurrency) || null,
        deviceMemoryGB: Number(navigator.deviceMemory) || null
    };
};

let cachedGpuSnapshot = null;

const readGpuSnapshot = () => {
    if (!isBrowser) {
        return {
            supported: false,
            reason: 'not_browser'
        };
    }

    if (cachedGpuSnapshot) return cachedGpuSnapshot;

    const canvas = document.createElement('canvas');
    let gl = null;
    try {
        gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch {
        gl = null;
    }

    if (!gl) {
        cachedGpuSnapshot = {
            supported: false,
            reason: 'webgl_unavailable'
        };
        return cachedGpuSnapshot;
    }

    let vendor = '';
    let renderer = '';
    try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            vendor = String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
            renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
        }
    } catch {
        vendor = '';
        renderer = '';
    }

    cachedGpuSnapshot = {
        supported: true,
        context: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl',
        vendor,
        renderer,
        maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || null,
        maxRenderbufferSize: Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || null,
        maxTextureImageUnits: Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)) || null
    };

    try {
        gl.getExtension('WEBGL_lose_context')?.loseContext?.();
    } catch {
        // Ignore cleanup failures.
    }

    return cachedGpuSnapshot;
};

const getCurrentRoute = () => (
    isBrowser
        ? `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`
        : ''
);

const sanitizeUrl = (value = '') => {
    if (!value || !isBrowser) return '';
    try {
        const url = new URL(value, window.location.href);
        return `${url.origin}${url.pathname}`.slice(0, 240);
    } catch {
        return String(value).slice(0, 240);
    }
};

const isDocumentHidden = () => (
    isBrowser &&
    typeof document !== 'undefined' &&
    document.visibilityState === 'hidden'
);

const isLongLivedStreamingResource = (entry) => {
    const name = String(entry?.name || '');
    if (!name) return false;
    return FIRESTORE_CHANNEL_RESOURCE_PATTERN.test(name) || STREAMING_RESOURCE_PATTERN.test(name);
};

const severityForDuration = (durationMs, criticalMs, warningMs) => {
    if (durationMs >= criticalMs) return 'critical';
    if (durationMs >= warningMs) return 'warning';
    return 'info';
};

const buildEntry = (label, meta = {}, options = {}) => ({
    label,
    severity: options.severity || 'warning',
    ts: Date.now(),
    perfNowMs: toRoundedNumber(isBrowser ? performance.now() : 0, 3),
    route: getCurrentRoute(),
    system: readSystemSnapshot(),
    heap: readHeapSnapshot(),
    dom: readDomSnapshot(),
    store: readStoreSnapshot(),
    gpu: options.includeGpu === true ? readGpuSnapshot() : undefined,
    meta
});

const pushEntry = (entry) => {
    const entries = getEntries();
    entries.push(entry);
    if (entries.length > MAX_PERFORMANCE_DIAG_ENTRIES) {
        entries.splice(0, entries.length - MAX_PERFORMANCE_DIAG_ENTRIES);
    }
    return entry;
};

const getConsoleThrottleMs = (entry) => {
    const labelThrottleMs = CONSOLE_LOG_THROTTLE_MS_BY_LABEL[entry.label];
    if (Number.isFinite(labelThrottleMs)) return labelThrottleMs;
    if (entry.severity === 'critical') return 500;
    return DEFAULT_CONSOLE_LOG_THROTTLE_MS;
};

const logEntry = (entry, options = {}) => {
    if (!isBrowser || (!isPerformanceDiagnosticsEnabled() && options.force !== true)) return;

    const now = performance.now();
    const consoleKey = `${entry.label}:${entry.severity}`;
    const throttleMs = options.force === true ? 0 : getConsoleThrottleMs(entry);
    const lastLoggedAt = consoleLogAtByKey.get(consoleKey) || 0;
    if (throttleMs > 0 && now - lastLoggedAt < throttleMs) {
        consoleSuppressedByKey.set(consoleKey, (consoleSuppressedByKey.get(consoleKey) || 0) + 1);
        return;
    }
    consoleLogAtByKey.set(consoleKey, now);
    const suppressedSinceLastLog = consoleSuppressedByKey.get(consoleKey) || 0;
    consoleSuppressedByKey.delete(consoleKey);

    const summary = {
        severity: entry.severity,
        durationMs: entry.meta?.durationMs ?? entry.meta?.maxDurationMs ?? entry.meta?.maxFrameMs,
        count: entry.meta?.count,
        lagMs: entry.meta?.lagMs,
        fps: entry.meta?.fps,
        maxFrameMs: entry.meta?.maxFrameMs,
        maxInputDelayMs: entry.meta?.maxInputDelayMs,
        suppressedSinceLastLog: suppressedSinceLastLog || undefined,
        usedMB: entry.heap?.usedJSHeapSizeMB,
        domNodes: entry.dom?.totalNodes,
        cards: entry.store?.cards,
        expandedCardId: entry.store?.expandedCardId,
        cpuProxy: entry.meta?.cpuProxy,
        gpuProxy: entry.meta?.gpuProxy
    };

    console.info(`[NexMap PerformanceDiag] ${entry.label}`, summary);
};

export const recordPerformanceDiagnostic = (label, meta = {}, options = {}) => {
    if (!isBrowser || (!isPerformanceDiagnosticsEnabled() && options.force !== true)) return null;
    const entry = pushEntry(buildEntry(label, meta, options));
    logEntry(entry, options);
    return entry;
};

const installControls = () => {
    if (!isBrowser) return;

    getEntries();

    if (typeof window.copyPerformanceDiagnostics !== 'function') {
        window.copyPerformanceDiagnostics = () => JSON.stringify(window[PERFORMANCE_DIAG_STORE_KEY] || [], null, 2);
    }

    if (typeof window.clearPerformanceDiagnostics !== 'function') {
        window.clearPerformanceDiagnostics = () => {
            window[PERFORMANCE_DIAG_STORE_KEY] = [];
            console.info('[NexMap PerformanceDiag] cleared');
        };
    }

    if (typeof window.enablePerformanceDiagnostics !== 'function') {
        window.enablePerformanceDiagnostics = () => {
            safeRemoveLocalStorage('nexmap_performance_diagnostics');
            console.info('[NexMap PerformanceDiag] enabled');
        };
    }

    if (typeof window.disablePerformanceDiagnostics !== 'function') {
        window.disablePerformanceDiagnostics = () => {
            safeWriteLocalStorage('nexmap_performance_diagnostics', 'off');
            console.info('[NexMap PerformanceDiag] disabled');
        };
    }

    if (typeof window.capturePerformanceDiagnosticSnapshot !== 'function') {
        window.capturePerformanceDiagnosticSnapshot = (label = 'manual-snapshot') => recordPerformanceDiagnostic(
            label,
            {
                source: 'manual',
                cpuProxy: {
                    note: 'Browser APIs do not expose process CPU percent; long tasks and event-loop lag are logged as CPU pressure proxies.'
                },
                gpuProxy: {
                    note: 'Browser APIs do not expose GPU utilization percent; frame stalls, FPS windows, canvas count, and WebGL context events are logged as GPU/render pressure proxies.'
                }
            },
            {
                force: true,
                includeGpu: true,
                severity: 'info'
            }
        );
    }

    if (typeof window.copyAllNexMapDiagnostics !== 'function') {
        window.copyAllNexMapDiagnostics = () => JSON.stringify({
            performanceDiagnostics: window[PERFORMANCE_DIAG_STORE_KEY] || [],
            memory: window.__NEXMAP_MEMORY_TRACE__ || [],
            perfProbe: window.__NEXMAP_PERF_PROBE__ || []
        }, null, 2);
    }
};

const installObserver = (entryTypes, callback) => {
    if (!isBrowser || typeof PerformanceObserver !== 'function') return null;
    const supported = PerformanceObserver.supportedEntryTypes || [];
    const supportedTypes = entryTypes.filter((type) => supported.includes(type));
    if (supportedTypes.length === 0) return null;

    const observers = [];
    supportedTypes.forEach((type) => {
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(callback);
            });
            observer.observe({ type, buffered: true });
            observers.push(observer);
        } catch {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach(callback);
                });
                observer.observe({ entryTypes: [type] });
                observers.push(observer);
            } catch {
                // Unsupported observer option in this browser.
            }
        }
    });
    return observers.length > 0 ? observers : null;
};

let slowInputEventBatch = null;
let slowInputEventFlushTimer = null;

const createSlowInputEventBatch = () => ({
    count: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    maxInputDelayMs: null,
    maxProcessingMs: null,
    firstStartTimeMs: null,
    lastStartTimeMs: null,
    eventCounts: {},
    interactionIds: [],
    samples: []
});

const rememberInteractionId = (batch, interactionId) => {
    if (interactionId === null || interactionId === undefined || interactionId === 0) return;
    if (batch.interactionIds.includes(interactionId)) return;
    if (batch.interactionIds.length >= 8) return;
    batch.interactionIds.push(interactionId);
};

const flushSlowInputEventBatch = () => {
    if (slowInputEventFlushTimer !== null) {
        window.clearTimeout(slowInputEventFlushTimer);
        slowInputEventFlushTimer = null;
    }

    const batch = slowInputEventBatch;
    slowInputEventBatch = null;
    if (!batch || batch.count === 0) return;

    const maxDurationMs = toRoundedNumber(batch.maxDurationMs, 2);
    const avgDurationMs = toRoundedNumber(batch.totalDurationMs / batch.count, 2);
    const eventCounts = Object.fromEntries(
        Object.entries(batch.eventCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
    );

    recordPerformanceDiagnostic('input.slow-event-batch', {
        durationMs: maxDurationMs,
        count: batch.count,
        maxDurationMs,
        avgDurationMs,
        maxInputDelayMs: batch.maxInputDelayMs,
        maxProcessingMs: batch.maxProcessingMs,
        firstStartTimeMs: batch.firstStartTimeMs,
        lastStartTimeMs: batch.lastStartTimeMs,
        eventCounts,
        interactionIds: batch.interactionIds,
        samples: batch.samples,
        cpuProxy: {
            maxInputHandlerBlockedMs: maxDurationMs,
            avgInputHandlerBlockedMs: avgDurationMs,
            batchedEvents: batch.count
        }
    }, {
        severity: severityForDuration(maxDurationMs, 250, 80)
    });
};

const queueSlowInputEvent = (eventMeta) => {
    if (!isBrowser || !isPerformanceDiagnosticsEnabled()) return;

    if (!slowInputEventBatch) {
        slowInputEventBatch = createSlowInputEventBatch();
    }

    const batch = slowInputEventBatch;
    const durationMs = Number(eventMeta.durationMs) || 0;
    const eventName = eventMeta.eventName || 'unknown';

    batch.count += 1;
    batch.totalDurationMs += durationMs;
    batch.maxDurationMs = Math.max(batch.maxDurationMs, durationMs);
    batch.firstStartTimeMs = batch.firstStartTimeMs ?? eventMeta.startTimeMs;
    batch.lastStartTimeMs = eventMeta.startTimeMs;
    batch.eventCounts[eventName] = (batch.eventCounts[eventName] || 0) + 1;
    rememberInteractionId(batch, eventMeta.interactionId);

    if (Number.isFinite(eventMeta.inputDelayMs)) {
        batch.maxInputDelayMs = batch.maxInputDelayMs === null
            ? eventMeta.inputDelayMs
            : Math.max(batch.maxInputDelayMs, eventMeta.inputDelayMs);
    }
    if (Number.isFinite(eventMeta.processingMs)) {
        batch.maxProcessingMs = batch.maxProcessingMs === null
            ? eventMeta.processingMs
            : Math.max(batch.maxProcessingMs, eventMeta.processingMs);
    }

    if (batch.samples.length < 6) {
        batch.samples.push(eventMeta);
    }

    if (slowInputEventFlushTimer === null) {
        slowInputEventFlushTimer = window.setTimeout(flushSlowInputEventBatch, INPUT_EVENT_BATCH_WINDOW_MS);
    }
};

let frameStallBatch = null;
let frameStallFlushTimer = null;

const createFrameStallBatch = () => ({
    count: 0,
    totalFrameMs: 0,
    maxFrameMs: 0,
    maxDroppedFrameEstimate: 0,
    firstFrameTimeMs: null,
    lastFrameTimeMs: null
});

const flushFrameStallBatch = () => {
    if (frameStallFlushTimer !== null) {
        window.clearTimeout(frameStallFlushTimer);
        frameStallFlushTimer = null;
    }

    const batch = frameStallBatch;
    frameStallBatch = null;
    if (!batch || batch.count === 0) return;

    const maxFrameMs = toRoundedNumber(batch.maxFrameMs, 2);
    const avgFrameMs = toRoundedNumber(batch.totalFrameMs / batch.count, 2);

    recordPerformanceDiagnostic('render.frame-stall-batch', {
        durationMs: maxFrameMs,
        count: batch.count,
        maxFrameMs,
        avgFrameMs,
        totalStallMs: toRoundedNumber(batch.totalFrameMs, 2),
        maxDroppedFrameEstimate: batch.maxDroppedFrameEstimate,
        firstFrameTimeMs: batch.firstFrameTimeMs,
        lastFrameTimeMs: batch.lastFrameTimeMs,
        cpuProxy: {
            maxMainThreadOrSchedulerStallMs: maxFrameMs,
            avgMainThreadOrSchedulerStallMs: avgFrameMs,
            batchedFrames: batch.count
        },
        gpuProxy: {
            maxRenderFrameOverBudgetMs: toRoundedNumber(Math.max(0, batch.maxFrameMs - 16.67), 2),
            maxDroppedFrameEstimate: batch.maxDroppedFrameEstimate,
            note: 'Browser APIs do not expose GPU percent; this is a render-frame pressure proxy.'
        }
    }, {
        severity: batch.maxFrameMs >= CRITICAL_FRAME_STALL_THRESHOLD_MS ? 'critical' : 'warning'
    });
};

const queueFrameStall = (frameMs, timestamp) => {
    if (!isBrowser || !isPerformanceDiagnosticsEnabled()) return;

    if (!frameStallBatch) {
        frameStallBatch = createFrameStallBatch();
    }

    const batch = frameStallBatch;
    const droppedFrameEstimate = Math.max(0, Math.floor(frameMs / 16.67) - 1);
    batch.count += 1;
    batch.totalFrameMs += frameMs;
    batch.maxFrameMs = Math.max(batch.maxFrameMs, frameMs);
    batch.maxDroppedFrameEstimate = Math.max(batch.maxDroppedFrameEstimate, droppedFrameEstimate);
    batch.firstFrameTimeMs = batch.firstFrameTimeMs ?? toRoundedNumber(timestamp, 2);
    batch.lastFrameTimeMs = toRoundedNumber(timestamp, 2);

    if (frameStallFlushTimer === null) {
        frameStallFlushTimer = window.setTimeout(flushFrameStallBatch, FRAME_STALL_BATCH_WINDOW_MS);
    }
};

const installLongTaskObserver = () => installObserver(['longtask'], (entry) => {
    const durationMs = toRoundedNumber(entry.duration, 2);
    if (!Number.isFinite(durationMs) || durationMs < LONG_TASK_THRESHOLD_MS) return;

    recordPerformanceDiagnostic('cpu.long-task', {
        durationMs,
        startTimeMs: toRoundedNumber(entry.startTime, 2),
        name: entry.name || '',
        attribution: Array.from(entry.attribution || []).slice(0, 4).map((item) => ({
            name: item.name || '',
            entryType: item.entryType || '',
            containerType: item.containerType || '',
            containerName: item.containerName || ''
        })),
        cpuProxy: {
            mainThreadBlockedMs: durationMs,
            blockedFrameBudgets: toRoundedNumber(durationMs / 16.67, 1)
        }
    }, {
        severity: severityForDuration(durationMs, CRITICAL_LONG_TASK_THRESHOLD_MS, LONG_TASK_THRESHOLD_MS)
    });
});

const installEventTimingObserver = () => installObserver(['event'], (entry) => {
    const durationMs = toRoundedNumber(entry.duration, 2);
    if (!Number.isFinite(durationMs) || durationMs < 80) return;

    queueSlowInputEvent({
        durationMs,
        startTimeMs: toRoundedNumber(entry.startTime, 2),
        eventName: entry.name || '',
        interactionId: entry.interactionId || null,
        inputDelayMs: Number.isFinite(entry.processingStart)
            ? toRoundedNumber(entry.processingStart - entry.startTime, 2)
            : null,
        processingMs: Number.isFinite(entry.processingEnd) && Number.isFinite(entry.processingStart)
            ? toRoundedNumber(entry.processingEnd - entry.processingStart, 2)
            : null,
        cpuProxy: {
            inputHandlerBlockedMs: durationMs
        }
    });
});

const installLayoutShiftObserver = () => installObserver(['layout-shift'], (entry) => {
    if (entry.hadRecentInput || entry.value < 0.1) return;

    recordPerformanceDiagnostic('layout.unexpected-shift', {
        value: toRoundedNumber(entry.value, 4),
        startTimeMs: toRoundedNumber(entry.startTime, 2),
        sources: Array.from(entry.sources || []).slice(0, 5).map((source) => ({
            node: source.node?.nodeName || '',
            previousRect: source.previousRect ? {
                x: toRoundedNumber(source.previousRect.x, 1),
                y: toRoundedNumber(source.previousRect.y, 1),
                width: toRoundedNumber(source.previousRect.width, 1),
                height: toRoundedNumber(source.previousRect.height, 1)
            } : null,
            currentRect: source.currentRect ? {
                x: toRoundedNumber(source.currentRect.x, 1),
                y: toRoundedNumber(source.currentRect.y, 1),
                width: toRoundedNumber(source.currentRect.width, 1),
                height: toRoundedNumber(source.currentRect.height, 1)
            } : null
        }))
    }, {
        severity: entry.value >= 0.25 ? 'critical' : 'warning'
    });
});

const installResourceObserver = () => installObserver(['resource'], (entry) => {
    const durationMs = toRoundedNumber(entry.duration, 2);
    const transferSize = Number(entry.transferSize) || 0;
    if (
        durationMs < RESOURCE_SLOW_THRESHOLD_MS
        && transferSize < RESOURCE_LARGE_THRESHOLD_BYTES
    ) {
        return;
    }

    if (isLongLivedStreamingResource(entry)) {
        return;
    }

    recordPerformanceDiagnostic('resource.slow-or-large', {
        durationMs,
        name: sanitizeUrl(entry.name),
        initiatorType: entry.initiatorType || '',
        transferSizeKB: transferSize ? toRoundedNumber(transferSize / 1024, 1) : null,
        encodedBodySizeKB: entry.encodedBodySize ? toRoundedNumber(entry.encodedBodySize / 1024, 1) : null,
        decodedBodySizeKB: entry.decodedBodySize ? toRoundedNumber(entry.decodedBodySize / 1024, 1) : null,
        responseEndMs: toRoundedNumber(entry.responseEnd, 2)
    }, {
        severity: durationMs >= 5000 || transferSize >= 8 * 1024 * 1024 ? 'critical' : 'warning'
    });
});

const installNavigationSnapshot = () => {
    if (!isBrowser) return;
    window.addEventListener('load', () => {
        window.setTimeout(() => {
            const nav = performance.getEntriesByType?.('navigation')?.[0];
            if (!nav) return;

            recordPerformanceDiagnostic('navigation.summary', {
                durationMs: toRoundedNumber(nav.duration, 2),
                domContentLoadedMs: toRoundedNumber(nav.domContentLoadedEventEnd, 2),
                loadEventEndMs: toRoundedNumber(nav.loadEventEnd, 2),
                transferSizeKB: nav.transferSize ? toRoundedNumber(nav.transferSize / 1024, 1) : null,
                decodedBodySizeKB: nav.decodedBodySize ? toRoundedNumber(nav.decodedBodySize / 1024, 1) : null
            }, {
                severity: nav.duration >= 5000 ? 'critical' : 'info',
                includeGpu: true
            });
        }, 0);
    }, { once: true });
};

const installFrameSampler = () => {
    if (!isBrowser || typeof window.requestAnimationFrame !== 'function') return;

    let lastFrameTime = 0;
    let windowStartedAt = 0;
    let frames = 0;
    let longFrames = 0;
    let maxFrameMs = 0;
    let totalFrameMs = 0;

    const resetWindow = (timestamp) => {
        windowStartedAt = timestamp;
        frames = 0;
        longFrames = 0;
        maxFrameMs = 0;
        totalFrameMs = 0;
    };

    const resetSampler = (timestamp = 0) => {
        lastFrameTime = timestamp;
        resetWindow(timestamp);
    };

    const onFrame = (timestamp) => {
        if (isDocumentHidden()) {
            resetSampler(0);
            window.requestAnimationFrame(onFrame);
            return;
        }

        if (!lastFrameTime) {
            lastFrameTime = timestamp;
            resetWindow(timestamp);
            window.requestAnimationFrame(onFrame);
            return;
        }

        const frameMs = timestamp - lastFrameTime;
        if (frameMs > FRAME_SAMPLER_RESET_GAP_MS) {
            resetSampler(timestamp);
            window.requestAnimationFrame(onFrame);
            return;
        }

        lastFrameTime = timestamp;
        frames += 1;
        totalFrameMs += frameMs;
        maxFrameMs = Math.max(maxFrameMs, frameMs);

        if (frameMs >= FRAME_STALL_THRESHOLD_MS) {
            longFrames += 1;
            queueFrameStall(frameMs, timestamp);
        }

        if (timestamp - windowStartedAt >= FPS_WINDOW_MS) {
            const elapsedMs = timestamp - windowStartedAt;
            const fps = elapsedMs > 0 ? (frames / elapsedMs) * 1000 : 0;
            const avgFrameMs = frames > 0 ? totalFrameMs / frames : 0;
            if (fps < LOW_FPS_THRESHOLD || longFrames >= 6 || maxFrameMs >= FRAME_STALL_THRESHOLD_MS) {
                recordPerformanceDiagnostic('render.fps-window', {
                    durationMs: toRoundedNumber(elapsedMs, 2),
                    fps: toRoundedNumber(fps, 1),
                    frames,
                    longFrames,
                    maxFrameMs: toRoundedNumber(maxFrameMs, 2),
                    avgFrameMs: toRoundedNumber(avgFrameMs, 2),
                    gpuProxy: {
                        fps,
                        longFrames,
                        maxFrameMs: toRoundedNumber(maxFrameMs, 2)
                    }
                }, {
                    severity: fps < 30 || maxFrameMs >= CRITICAL_FRAME_STALL_THRESHOLD_MS ? 'critical' : 'warning'
                });
            }
            resetWindow(timestamp);
        }

        window.requestAnimationFrame(onFrame);
    };

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            resetSampler(isDocumentHidden() ? 0 : performance.now());
        });
    }

    window.requestAnimationFrame(onFrame);
};

const installEventLoopLagSampler = () => {
    if (!isBrowser) return;

    let lastSampleAt = performance.now();
    window.setInterval(() => {
        const now = performance.now();
        const elapsedMs = now - lastSampleAt;
        lastSampleAt = now;

        if (isDocumentHidden() || elapsedMs > BACKGROUND_TIMER_THROTTLE_GAP_MS) {
            return;
        }

        const lagMs = elapsedMs - EVENT_LOOP_SAMPLE_INTERVAL_MS;
        if (lagMs < EVENT_LOOP_LAG_THRESHOLD_MS) return;

        recordPerformanceDiagnostic('cpu.event-loop-lag', {
            lagMs: toRoundedNumber(lagMs, 2),
            cpuProxy: {
                eventLoopLagMs: toRoundedNumber(lagMs, 2)
            }
        }, {
            severity: lagMs >= CRITICAL_EVENT_LOOP_LAG_THRESHOLD_MS ? 'critical' : 'warning'
        });
    }, EVENT_LOOP_SAMPLE_INTERVAL_MS);
};

const installMemoryPressureSampler = () => {
    if (!isBrowser) return;

    let previousUsedMB = readHeapSnapshot().usedJSHeapSizeMB || 0;
    window.setInterval(() => {
        const heap = readHeapSnapshot();
        const usedMB = Number(heap.usedJSHeapSizeMB) || 0;
        const growthMB = usedMB - previousUsedMB;
        previousUsedMB = usedMB;

        if (
            (Number(heap.heapUsedRatio) || 0) < HEAP_PRESSURE_RATIO
            && growthMB < HEAP_GROWTH_THRESHOLD_MB
        ) {
            return;
        }

        recordPerformanceDiagnostic('memory.heap-pressure', {
            usedMB,
            growthMB: toRoundedNumber(growthMB, 2),
            heapUsedRatio: heap.heapUsedRatio
        }, {
            severity: heap.heapUsedRatio >= 0.8 || growthMB >= 256 ? 'critical' : 'warning'
        });
    }, 10000);
};

const patchCanvasContextDiagnostics = () => {
    if (!isBrowser || !window.HTMLCanvasElement?.prototype) return;

    const prototype = window.HTMLCanvasElement.prototype;
    if (prototype.__nexMapPerformanceDiagnosticsPatched === true) return;

    const originalGetContext = prototype.getContext;
    if (typeof originalGetContext !== 'function') return;

    Object.defineProperty(prototype, '__nexMapPerformanceDiagnosticsPatched', {
        value: true,
        configurable: true
    });

    prototype.getContext = function patchedGetContext(type, ...args) {
        const context = originalGetContext.call(this, type, ...args);
        const contextType = String(type || '').toLowerCase();
        if (context && (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl')) {
            if (this.__nexMapWebglDiagnosticsObserved !== true) {
                Object.defineProperty(this, '__nexMapWebglDiagnosticsObserved', {
                    value: true,
                    configurable: true
                });

                recordPerformanceDiagnostic('gpu.webgl-context-created', {
                    contextType,
                    canvasWidth: this.width || null,
                    canvasHeight: this.height || null,
                    gpuProxy: {
                        note: 'WebGL context creation observed; browser does not expose GPU utilization percent.'
                    }
                }, {
                    includeGpu: true,
                    severity: 'info'
                });

                this.addEventListener('webglcontextlost', (event) => {
                    recordPerformanceDiagnostic('gpu.webgl-context-lost', {
                        statusMessage: event.statusMessage || '',
                        gpuProxy: {
                            contextLost: true
                        }
                    }, {
                        includeGpu: true,
                        severity: 'critical'
                    });
                });

                this.addEventListener('webglcontextrestored', () => {
                    recordPerformanceDiagnostic('gpu.webgl-context-restored', {
                        gpuProxy: {
                            contextRestored: true
                        }
                    }, {
                        includeGpu: true,
                        severity: 'warning'
                    });
                });
            }
        }
        return context;
    };
};

export const installPerformanceDiagnostics = () => {
    if (!isBrowser) return;
    if (window[PERFORMANCE_DIAG_INSTALL_KEY] === true) return;
    window[PERFORMANCE_DIAG_INSTALL_KEY] = true;

    installControls();
    recordPerformanceDiagnostic('diagnostics.installed', {
        cpuProxy: {
            note: 'CPU percent is unavailable in browser JavaScript; long tasks and event-loop lag are CPU pressure proxies.'
        },
        gpuProxy: {
            note: 'GPU utilization percent is unavailable in browser JavaScript; frame stalls, FPS windows, canvas count, and WebGL events are GPU/render pressure proxies.'
        }
    }, {
        includeGpu: true,
        severity: 'info'
    });

    installLongTaskObserver();
    installEventTimingObserver();
    installLayoutShiftObserver();
    installResourceObserver();
    installNavigationSnapshot();
    installFrameSampler();
    installEventLoopLagSampler();
    installMemoryPressureSampler();
    patchCanvasContextDiagnostics();
};
