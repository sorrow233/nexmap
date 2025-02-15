
import { create } from 'zustand';

// --- Canvas Slice ---
const createCanvasSlice = (set, get) => ({
    offset: { x: 0, y: 0 },
    scale: 1,
    selectedIds: [],
    interactionMode: 'none',
    selectionRect: null,

    setOffset: (offset) => set({ offset }),
    setScale: (scale) => set({ scale }),
    setSelectedIds: (selectedIds) => set({ selectedIds }),
    setInteractionMode: (interactionMode) => set({ interactionMode }),
    setSelectionRect: (selectionRect) => set({ selectionRect }),

    moveOffset: (dx, dy) => set((state) => ({
        offset: { x: state.offset.x + dx, y: state.offset.y + dy }
    })),

    // Coordinate conversion helper
    toCanvasCoords: (viewX, viewY) => {
        const { offset, scale } = get();
        return {
            x: (viewX - offset.x) / scale,
            y: (viewY - offset.y) / scale
        };
    }
});

// --- Content Slice ---
const createContentSlice = (set, get) => ({
    cards: [],
    connections: [],
    history: [],
    historyIndex: -1,

    setCards: (cards) => set({ cards }),
    setConnections: (connections) => set({ connections }),

    addCard: (card) => set((state) => ({
        cards: [...state.cards, card]
    })),

    updateCard: (id, updater) => set((state) => ({
        cards: state.cards.map(c => c.id === id ? (typeof updater === 'function' ? updater(c) : { ...c, ...updater }) : c)
    })),

    deleteCard: (id) => set((state) => ({
        cards: state.cards.filter(c => c.id !== id),
        connections: state.connections.filter(conn => conn.from !== id && conn.to !== id)
    })),

    addConnection: (from, to) => set((state) => {
        const exists = state.connections.some(c => (c.from === from && c.to === to) || (c.from === to && c.to === from));
        if (exists) return state;
        return { connections: [...state.connections, { from, to }] };
    }),

    removeConnection: (from, to) => set((state) => ({
        connections: state.connections.filter(c => !(c.from === from && c.to === to) && !(c.from === to && c.to === from))
    })),

    // History Logic
    addToHistory: () => {
        const { cards, connections, history, historyIndex } = get();
        const nextHistory = history.slice(0, historyIndex + 1);
        const newState = { cards: [...cards], connections: [...connections], timestamp: Date.now() };
        const updatedHistory = [...nextHistory, newState].slice(-50);
        set({ history: updatedHistory, historyIndex: updatedHistory.length - 1 });
    },

    undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
            const nextIndex = historyIndex - 1;
            const state = history[nextIndex];
            set({ cards: state.cards, connections: state.connections, historyIndex: nextIndex });
        }
    },

    redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            const state = history[nextIndex];
            set({ cards: state.cards, connections: state.connections, historyIndex: nextIndex });
        }
    }
});

// --- Settings Slice ---
const createSettingsSlice = (set) => ({
    isSettingsOpen: false,
    activeModel: 'gemini-2.0-flash-exp',
    apiConfig: {},

    setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
    setActiveModel: (model) => set({ activeModel: model }),
    setApiConfig: (config) => set({ apiConfig: config })
});

// --- Global Store ---
export const useStore = create((set, get) => ({
    ...createCanvasSlice(set, get),
    ...createContentSlice(set, get),
    ...createSettingsSlice(set, get)
}));
