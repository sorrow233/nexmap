import { saveImageToIDB, getCurrentBoardId } from '../../services/storage';
import { uuid } from '../../utils/uuid';
import { createPerformanceMonitor } from '../../utils/performanceMonitor';
import { aiManager, PRIORITY } from '../../services/ai/AIManager';
import { getConnectedGraph } from '../../utils/graphUtils';
import favoritesService from '../../services/favoritesService';
import { CreditsExhaustedError } from '../../services/systemCredits/systemCreditsService';
import { AI_MODELS, AI_PROVIDERS } from '../../services/aiConstants';


export const createAISlice = (set, get) => {
    // Throttling buffer for AI streaming
    const contentBuffer = new Map();
    let contentFlushTimer = null;

    return {
        generatingCardIds: new Set(),

        // Persistent message queue: { cardId: [{ text, images }] }
        // Survives ChatModal close, allowing messages to be sent after current stream completes
        pendingMessages: {},

        setGeneratingCardIds: (valOrUpdater) => set((state) => ({
            generatingCardIds: typeof valOrUpdater === 'function' ? valOrUpdater(state.generatingCardIds) : valOrUpdater
        })),

        // Add a message to the pending queue for a card
        addPendingMessage: (cardId, text, images = []) => set((state) => ({
            pendingMessages: {
                ...state.pendingMessages,
                [cardId]: [...(state.pendingMessages[cardId] || []), { text, images }]
            }
        })),

        // Get and remove the next pending message for a card
        popPendingMessage: (cardId) => {
            const state = get();
            const queue = state.pendingMessages[cardId] || [];
            if (queue.length === 0) return null;

            const [next, ...rest] = queue;
            set({
                pendingMessages: {
                    ...state.pendingMessages,
                    [cardId]: rest
                }
            });
            return next;
        },

        // Clear all pending messages for a card (e.g., when user clicks Stop)
        clearPendingMessages: (cardId) => set((state) => ({
            pendingMessages: {
                ...state.pendingMessages,
                [cardId]: []
            }
        })),

        // Get pending message count for a card
        getPendingCount: (cardId) => {
            const state = get();
            return (state.pendingMessages[cardId] || []).length;
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
                autoConnections = [], model: requestedModel, providerId: requestedProviderId
            } = params;

            const state = get();

            // Force DeepSeek for system credits
            let model = requestedModel;
            let providerId = requestedProviderId;

            if (state.isSystemCreditsUser) {
                model = AI_MODELS.FREE_TIER;
                providerId = AI_PROVIDERS.SYSTEM_CREDITS;
            }

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
                createdAt: Date.now(),
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

            // Removed: position-based auto-add to zone
            // Cards now only join zones via connections

            return newId;
        },

        handleChatGenerate: async (cardId, messages, onToken) => {
            const { setCardGenerating, updateCardContent, cards, connections } = get();
            setCardGenerating(cardId, true);

            try {
                // Context Walking
                const visited = getConnectedGraph(cardId, connections || []);
                const neighborIds = Array.from(visited).filter(id => id !== cardId);

                // Context Walking: Add neighbor context if any
                const contextMessages = [];
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

                // Messages are now [contextMessages, ...messages]
                // Time injection will be handled by AIManager globally
                const fullMessages = [...contextMessages, ...messages];

                // Re-fetch card from FRESH state to get updated model/providerId
                // This is critical for handleRegenerate which updates these before calling us
                const freshState = get();
                const card = freshState.cards.find(c => c.id === cardId);
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

                // If using system credits (DeepSeek V3), FORCE the correct model/config
                let config;
                if (state.isSystemCreditsUser) {
                    config = {
                        apiKey: AI_PROVIDERS.SYSTEM_CREDITS,
                        model: AI_MODELS.SYSTEM_CREDITS, // FORCE correct model
                        id: AI_PROVIDERS.SYSTEM_CREDITS,
                        protocol: AI_PROVIDERS.SYSTEM_CREDITS // Special protocol handled by ModelFactory
                    };
                    // Ensure the card data reflects the actual model used
                    if (card.data.model !== AI_MODELS.SYSTEM_CREDITS) {
                        console.log('[AI] Correcting card model to DeepSeek V3 (System Credits)');
                        // We don't await this state update, it just fixes the UI for next time
                        updateCardFull(cardId, c => ({ ...c, model: AI_MODELS.SYSTEM_CREDITS }));
                    }
                } else if (providerId && state.providers && state.providers[providerId]) {
                    config = state.providers[providerId];
                } else {
                    config = state.getActiveConfig();
                    // Warn if card had a provider that no longer exists
                    if (providerId && (!state.providers || !state.providers[providerId])) {
                        console.warn(`[AI] Card ${cardId} references deleted provider ${providerId}, using active config instead`);
                    }
                }

                // Use AIManager for centralized scheduling and cancellation
                // AWAIT the promise returned by requestTask!
                await aiManager.requestTask({
                    type: 'chat',
                    priority: PRIORITY.CRITICAL, // Chat is high priority
                    payload: {
                        messages: fullMessages,
                        model,
                        temperature: undefined,
                        config, // Pass config explicitly
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

                // Special handling for credits exhausted
                if (e instanceof CreditsExhaustedError || e.name === 'CreditsExhaustedError') {
                    updateCardContent(cardId, `\n\n⚠️ **免费试用积分已用完**\n\n您的100积分免费额度已使用完毕。要继续使用AI功能，请在设置中配置您自己的API Key。\n\n👉 点击右上角设置按钮，添加您的GMI API Key。`);
                    // Reload credits state
                    get().loadSystemCredits?.();
                } else {
                    // Append error message to the card content so user sees it
                    updateCardContent(cardId, `\n\n[System Error: ${e.message || 'Generation failed'}]`);
                }
            } finally {
                setCardGenerating(cardId, false);
            }
        },

        updateCardContent: (id, chunk, messageIndex = null) => {
            // Use composite key when messageIndex is provided for precise targeting
            const bufferKey = messageIndex !== null ? `${id}:${messageIndex}` : id;

            // 1. Buffer the content
            const currentBuffer = contentBuffer.get(bufferKey) || "";
            contentBuffer.set(bufferKey, currentBuffer + chunk);

            // 2. Schedule flush if not already scheduled
            if (!contentFlushTimer) {
                contentFlushTimer = setTimeout(() => {
                    try {
                        // Snapshot and clear buffer immediately
                        const updates = new Map(contentBuffer);
                        contentBuffer.clear();
                        contentFlushTimer = null;

                        // 3. Batch update
                        set(state => ({
                            cards: state.cards.map(c => {
                                // Check for both cardId only and cardId:index patterns
                                const directUpdate = updates.get(c.id);
                                const indexedUpdates = [];
                                updates.forEach((content, key) => {
                                    if (key.startsWith(c.id + ':')) {
                                        const idx = parseInt(key.split(':')[1], 10);
                                        indexedUpdates.push({ index: idx, content });
                                    }
                                });

                                if (!directUpdate && indexedUpdates.length === 0) return c;

                                const msgs = [...c.data.messages];

                                // Handle indexed updates first (precise targeting)
                                indexedUpdates.forEach(({ index, content }) => {
                                    if (msgs[index] && msgs[index].role === 'assistant') {
                                        msgs[index] = {
                                            ...msgs[index],
                                            content: msgs[index].content + content
                                        };
                                    }
                                });

                                // Handle direct/legacy update (last assistant message)
                                if (directUpdate) {
                                    const lastMsg = msgs[msgs.length - 1];
                                    if (!lastMsg || lastMsg.role !== 'assistant') {
                                        msgs.push({ role: 'assistant', content: directUpdate });
                                    } else {
                                        msgs[msgs.length - 1] = {
                                            ...lastMsg,
                                            content: lastMsg.content + directUpdate
                                        };
                                    }
                                }

                                return { ...c, data: { ...c.data, messages: msgs } };
                            })
                        }));
                    } catch (e) {
                        console.error("[ContentSlice] Batched update failed", e);
                    }
                }, 20); // 20ms throttle for high-frequency fluid updates
            }
        },

        setCardGenerating: (id, isGenerating) => {
            set(state => {
                const next = new Set(state.generatingCardIds);
                if (isGenerating) next.add(id);
                else {
                    next.delete(id);
                    // Clean up buffer when generation stops (success or failure)
                    contentBuffer.delete(id);
                }
                return { generatingCardIds: next };
            });
        },

        handleRegenerate: async () => {
            const { cards, selectedIds, updateCardContent, setCardGenerating, handleChatGenerate, getActiveConfig, activeProviderId } = get();
            // Filter out cards that don't have messages (like sticky notes)
            const targets = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));
            if (targets.length === 0) return;

            // Get current active config to use for regeneration
            const activeConfig = getActiveConfig();
            const currentModel = activeConfig?.model;
            const currentProviderId = activeProviderId;

            // Reset assistant messages first AND update to current model
            set(state => ({
                cards: state.cards.map(c => {
                    if (selectedIds.indexOf(c.id) !== -1) {
                        const newMsgs = [...(c.data.messages || [])];
                        if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
                            newMsgs.pop();
                        }
                        newMsgs.push({ role: 'assistant', content: '' });
                        // Update card to use current active model and provider
                        return {
                            ...c,
                            data: {
                                ...c.data,
                                messages: newMsgs,
                                model: currentModel,       // Use current active model
                                providerId: currentProviderId  // Use current active provider
                            }
                        };
                    }
                    return c;
                }),
                // Create new Set properly: spread existing Set, then add each selectedId
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
    };
};
