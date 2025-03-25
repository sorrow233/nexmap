

import { create } from 'zustand';
import { temporal } from 'zundo';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { streamChatCompletion } from '../services/llm';
import { saveImageToIDB } from '../services/storage';

// --- Helper: Graph Traversal ---
const getConnectedGraph = (startId, connections, visited = new Set()) => {
    if (visited.has(startId)) return visited;
    visited.add(startId);
    const neighbors = connections
        .filter(c => c.from === startId || c.to === startId)
        .map(c => c.from === startId ? c.to : c.from);
    neighbors.forEach(nid => getConnectedGraph(nid, connections, visited));
    return visited;
};

// --- Canvas Slice ---
const createCanvasSlice = (set, get) => ({
    offset: { x: 0, y: 0 },
    scale: 1,
    selectedIds: [],
    interactionMode: 'none',
    selectionRect: null,
    isConnecting: false,
    connectionStartId: null,

    setOffset: (valOrUpdater) => set((state) => ({
        offset: typeof valOrUpdater === 'function' ? valOrUpdater(state.offset) : valOrUpdater
    })),
    setScale: (valOrUpdater) => set((state) => ({
        scale: typeof valOrUpdater === 'function' ? valOrUpdater(state.scale) : valOrUpdater
    })),
    setSelectedIds: (valOrUpdater) => set((state) => ({
        selectedIds: typeof valOrUpdater === 'function' ? valOrUpdater(state.selectedIds) : valOrUpdater
    })),
    setInteractionMode: (valOrUpdater) => set((state) => ({
        interactionMode: typeof valOrUpdater === 'function' ? valOrUpdater(state.interactionMode) : valOrUpdater
    })),
    setSelectionRect: (valOrUpdater) => set((state) => ({
        selectionRect: typeof valOrUpdater === 'function' ? valOrUpdater(state.selectionRect) : valOrUpdater
    })),
    setIsConnecting: (val) => set({ isConnecting: val }),
    setConnectionStartId: (val) => set({ connectionStartId: val }),

    moveOffset: (dx, dy) => set((state) => ({
        offset: { x: state.offset.x + dx, y: state.offset.y + dy }
    })),

    toCanvasCoords: (viewX, viewY) => {
        const { offset, scale } = get();
        return {
            x: (viewX - offset.x) / scale,
            y: (viewY - offset.y) / scale
        };
    }
});

// --- Content Slice ---
const createContentSlice = (set, get) => {
    // Throttling buffer for AI streaming
    const contentBuffer = new Map();
    let contentFlushTimer = null;

    return {
        cards: [],
        connections: [],
        generatingCardIds: new Set(),
        expandedCardId: null,

        setCards: (cardsOrUpdater) => set((state) => ({
            cards: typeof cardsOrUpdater === 'function' ? cardsOrUpdater(state.cards) : cardsOrUpdater
        })),
        setConnections: (connectionsOrUpdater) => set((state) => ({
            connections: typeof connectionsOrUpdater === 'function' ? connectionsOrUpdater(state.connections) : connectionsOrUpdater
        })),
        setGeneratingCardIds: (valOrUpdater) => set((state) => ({
            generatingCardIds: typeof valOrUpdater === 'function' ? valOrUpdater(state.generatingCardIds) : valOrUpdater
        })),
        setExpandedCardId: (id) => set({ expandedCardId: id }),

        addCard: (card) => set((state) => ({
            cards: [...state.cards, card]
        })),

        updateCard: (id, updater) => set((state) => ({
            cards: state.cards.map(c => c.id === id ? (typeof updater === 'function' ? updater(c.data) : { ...c, data: { ...c.data, ...updater } }) : c)
        })),

        // Special handler for the component refactor
        updateCardFull: (id, updater) => set((state) => ({
            cards: state.cards.map(c => {
                if (c.id !== id) return c;

                // Apply the updater (can be function or object)
                // CRITICAL: When updater is a function, pass c.data (not c) because
                // ChatModal expects to update card.data, not the entire card object
                const updatedData = typeof updater === 'function'
                    ? updater(c.data)  // Pass c.data to function updaters
                    : updater;         // Object updaters are used as-is

                // Preserve all card properties (x, y, id, type, etc.)
                // and only update the data portion
                return {
                    ...c,              // Keep x, y, id, type, etc.
                    data: {            // Only merge data
                        ...(c.data || {}),
                        ...updatedData
                    }
                };
            })
        })),

        arrangeCards: () => {
            const { cards, connections } = get();
            const newPositions = calculateLayout(cards, connections);

            if (newPositions.size === 0) return;

            set(state => ({
                cards: state.cards.map(card => {
                    const newPos = newPositions.get(card.id);
                    if (newPos) {
                        return { ...card, x: newPos.x, y: newPos.y };
                    }
                    return card;
                })
            }));
        },

        deleteCard: (id) => set((state) => {
            const nextGenerating = new Set(state.generatingCardIds);
            nextGenerating.delete(id);
            const nextSelected = state.selectedIds.filter(sid => sid !== id);
            return {
                cards: state.cards.filter(c => c.id !== id),
                connections: state.connections.filter(conn => conn.from !== id && conn.to !== id),
                generatingCardIds: nextGenerating,
                selectedIds: nextSelected,
                expandedCardId: state.expandedCardId === id ? null : state.expandedCardId
            };
        }),

        handleCardMove: (id, newX, newY) => {
            const { cards, connections, selectedIds } = get();
            const sourceCard = cards.find(c => c.id === id);
            if (!sourceCard) return;

            const dx = newX - sourceCard.x;
            const dy = newY - sourceCard.y;
            if (dx === 0 && dy === 0) return;

            const isSelected = selectedIds.indexOf(id) !== -1;
            const moveIds = isSelected ? new Set(selectedIds) : getConnectedGraph(id, connections);

            set(state => ({
                cards: state.cards.map(c => {
                    if (moveIds.has(c.id)) {
                        return { ...c, x: c.x + dx, y: c.y + dy };
                    }
                    return c;
                })
            }));
        },

        // Alias for explicit drag end handling
        handleCardMoveEnd: (id, newX, newY) => {
            get().handleCardMove(id, newX, newY);
        },

        handleConnect: (targetId) => {
            const { isConnecting, connectionStartId, connections } = get();
            if (isConnecting && connectionStartId) {
                if (connectionStartId !== targetId) {
                    const exists = connections.some(c =>
                        (c.from === connectionStartId && c.to === targetId) ||
                        (c.from === targetId && c.to === connectionStartId)
                    );

                    if (!exists) {
                        set(state => ({
                            connections: [...state.connections, { from: connectionStartId, to: targetId }],
                            isConnecting: false,
                            connectionStartId: null
                        }));
                        localStorage.setItem('hasUsedConnections', 'true');
                        return;
                    }
                }
                set({ isConnecting: false, connectionStartId: null });
            } else {
                set({ isConnecting: true, connectionStartId: targetId });
            }
        },

        handleBatchDelete: () => {
            const { selectedIds } = get();
            if (selectedIds.length === 0) return;

            set(state => ({
                cards: state.cards.filter(c => selectedIds.indexOf(c.id) === -1),
                connections: state.connections.filter(conn =>
                    selectedIds.indexOf(conn.from) === -1 && selectedIds.indexOf(conn.to) === -1
                ),
                selectedIds: [],
                expandedCardId: selectedIds.indexOf(state.expandedCardId) !== -1 ? null : state.expandedCardId
            }));
        },

        handleRegenerate: async () => {
            const { cards, selectedIds, updateCardContent, setCardGenerating } = get();
            // Filter out cards that don't have messages (like sticky notes)
            const targets = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));
            if (targets.length === 0) return;

            // Reset assistant messages first
            set(state => ({
                cards: state.cards.map(c => {
                    if (selectedIds.indexOf(c.id) !== -1) {
                        const newMsgs = [...c.data.messages];
                        if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
                            newMsgs.pop();
                        }
                        newMsgs.push({ role: 'assistant', content: '' });
                        return { ...c, data: { ...c.data, messages: newMsgs } };
                    }
                    return c;
                }),
                generatingCardIds: new Set([...state.generatingCardIds, ...selectedIds])
            }));

            try {
                await Promise.all(targets.map(async (card) => {
                    const currentMsgs = [...card.data.messages];
                    if (currentMsgs.length > 0 && currentMsgs[currentMsgs.length - 1].role === 'assistant') {
                        currentMsgs.pop();
                    }

                    // Since we are in the store, we can use the card's protocol/model if available
                    const model = card.data.model;
                    const providerId = card.data.providerId;

                    await streamChatCompletion(
                        currentMsgs,
                        (chunk) => updateCardContent(card.id, chunk),
                        model,
                        { providerId }
                    );
                }));
            } catch (e) {
                console.error("Regeneration failed", e);
            } finally {
                targets.forEach(card => setCardGenerating(card.id, false));
            }
        },

        // --- Atomic AI Actions ---
        createAICard: async (params) => {
            const {
                id, text, x, y, images = [], contextPrefix = "",
                autoConnections = [], model, providerId
            } = params;

            const newId = id || Date.now().toString();

            let content = text;
            if (images.length > 0) {
                // Process images to IDB
                const processedImages = await Promise.all(images.map(async (img, idx) => {
                    const imageId = `${newId}_img_${Date.now()}_${idx}`;
                    // Offload to IDB
                    await saveImageToIDB(imageId, img.base64);
                    return {
                        type: 'image',
                        source: {
                            type: 'idb', // New type
                            id: imageId,
                            media_type: img.mimeType
                        }
                    };
                }));

                content = [
                    { type: 'text', text: text },
                    ...processedImages
                ];
            }

            const newCard = {
                id: newId, x, y,
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

            set(state => ({
                cards: [...state.cards, newCard],
                connections: [...state.connections, ...autoConnections],
                generatingCardIds: new Set(state.generatingCardIds).add(newId)
            }));

            return newId;
        },

        handleChatGenerate: async (cardId, messages, onToken) => {
            const { cards, connections, setCardGenerating } = get();
            setCardGenerating(cardId, true);

            try {
                // Context Walking
                const visited = getConnectedGraph(cardId, connections);
                const neighborIds = Array.from(visited).filter(id => id !== cardId);

                let contextMessages = [];
                if (neighborIds.length > 0) {
                    const neighbors = cards.filter(c => neighborIds.indexOf(c.id) !== -1);
                    const contextText = neighbors.map(c =>
                        `Context from linked card "${c.data.title}": \n${c.data.messages.slice(-3).map(m => {
                            const contentStr = typeof m.content === 'string'
                                ? m.content
                                : (Array.isArray(m.content)
                                    ? m.content.map(p => p.type === 'text' ? p.text : '[Image]').join(' ')
                                    : '');
                            return `${m.role}: ${contentStr}`;
                        }).join('\n')} `
                    ).join('\n\n---\n\n');

                    if (contextText.trim()) {
                        contextMessages.push({ role: 'user', content: `[System Note: This card is connected to others. Here is their recent context:]\n\n${contextText}` });
                    }
                }

                const fullMessages = [...contextMessages, ...messages];
                const card = cards.find(c => c.id === cardId);
                const model = card?.data?.model;
                const providerId = card?.data?.providerId;

                await streamChatCompletion(fullMessages, onToken, model, { providerId });
            } finally {
                setCardGenerating(cardId, false);
            }
        },

        updateCardContent: (id, chunk) => {
            // 1. Buffer the content
            const currentBuffer = contentBuffer.get(id) || "";
            contentBuffer.set(id, currentBuffer + chunk);

            // 2. Schedule flush if not already scheduled
            if (!contentFlushTimer) {
                contentFlushTimer = setTimeout(() => {
                    // Snapshot and clear buffer immediately
                    const updates = new Map(contentBuffer);
                    contentBuffer.clear();
                    contentFlushTimer = null;

                    // 3. Batch update
                    set(state => ({
                        cards: state.cards.map(c => {
                            if (updates.has(c.id)) {
                                const newContent = updates.get(c.id);
                                const msgs = [...c.data.messages];
                                const lastMsg = msgs[msgs.length - 1];
                                msgs[msgs.length - 1] = {
                                    ...lastMsg,
                                    content: lastMsg.content + newContent
                                };
                                return { ...c, data: { ...c.data, messages: msgs } };
                            }
                            return c;
                        })
                    }));
                }, 100); // 100ms throttle = 10fps max updates
            }
        },

        setCardGenerating: (id, isGenerating) => {
            set(state => {
                const next = new Set(state.generatingCardIds);
                if (isGenerating) next.add(id);
                else next.delete(id);
                return { generatingCardIds: next };
            });
        }
    };
};

// --- Settings Slice ---
const createSettingsSlice = (set) => ({
    isSettingsOpen: false,
    activeModel: 'gemini-2.0-flash-exp',
    apiConfig: {},

    setIsSettingsOpen: (val) => set({ isSettingsOpen: typeof val === 'function' ? val() : val }),
    setActiveModel: (val) => set({ activeModel: val }),
    setApiConfig: (val) => set({ apiConfig: val })
});

// --- Share Slice ---
const createShareSlice = (set) => ({
    shareModal: {
        isOpen: false,
        cardContent: null,
        theme: 'business', // 'business' | 'tech'
        showWatermark: true
    },
    openShareModal: (content) => set((state) => ({
        shareModal: { ...state.shareModal, isOpen: true, cardContent: content }
    })),
    closeShareModal: () => set((state) => ({
        shareModal: { ...state.shareModal, isOpen: false, cardContent: null }
    })),
    setShareTheme: (theme) => set((state) => ({
        shareModal: { ...state.shareModal, theme }
    })),
    toggleShareWatermark: () => set((state) => ({
        shareModal: { ...state.shareModal, showWatermark: !state.shareModal.showWatermark }
    }))
});

// --- Global Store with Temporal Middleware ---
import { calculateLayout } from '../utils/autoLayout';

const useStoreBase = create(
    temporal(
        (set, get) => ({
            ...createCanvasSlice(set, get),
            ...createContentSlice(set, get),
            ...createSettingsSlice(set, get),
            ...createShareSlice(set, get)
        }),
        {
            limit: 50,
            equality: (a, b) => a.cards === b.cards && a.connections === b.connections,
            partialize: (state) => ({
                cards: state.cards,
                connections: state.connections
            })
        }
    )
);


export const useStore = useStoreBase;

// Correctly implement useTemporalStore using useStoreWithEqualityFn
export function useTemporalStore(selector, equality) {
    return useStoreWithEqualityFn(useStoreBase.temporal, selector, equality);
}

export const { undo, redo, clear: clearHistory } = useStoreBase.temporal.getState();
