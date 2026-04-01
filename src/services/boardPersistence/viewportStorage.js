import { debugLog } from '../../utils/debugLogger';
import { runWhenBrowserIdle } from '../../utils/idleTask';

const VIEWPORT_PREFIX = 'mixboard_viewport_';
const VIEWPORT_SAVE_TIMEOUT_MS = 1200;
const VIEWPORT_FALLBACK_DELAY_MS = 120;

const pendingViewportWrites = new Map();
let viewportRuntimeBound = false;

const cloneViewport = (viewport = {}) => ({
    offset: {
        x: Number(viewport?.offset?.x) || 0,
        y: Number(viewport?.offset?.y) || 0
    },
    scale: Number(viewport?.scale) || 1
});

const writeViewportStateNow = (boardId, viewport) => {
    if (!boardId) return;

    debugLog.storage(`Saving viewport for board ${boardId}`, viewport);
    try {
        localStorage.setItem(VIEWPORT_PREFIX + boardId, JSON.stringify(viewport));
    } catch (error) {
        debugLog.error(`Failed to save viewport state for board ${boardId}`, error);
    }
};

export const flushPendingViewportState = (boardId) => {
    const pending = pendingViewportWrites.get(boardId);
    if (!pending) return;

    pendingViewportWrites.delete(boardId);
    pending.cancel?.();
    writeViewportStateNow(boardId, pending.viewport);
};

export const flushAllPendingViewportStates = () => {
    Array.from(pendingViewportWrites.keys()).forEach((boardId) => {
        flushPendingViewportState(boardId);
    });
};

const ensureViewportRuntime = () => {
    if (viewportRuntimeBound || typeof window === 'undefined') {
        return;
    }

    const flushOnBackground = () => {
        flushAllPendingViewportStates();
    };

    window.addEventListener('pagehide', flushOnBackground);
    window.addEventListener('beforeunload', flushOnBackground);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            flushOnBackground();
        }
    });

    viewportRuntimeBound = true;
};

export const saveViewportState = (boardId, viewport, options = {}) => {
    if (!boardId) return;

    const normalizedViewport = cloneViewport(viewport);

    if (options.immediate === true) {
        flushPendingViewportState(boardId);
        writeViewportStateNow(boardId, normalizedViewport);
        return;
    }

    ensureViewportRuntime();

    const existingEntry = pendingViewportWrites.get(boardId);
    existingEntry?.cancel?.();

    const pendingEntry = {
        viewport: normalizedViewport,
        cancel: null
    };

    pendingEntry.cancel = runWhenBrowserIdle(() => {
        if (pendingViewportWrites.get(boardId) !== pendingEntry) {
            return;
        }

        pendingViewportWrites.delete(boardId);
        writeViewportStateNow(boardId, pendingEntry.viewport);
    }, {
        timeout: options.timeoutMs ?? VIEWPORT_SAVE_TIMEOUT_MS,
        fallbackDelay: options.fallbackDelay ?? VIEWPORT_FALLBACK_DELAY_MS
    });

    pendingViewportWrites.set(boardId, pendingEntry);
};

export const loadViewportState = (boardId) => {
    if (!boardId) return { offset: { x: 0, y: 0 }, scale: 1 };

    const pending = pendingViewportWrites.get(boardId);
    if (pending?.viewport) {
        return cloneViewport(pending.viewport);
    }

    debugLog.storage(`Loading viewport for board ${boardId}`);
    try {
        const stored = localStorage.getItem(VIEWPORT_PREFIX + boardId);
        if (stored) {
            const parsed = cloneViewport(JSON.parse(stored));
            debugLog.storage(`Viewport loaded for board ${boardId}`, parsed);
            return parsed;
        }
    } catch (error) {
        debugLog.error(`Failed to load viewport state for board ${boardId}`, error);
    }

    return { offset: { x: 0, y: 0 }, scale: 1 };
};
