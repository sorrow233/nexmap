import { estimateCardTextChars } from './boardPerformance';
import { getCardBodyRuntimeCacheSnapshot } from '../services/cardBodyRuntimeCache';

const MEMORY_TRACE_STORE_KEY = '__NEXMAP_MEMORY_TRACE__';
const MEMORY_TRACE_TIMERS_KEY = '__NEXMAP_MEMORY_TRACE_TIMERS__';
const MAX_MEMORY_TRACE_ENTRIES = 500;
const TOP_CARD_LIMIT = 8;

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
        // Storage may be blocked in private browsing or embedded contexts.
    }
};

const safeRemoveLocalStorage = (key) => {
    if (!isBrowser) return;
    try {
        window.localStorage?.removeItem?.(key);
    } catch {
        // Storage may be blocked in private browsing or embedded contexts.
    }
};

const isMemoryTraceEnabled = () => (
    safeReadLocalStorage('nexmap_memory_trace') !== 'off'
);

const ensureTraceStore = () => {
    if (!isBrowser) return [];

    if (!Array.isArray(window[MEMORY_TRACE_STORE_KEY])) {
        window[MEMORY_TRACE_STORE_KEY] = [];
    }

    if (!(window[MEMORY_TRACE_TIMERS_KEY] instanceof Map)) {
        window[MEMORY_TRACE_TIMERS_KEY] = new Map();
    }

    if (typeof window.copyMemoryTrace !== 'function') {
        window.copyMemoryTrace = () => JSON.stringify(window[MEMORY_TRACE_STORE_KEY] || [], null, 2);
    }

    if (typeof window.clearMemoryTrace !== 'function') {
        window.clearMemoryTrace = () => {
            window[MEMORY_TRACE_STORE_KEY] = [];
            if (window[MEMORY_TRACE_TIMERS_KEY] instanceof Map) {
                window[MEMORY_TRACE_TIMERS_KEY].clear();
            }
            console.info('[NexMap MemoryTrace] cleared');
        };
    }

    if (typeof window.disableMemoryTrace !== 'function') {
        window.disableMemoryTrace = () => {
            safeWriteLocalStorage('nexmap_memory_trace', 'off');
            console.info('[NexMap MemoryTrace] disabled');
        };
    }

    if (typeof window.enableMemoryTrace !== 'function') {
        window.enableMemoryTrace = () => {
            safeRemoveLocalStorage('nexmap_memory_trace');
            console.info('[NexMap MemoryTrace] enabled');
        };
    }

    return window[MEMORY_TRACE_STORE_KEY];
};

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

const countImageParts = (messages = []) => (
    messages.reduce((total, message) => {
        const content = message?.content;
        if (!Array.isArray(content)) return total;
        return total + content.filter((part) => part?.type === 'image' || part?.type === 'image_url').length;
    }, 0)
);

const pushTopCard = (topCards, card, estimatedChars) => {
    topCards.push({
        id: card?.id || '',
        type: card?.type || 'card',
        title: String(card?.summary?.title || card?.data?.title || '').slice(0, 80),
        estimatedChars,
        messageCount: Array.isArray(card?.data?.messages) ? card.data.messages.length : 0,
        hydrated: card?.data?.runtimeBodyState?.hydrated ?? null,
        deleted: Boolean(card?.deletedAt)
    });
    topCards.sort((left, right) => right.estimatedChars - left.estimatedChars);
    if (topCards.length > TOP_CARD_LIMIT) topCards.pop();
};

const summarizeCards = (cards = []) => {
    const summary = {
        total: Array.isArray(cards) ? cards.length : 0,
        active: 0,
        deleted: 0,
        notes: 0,
        runtimeManaged: 0,
        runtimeHydrated: 0,
        runtimeDehydrated: 0,
        cardsWithMessages: 0,
        totalMessages: 0,
        totalImageParts: 0,
        totalEstimatedTextChars: 0,
        largestCards: []
    };

    if (!Array.isArray(cards)) return summary;

    cards.forEach((card) => {
        if (card?.deletedAt) summary.deleted += 1;
        else summary.active += 1;

        if (card?.type === 'note') summary.notes += 1;

        const runtimeState = card?.data?.runtimeBodyState;
        if (runtimeState) {
            summary.runtimeManaged += 1;
            if (runtimeState.hydrated === false) summary.runtimeDehydrated += 1;
            else summary.runtimeHydrated += 1;
        }

        const messages = Array.isArray(card?.data?.messages) ? card.data.messages : [];
        if (messages.length > 0) summary.cardsWithMessages += 1;
        summary.totalMessages += messages.length;
        summary.totalImageParts += countImageParts(messages);

        const estimatedChars = estimateCardTextChars(card);
        summary.totalEstimatedTextChars += estimatedChars;
        pushTopCard(summary.largestCards, card, estimatedChars);
    });

    return summary;
};

const summarizeTemporalStateList = (states = []) => (
    states.slice(-3).map((state, index) => ({
        indexFromTail: states.length - 3 + index,
        cards: Array.isArray(state?.cards) ? state.cards.length : null,
        connections: Array.isArray(state?.connections) ? state.connections.length : null,
        groups: Array.isArray(state?.groups) ? state.groups.length : null,
        boardPrompts: Array.isArray(state?.boardPrompts) ? state.boardPrompts.length : null,
        cardTextChars: Array.isArray(state?.cards)
            ? state.cards.reduce((total, card) => total + estimateCardTextChars(card), 0)
            : null
    }))
);

const readTemporalSnapshot = () => {
    const temporal = isBrowser ? window.useStore?.temporal : null;
    const temporalState = temporal?.getState?.();
    if (!temporalState) {
        return {
            pastStates: null,
            futureStates: null,
            latestPastStates: [],
            latestFutureStates: []
        };
    }

    const pastStates = Array.isArray(temporalState.pastStates) ? temporalState.pastStates : [];
    const futureStates = Array.isArray(temporalState.futureStates) ? temporalState.futureStates : [];
    return {
        pastStates: pastStates.length,
        futureStates: futureStates.length,
        latestPastStates: summarizeTemporalStateList(pastStates),
        latestFutureStates: summarizeTemporalStateList(futureStates)
    };
};

const readStoreSnapshot = () => {
    const state = isBrowser ? window.useStore?.getState?.() : null;
    if (!state) {
        return {
            available: false
        };
    }

    return {
        available: true,
        cards: summarizeCards(state.cards),
        connections: Array.isArray(state.connections) ? state.connections.length : null,
        groups: Array.isArray(state.groups) ? state.groups.length : null,
        boardPrompts: Array.isArray(state.boardPrompts) ? state.boardPrompts.length : null,
        selectedIds: Array.isArray(state.selectedIds) ? state.selectedIds.length : null,
        generatingCardIds: state.generatingCardIds instanceof Set ? state.generatingCardIds.size : null,
        expandedCardId: state.expandedCardId || '',
        isBoardLoading: Boolean(state.isBoardLoading),
        offset: state.offset || null,
        scale: state.scale || null,
        cardIndexMutation: state.cardIndexMutation || null,
        activeBoardPersistence: state.activeBoardPersistence || null
    };
};

const sanitizeMeta = (meta = {}) => {
    if (!meta || typeof meta !== 'object') return {};

    return Object.fromEntries(
        Object.entries(meta).map(([key, value]) => {
            if (value instanceof Set) return [key, { type: 'Set', size: value.size }];
            if (value instanceof Map) return [key, { type: 'Map', size: value.size }];
            if (Array.isArray(value) && value.length > 40) {
                return [key, { type: 'Array', length: value.length, sample: value.slice(0, 8) }];
            }
            return [key, value];
        })
    );
};

const buildEntry = (label, meta = {}) => ({
    label,
    ts: Date.now(),
    tsIso: new Date().toISOString(),
    perfNowMs: toRoundedNumber(typeof performance !== 'undefined' ? performance.now() : 0, 3),
    route: isBrowser ? window.location?.pathname || '' : '',
    visibilityState: isBrowser ? document.visibilityState || '' : '',
    heap: readHeapSnapshot(),
    dom: readDomSnapshot(),
    runtimeBodyCache: getCardBodyRuntimeCacheSnapshot(),
    temporal: readTemporalSnapshot(),
    store: readStoreSnapshot(),
    meta: sanitizeMeta(meta)
});

const writeEntry = (entry) => {
    if (!isBrowser) return entry;
    const entries = ensureTraceStore();
    entries.push(entry);

    if (entries.length > MAX_MEMORY_TRACE_ENTRIES) {
        entries.splice(0, entries.length - MAX_MEMORY_TRACE_ENTRIES);
    }

    return entry;
};

const logEntry = (entry) => {
    if (!isBrowser || !isMemoryTraceEnabled()) return;

    const title = `[NexMap MemoryTrace] ${entry.label}`;
    console.groupCollapsed(title, {
        usedMB: entry.heap.usedJSHeapSizeMB,
        totalMB: entry.heap.totalJSHeapSizeMB,
        cards: entry.store?.cards?.total,
        domNodes: entry.dom.totalNodes
    });
    console.log(entry);
    console.table([{
        label: entry.label,
        usedMB: entry.heap.usedJSHeapSizeMB,
        totalMB: entry.heap.totalJSHeapSizeMB,
        domNodes: entry.dom.totalNodes,
        canvasCards: entry.dom.canvasCards,
        storeCards: entry.store?.cards?.total,
        activeCards: entry.store?.cards?.active,
        runtimeHydrated: entry.store?.cards?.runtimeHydrated,
        runtimeDehydrated: entry.store?.cards?.runtimeDehydrated,
        pastStates: entry.temporal?.pastStates,
        futureStates: entry.temporal?.futureStates,
        cacheEntries: entry.runtimeBodyCache?.entries
    }]);
    console.groupEnd();
};

export const captureMemoryTrace = (label, meta = {}) => {
    if (!isBrowser) return null;

    const entry = writeEntry(buildEntry(label, meta));
    logEntry(entry);
    return entry;
};

export const startMemoryTraceMeasure = (label, meta = {}) => {
    if (!isBrowser) return null;

    ensureTraceStore();
    window[MEMORY_TRACE_TIMERS_KEY].set(label, {
        startedAt: typeof performance !== 'undefined' ? performance.now() : 0,
        meta
    });

    return captureMemoryTrace(`${label}:start`, meta);
};

export const endMemoryTraceMeasure = (label, meta = {}) => {
    if (!isBrowser) return null;

    ensureTraceStore();
    const timer = window[MEMORY_TRACE_TIMERS_KEY].get(label);
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (timer) {
        window[MEMORY_TRACE_TIMERS_KEY].delete(label);
    }

    return captureMemoryTrace(label, {
        ...(timer?.meta || {}),
        durationMs: timer ? toRoundedNumber(now - timer.startedAt, 3) : null,
        ...meta
    });
};
