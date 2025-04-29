// import { streamChatCompletion } from '../../services/llm'; // Removed - uses AIManager
import { saveImageToIDB, getCurrentBoardId } from '../../services/storage';
import favoritesService from '../../services/favoritesService';
import { calculateLayout, calculateGridLayout } from '../../utils/autoLayout';
import { getConnectedGraph } from '../../utils/graphUtils';
import { uuid } from '../../utils/uuid';
import { createPerformanceMonitor } from '../../utils/performanceMonitor';
import { aiManager, PRIORITY } from '../../services/ai/AIManager';

export const createContentSlice = (set, get) => {
    // Throttling buffer for AI streaming
    const contentBuffer = new Map();
    let contentFlushTimer = null;

    return {
        cards: [],
        connections: [],
        groups: [], // NEW: Groups/Zones state
        generatingCardIds: new Set(),
        generatingCardIds: new Set(),
        expandedCardId: null,

        setCards: (cardsOrUpdater) => set((state) => ({
            cards: typeof cardsOrUpdater === 'function' ? cardsOrUpdater(state.cards) : cardsOrUpdater
        })),
        setConnections: (connectionsOrUpdater) => set((state) => ({
            connections: typeof connectionsOrUpdater === 'function' ? connectionsOrUpdater(state.connections) : connectionsOrUpdater
        })),
        setGroups: (valOrUpdater) => set((state) => ({
            groups: typeof valOrUpdater === 'function' ? valOrUpdater(state.groups) : valOrUpdater
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
            const { cards, connections, groups } = get();

            // 1. If Groups Exist: Respect them, Grid the rest
            if (groups && groups.length > 0) {
                // Identify gathered cards
                const groupedCardIds = new Set();
                groups.forEach(g => {
                    if (g.cardIds) g.cardIds.forEach(id => groupedCardIds.add(id));
                });

                const looseCards = cards.filter(c => !groupedCardIds.has(c.id));
                if (looseCards.length === 0) return;

                // Find safe bounds (to the right of everything)
                let maxX = -Infinity;
                let minY = Infinity;

                cards.forEach(c => {
                    if (c.x > maxX) maxX = c.x;
                    // track min Y to align broadly with top
                    if (c.y < minY) minY = c.y;
                });

                if (!Number.isFinite(maxX)) maxX = 0;
                if (!Number.isFinite(minY)) minY = 0;

                const safeX = maxX + 400; // Gap
                const safeY = minY;

                const newPositions = calculateGridLayout(looseCards, safeX, safeY);

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
                return;
            }

            // 2. No Groups: Smart Choice
            if (connections.length > 0) {
                // Existing Mind Map Logic
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
            } else {
                // Grid Layout (Start at top-left of current view? Or average position?)
                // Let's find top-left of all cards to anchor
                let minX = Infinity;
                let minY = Infinity;
                cards.forEach(c => {
                    if (c.x < minX) minX = c.x;
                    if (c.y < minY) minY = c.y;
                });

                if (!Number.isFinite(minX)) { minX = 0; minY = 0; }

                const newPositions = calculateGridLayout(cards, minX, minY);
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
            }
        },

        arrangeSelectionGrid: () => {
            const { cards, selectedIds } = get();
            if (!selectedIds || selectedIds.length === 0) return;

            const selectedCards = cards.filter(c => selectedIds.includes(c.id));
            if (selectedCards.length === 0) return;

            // Calculate bounding box start (top-left) to anchor the grid
            let minX = Infinity;
            let minY = Infinity;

            selectedCards.forEach(c => {
                if (c.x < minX) minX = c.x;
                if (c.y < minY) minY = c.y;
            });

            // const { calculateGridLayout } = require('../../utils/autoLayout'); // Already imported
            const newPositions = calculateGridLayout(selectedCards, minX, minY);

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
            if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
                console.warn("Invalid move delta detected", dx, dy);
                return;
            }

            // Determine which cards initiated the move
            const isSelected = selectedIds.indexOf(id) !== -1;
            const sourceIds = isSelected ? selectedIds : [id];

            // Resolve ALL connected components for the source cards
            const moveIds = new Set();
            sourceIds.forEach(sourceId => {
                const connectedParams = getConnectedGraph(sourceId, connections);
                connectedParams.forEach(cid => moveIds.add(cid));
            });

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

        // --- Group Actions ---
        createGroup: (cardIds, title = 'New Zone') => set(state => {
            const newGroup = {
                id: uuid(),
                title,
                cardIds,
                color: 'blue' // Default color
            };
            return {
                groups: [...state.groups, newGroup],
                selectedIds: [] // Deselect cards after grouping
            };
        }),

        updateGroup: (id, updater) => set(state => ({
            groups: state.groups.map(g => g.id === id ? { ...g, ...updater } : g)
        })),

        deleteGroup: (id) => set(state => ({
            groups: state.groups.filter(g => g.id !== id)
        })),

        // Helper to get connected network (moved from handleCardMove to be exposed)
        getConnectedCards: (startId) => {
            const { connections } = get();
            return Array.from(getConnectedGraph(startId, connections));
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
                cards: state.cards.filter(c => selectedIds.indexOf(c.id) === -1),
                connections: state.connections.filter(conn =>
                    selectedIds.indexOf(conn.from) === -1 && selectedIds.indexOf(conn.to) === -1
                ),
                // Clean up groups that might lose all their cards? 
                // Currently we keep empty groups or groups with missing cards, 
                // but let's filter cardIds inside groups to keep it clean.
                groups: state.groups.map(g => ({
                    ...g,
                    cardIds: g.cardIds.filter(id => selectedIds.indexOf(id) === -1)
                })).filter(g => g.cardIds.length > 0), // Remove empty groups
                selectedIds: [],
                expandedCardId: selectedIds.indexOf(state.expandedCardId) !== -1 ? null : state.expandedCardId
            }));
        },

        handleRegenerate: async () => {
            const { cards, selectedIds, updateCardContent, setCardGenerating, handleChatGenerate } = get();
            // Filter out cards that don't have messages (like sticky notes)
            const targets = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));
            if (targets.length === 0) return;

            // Reset assistant messages first
            set(state => ({
                cards: state.cards.map(c => {
                    if (selectedIds.indexOf(c.id) !== -1) {
                        const newMsgs = [...(c.data.messages || [])];
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

            // Use handleChatGenerate which now uses AIManager
            try {
                await Promise.all(targets.map(async (card) => {
                    const currentMsgs = [...(card.data.messages || [])];
                    if (currentMsgs.length > 0 && currentMsgs[currentMsgs.length - 1].role === 'assistant') {
                        currentMsgs.pop();
                    }

                    // handleChatGenerate handles config resolution and AIManager enqueuing
                    return handleChatGenerate(card.id, currentMsgs, (chunk) => updateCardContent(card.id, chunk));
                }));
            } catch (e) {
                console.error("Regeneration failed", e);
            }
        },

        toggleFavorite: (cardId, messageIndex, messageContent) => {
            const { cards } = get();
            const card = cards.find(c => c.id === cardId);
            if (!card) return;

            const boardId = getCurrentBoardId();
            const boardTitle = document.title.split('|')[0].trim() || 'Untitled Board';
            favoritesService.toggleFavorite(card, boardId, boardTitle, messageIndex, messageContent);

            // Force re-render if using a selector that depends on favorites-updated event
            set({ favoritesLastUpdate: Date.now() });
        },

        // --- Atomic AI Actions ---
        createAICard: async (params) => {
            const {
                id, text, x, y, images = [], contextPrefix = "",
                autoConnections = [], model, providerId
            } = params;

            const newId = id || uuid();

            let content = text;
            if (images.length > 0) {
                // Process images to IDB
                const processedImages = await Promise.all(images.map(async (img, idx) => {
                    const imageId = `${newId}_img_${uuid()}_${idx}`;
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
            const { setCardGenerating, updateCardContent, cards, connections } = get();
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

                // Create performance monitor
                const perfMonitor = createPerformanceMonitor({
                    cardId,
                    model,
                    providerId,
                    messages: fullMessages,
                    temperature: undefined,
                    stream: true
                });

                let firstToken = true;

                // Resolve config
                const state = get();
                // If card has a providerId, use it, otherwise use active config
                const config = providerId && state.providers[providerId] ? state.providers[providerId] : state.getActiveConfig();

                // Use AIManager for centralized scheduling and cancellation
                // AWAIT the promise returned by requestTask!
                await aiManager.requestTask({
                    type: 'chat',
                    priority: PRIORITY.CRITICAL, // Chat is high priority
                    payload: {
                        messages: fullMessages,
                        model,
                        temperature: undefined,
                        config // Pass config explicitly
                    },
                    tags: [`card:${cardId}`], // Cancel any previous generation for this card
                    onProgress: (chunk) => {
                        if (firstToken) {
                            perfMonitor.onFirstToken();
                            firstToken = false;
                        }
                        perfMonitor.onChunk(chunk);
                        onToken(chunk);
                    }
                });

                perfMonitor.onComplete();
            } catch (e) {
                console.error(`Generation failed for card ${cardId}`, e);
                // Append error message to the card content so user sees it
                updateCardContent(cardId, `\n\n[System Error: ${e.message || 'Generation failed'}]`);
            } finally {
                setCardGenerating(cardId, false);
            }
        },

        updateCardContent: (id, chunk) => {
            // console.log(`[ContentSlice] Received chunk for ${id}:`, chunk.substring(0, 20));
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

                                // Ensure last message exists and is assistant
                                if (!lastMsg || lastMsg.role !== 'assistant') {
                                    // If for some reason the structure is broken, try to recover
                                    msgs.push({ role: 'assistant', content: newContent });
                                } else {
                                    msgs[msgs.length - 1] = {
                                        ...lastMsg,
                                        content: lastMsg.content + newContent
                                    };
                                }
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
