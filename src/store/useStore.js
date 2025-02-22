
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
    generatingCardIds: new Set(),
    setCards: (cardsOrUpdater) => set((state) => ({
        cards: typeof cardsOrUpdater === 'function' ? cardsOrUpdater(state.cards) : cardsOrUpdater
    })),
    setConnections: (connectionsOrUpdater) => set((state) => ({
        connections: typeof connectionsOrUpdater === 'function' ? connectionsOrUpdater(state.connections) : connectionsOrUpdater
    })),
    setGeneratingCardIds: (ids) => set({ generatingCardIds: ids }),

    addCard: (card) => set((state) => ({
        cards: [...state.cards, card]
    })),

    updateCard: (id, updater) => set((state) => ({
        cards: state.cards.map(c => c.id === id ? (typeof updater === 'function' ? updater(c) : { ...c, ...updater }) : c)
    })),

    deleteCard: (id) => set((state) => {
        const nextGenerating = new Set(state.generatingCardIds);
        nextGenerating.delete(id);
        return {
            cards: state.cards.filter(c => c.id !== id),
            connections: state.connections.filter(conn => conn.from !== id && conn.to !== id),
            generatingCardIds: nextGenerating
        };
    }),

    addConnection: (from, to) => set((state) => {
        const exists = state.connections.some(c => (c.from === from && c.to === to) || (c.from === to && c.to === from));
        if (exists) return state;
        return { connections: [...state.connections, { from, to }] };
    }),

    removeConnection: (from, to) => set((state) => ({
        connections: state.connections.filter(c => !(c.from === from && c.to === to) && !(c.from === to && c.to === from))
    })),

    // History Logic
    addToHistory: (customCards, customConnections) => {
        const { cards, connections, history, historyIndex } = get();
        const nextHistory = history.slice(0, historyIndex + 1);
        const newState = {
            cards: customCards ? [...customCards] : [...cards],
            connections: customConnections ? [...customConnections] : [...connections],
            timestamp: Date.now()
        };
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
    },

    // --- Atomic AI Actions ---
    createAICard: async (params) => {
        const {
            text,
            x,
            y,
            images = [],
            contextPrefix = "",
            autoConnections = [],
            model,
            providerId,
            streamChatCompletion // Passed in to avoid circular dependency if llm.js ever imports store
        } = params;

        const newId = Date.now();

        // 1. Prepare Content
        let content = text;
        if (images.length > 0) {
            content = [
                { type: 'text', text: text },
                ...images.map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mimeType,
                        data: img.base64
                    }
                }))
            ];
        }

        // 2. Initial Card State
        const newCard = {
            id: newId,
            x,
            y,
            data: {
                title: text.length > 20 ? text.substring(0, 20) + '...' : (text || 'New Card'),
                messages: [
                    { role: 'user', content: contextPrefix + (typeof content === 'string' ? content : "") },
                    { role: 'assistant', content: '' }
                ],
                model,
                providerId
            }
        };

        if (Array.isArray(content)) {
            const textPart = content.find(p => p.type === 'text');
            const updatedContent = [...content];
            if (textPart) {
                const idx = updatedContent.indexOf(textPart);
                updatedContent[idx] = { ...textPart, text: contextPrefix + textPart.text };
            } else {
                updatedContent.unshift({ type: 'text', text: contextPrefix });
            }
            newCard.data.messages[0].content = updatedContent;
        }

        // 3. Update State Atomically
        set(state => ({
            cards: [...state.cards, newCard],
            connections: [...state.connections, ...autoConnections],
            generatingCardIds: new Set(state.generatingCardIds).add(newId)
        }));

        // 4. Return ID for streaming follow-up
        return newId;
    },

    updateCardContent: (id, chunk) => {
        set(state => ({
            cards: state.cards.map(c => {
                if (c.id === id) {
                    const msgs = [...c.data.messages];
                    const lastMsg = msgs[msgs.length - 1];
                    msgs[msgs.length - 1] = { ...lastMsg, content: lastMsg.content + chunk };
                    return { ...c, data: { ...c.data, messages: msgs } };
                }
                return c;
            })
        }));
    },

    setCardGenerating: (id, isGenerating) => {
        set(state => {
            const next = new Set(state.generatingCardIds);
            if (isGenerating) next.add(id);
            else next.delete(id);
            return { generatingCardIds: next };
        });
    }
});

// --- Settings Slice ---
const createSettingsSlice = (set) => ({
    isSettingsOpen: false,
    activeModel: 'gemini-2.0-flash-exp',
    apiConfig: {},

    setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
    setActiveModel: (model) => set({ activeModel: model }),
    setApiConfig: (config) => set({ apiConfig: config })
});

// --- Global Store ---
export const useStore = create((set, get) => ({
    ...createCanvasSlice(set, get),
    ...createContentSlice(set, get),
    ...createSettingsSlice(set, get)
}));
