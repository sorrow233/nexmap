import { isPersistenceTraceConsoleEnabled } from './runtimeLogging';

const TRACE_WINDOW_KEY = '__NEXMAP_PERSISTENCE_TRACE__';
const TRACE_STORAGE_KEY = 'nexmap_persistence_trace_buffer';
const MAX_TRACE_ENTRIES = 120;
const MAX_CARD_MESSAGE_STATS = 12;

const toSafeNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const sanitizeValue = (value, depth = 0) => {
    if (depth > 3) return '[depth_limit]';
    if (value === null || value === undefined) return value;
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message
        };
    }
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nested]) => [key, sanitizeValue(nested, depth + 1)])
        );
    }
    return String(value);
};

const getTraceStore = () => {
    if (typeof window === 'undefined') return null;

    if (!Array.isArray(window[TRACE_WINDOW_KEY])) {
        try {
            const raw = window.sessionStorage.getItem(TRACE_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            window[TRACE_WINDOW_KEY] = Array.isArray(parsed) ? parsed : [];
        } catch {
            window[TRACE_WINDOW_KEY] = [];
        }
    }

    if (typeof window.copyPersistenceTrace !== 'function') {
        window.copyPersistenceTrace = () => JSON.stringify(window[TRACE_WINDOW_KEY] || [], null, 2);
    }

    if (typeof window.clearPersistenceTrace !== 'function') {
        window.clearPersistenceTrace = () => {
            window[TRACE_WINDOW_KEY] = [];
            try {
                window.sessionStorage.removeItem(TRACE_STORAGE_KEY);
            } catch {
                // Ignore trace cleanup failures.
            }
        };
    }

    return window[TRACE_WINDOW_KEY];
};

export const buildBoardCursorTrace = (snapshot = {}) => {
    const cards = Array.isArray(snapshot?.cards) ? snapshot.cards : [];
    const cardMessageStats = cards.slice(0, MAX_CARD_MESSAGE_STATS).map((card) => {
        const messages = Array.isArray(card?.data?.messages) ? card.data.messages : [];
        const userMessages = messages.filter((message) => message?.role === 'user').length;
        const assistantMessages = messages.filter((message) => message?.role === 'assistant').length;

        return {
            cardId: card?.id || '',
            type: card?.type || 'chat',
            messages: messages.length,
            userMessages,
            assistantMessages
        };
    });

    return {
        clientRevision: toSafeNumber(snapshot?.clientRevision),
        mutationSequence: toSafeNumber(snapshot?.mutationSequence),
        updatedAt: toSafeNumber(snapshot?.updatedAt),
        syncVersion: toSafeNumber(snapshot?.syncVersion),
        dirty: snapshot?.dirty === true,
        cards: cards.length,
        connections: Array.isArray(snapshot?.connections) ? snapshot.connections.length : 0,
        groups: Array.isArray(snapshot?.groups) ? snapshot.groups.length : 0,
        totalMessages: cardMessageStats.reduce((sum, card) => sum + card.messages, 0),
        cardMessageStats
    };
};

export const logPersistenceTrace = (event, details = {}) => {
    const entry = {
        timestamp: new Date().toISOString(),
        event,
        details: sanitizeValue(details)
    };

    const traceStore = getTraceStore();
    if (traceStore) {
        traceStore.push(entry);
        if (traceStore.length > MAX_TRACE_ENTRIES) {
            traceStore.splice(0, traceStore.length - MAX_TRACE_ENTRIES);
        }
        try {
            window.sessionStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(traceStore));
        } catch {
            // Ignore trace persistence failures; console log still works.
        }
    }

    if (isPersistenceTraceConsoleEnabled()) {
        console.log(`[PersistenceTrace] ${entry.timestamp} ${event} ${JSON.stringify(entry.details)}`);
    }
    return entry;
};
