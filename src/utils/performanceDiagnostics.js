const PERFORMANCE_DIAG_STORE_KEY = '__NEXMAP_PERFORMANCE_DIAGNOSTICS__';
const PERFORMANCE_DIAG_INSTALL_KEY = '__NEXMAP_PERFORMANCE_DIAGNOSTICS_INSTALLED__';
const MAX_PERFORMANCE_DIAG_ENTRIES = 800;

const LONG_TASK_THRESHOLD_MS = 50;
const CRITICAL_LONG_TASK_THRESHOLD_MS = 250;
const EVENT_LOOP_LAG_THRESHOLD_MS = 150;
const CRITICAL_EVENT_LOOP_LAG_THRESHOLD_MS = 500;
const FRAME_STALL_THRESHOLD_MS = 80;
const CRITICAL_FRAME_STALL_THRESHOLD_MS = 250;
const FPS_WINDOW_MS = 5000;
const LOW_FPS_THRESHOLD = 45;
const RESOURCE_SLOW_THRESHOLD_MS = 1500;
const RESOURCE_LARGE_THRESHOLD_BYTES = 2 * 1024 * 1024;
const HEAP_GROWTH_THRESHOLD_MB = 128;
const HEAP_PRESSURE_RATIO = 0.65;

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

const logEntry = (entry) => {
    if (!isBrowser || !isPerformanceDiagnosticsEnabled()) return;

    const summary = {
        severity: entry.severity,
        durationMs: entry.meta?.durationMs,
        lagMs: entry.meta?.lagMs,
        fps: entry.meta?.fps,
        usedMB: entry.heap?.usedJSHeapSizeMB,
        domNodes: entry.dom?.totalNodes,
        cards: entry.store?.cards,
        expandedCardId: entry.store?.expandedCardId,
        cpuProxy: entry.meta?.cpuProxy,
        gpuProxy: entry.meta?.gpuProxy
    };

    if (entry.severity === 'critical') {
        console.warn(`[NexMap PerformanceDiag] ${entry.label}`, summary, entry);
    } else {
        console.info(`[NexMap PerformanceDiag] ${entry.label}`, summary, entry);
    }
};

export const recordPerformanceDiagnostic = (label, meta = {}, options = {}) => {
    if (!isBrowser || !isPerformanceDiagnosticsEnabled()) return null;
    const entry = pushEntry(buildEntry(label, meta, options));
    logEntry(entry);
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

    recordPerformanceDiagnostic('input.slow-event', {
        durationMs,
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
    }, {
        severity: severityForDuration(durationMs, 250, 80)
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

    const onFrame = (timestamp) => {
        if (!lastFrameTime) {
            lastFrameTime = timestamp;
            resetWindow(timestamp);
            window.requestAnimationFrame(onFrame);
            return;
        }

        const frameMs = timestamp - lastFrameTime;
        lastFrameTime = timestamp;
        frames += 1;
        totalFrameMs += frameMs;
        maxFrameMs = Math.max(maxFrameMs, frameMs);

        if (frameMs >= FRAME_STALL_THRESHOLD_MS) {
            longFrames += 1;
            recordPerformanceDiagnostic('render.frame-stall', {
                frameMs: toRoundedNumber(frameMs, 2),
                droppedFrameEstimate: Math.max(0, Math.floor(frameMs / 16.67) - 1),
                cpuProxy: {
                    mainThreadOrSchedulerStallMs: toRoundedNumber(frameMs, 2)
                },
                gpuProxy: {
                    renderFrameOverBudgetMs: toRoundedNumber(Math.max(0, frameMs - 16.67), 2),
                    note: 'Browser APIs do not expose GPU percent; this is a render-frame pressure proxy.'
                }
            }, {
                severity: frameMs >= CRITICAL_FRAME_STALL_THRESHOLD_MS ? 'critical' : 'warning'
            });
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

    window.requestAnimationFrame(onFrame);
};

const installEventLoopLagSampler = () => {
    if (!isBrowser) return;

    let expectedAt = performance.now() + 1000;
    window.setInterval(() => {
        const now = performance.now();
        const lagMs = now - expectedAt;
        expectedAt += 1000;
        if (lagMs > 5000) {
            expectedAt = now + 1000;
        }
        if (lagMs < EVENT_LOOP_LAG_THRESHOLD_MS) return;

        recordPerformanceDiagnostic('cpu.event-loop-lag', {
            lagMs: toRoundedNumber(lagMs, 2),
            cpuProxy: {
                eventLoopLagMs: toRoundedNumber(lagMs, 2)
            }
        }, {
            severity: lagMs >= CRITICAL_EVENT_LOOP_LAG_THRESHOLD_MS ? 'critical' : 'warning'
        });
    }, 1000);
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
