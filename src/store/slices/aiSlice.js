import { saveImageToIDB, getCurrentBoardId } from '../../services/storage';
import { uuid } from '../../utils/uuid';
import { createPerformanceMonitor } from '../../utils/performanceMonitor';
import { aiManager, PRIORITY } from '../../services/ai/AIManager';
import { getConnectedGraph } from '../../utils/graphUtils';
import favoritesService from '../../services/favoritesService';
import { CreditsExhaustedError } from '../../services/systemCredits/systemCreditsService';
import { AI_MODELS, AI_PROVIDERS } from '../../services/aiConstants';
import translations from '../../contexts/translations';


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
                autoConnections = [], model: requestedModel, providerId: requestedProviderId,
                initialMessages = null // NEW: Allow passing pre-existing messages (for Branch feature)
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

            // If initialMessages provided, use them directly (for Branch feature)
            if (initialMessages && Array.isArray(initialMessages) && initialMessages.length > 0) {
                const newCard = {
                    id: newId, x, y,
                    createdAt: Date.now(),
                    data: {
                        title: text.length > 20 ? text.substring(0, 20) + '...' : (text || 'New Card'),
                        messages: initialMessages,
                        model,
                        providerId
                    }
                };

                set(state => ({
                    cards: [...state.cards, newCard],
                    connections: [...state.connections, ...autoConnections]
                    // NOTE: Do NOT add to generatingCardIds since we're not generating
                }));

                return newId;
            }

            // Original logic for creating new AI cards
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
                        { id: uuid(), role: 'assistant', content: '' }
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
            const { setCardGenerating, updateCardContent, updateCardFull, cards, connections } = get();
            setCardGenerating(cardId, true);

            try {
                // Context Walking
                const visited = getConnectedGraph(cardId, connections || []);
                const neighborIds = Array.from(visited).filter(id => id !== cardId);

                // Context Walking: Add neighbor context if any
                // FIXED: Limit to 30 cards to prevent token explosion while keeping strong context.
                const MAX_CONTEXT_CARDS = 30;
                const limitedNeighborIds = neighborIds.slice(0, MAX_CONTEXT_CARDS);

                if (neighborIds.length > MAX_CONTEXT_CARDS) {
                    console.warn(`[AI] Context truncated: ${neighborIds.length} connected cards found, using first ${MAX_CONTEXT_CARDS}.`);
                }

                const contextMessages = [];
                if (limitedNeighborIds.length > 0) {
                    const neighbors = cards.filter(c => limitedNeighborIds.indexOf(c.id) !== -1);
                    const contextText = neighbors.map(c =>
                        `Context from linked card "${c.data.title}": \n${c.data.messages.map(m => {
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

                // FIXED: Use current active role model from settings, not card's saved model
                // This allows model switching to take effect immediately for existing cards
                // Card's saved model is kept as a reference but not used for API calls
                const currentRoleModel = freshState.getRoleModel('chat');
                const model = currentRoleModel; // Use current settings
                const providerId = freshState.activeId; // Use current active provider

                console.log(`[handleChatGenerate] Card: ${cardId}, Using model: ${model}, Provider: ${providerId}, Card's saved model: ${card?.data?.model}`);

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

                // If using system credits, FORCE the correct model/config
                // Note: Display shows FREE_TIER (Kimi-K2-Thinking), backend actually uses this model
                let config;
                if (state.isSystemCreditsUser) {
                    config = {
                        apiKey: AI_PROVIDERS.SYSTEM_CREDITS,
                        model: AI_MODELS.FREE_TIER, // Use FREE_TIER (Kimi-K2-Thinking)
                        id: AI_PROVIDERS.SYSTEM_CREDITS,
                        protocol: AI_PROVIDERS.SYSTEM_CREDITS // Special protocol handled by ModelFactory
                    };
                    // Ensure the card data reflects the actual model used
                    if (card.data.model !== AI_MODELS.FREE_TIER) {
                        console.log('[AI] Correcting card model to Kimi-K2-Thinking (System Credits)');
                        // We don't await this state update, it just fixes the UI for next time
                        updateCardFull(cardId, c => ({ ...c, model: AI_MODELS.FREE_TIER }));
                    }
                } else {
                    // FIXED: Always use active provider config
                    config = state.getActiveConfig();
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

                        // Find the assistant message ID to ensure isolated buffering
                        const freshCard = get().cards.find(c => c.id === cardId);
                        const assistantMsg = freshCard?.data?.messages?.slice().reverse().find(m => m.role === 'assistant');
                        onToken(chunk, assistantMsg?.id);
                    }
                });

                perfMonitor.onComplete();
            } catch (e) {
                console.error(`Generation failed for card ${cardId}`, e);

                // Localization logic
                const lang = localStorage.getItem('userLanguage') || 'en';
                const t = translations[lang] || translations['en'];
                const notifications = t.ai?.notifications;

                // Special handling for credits exhausted
                if (e instanceof CreditsExhaustedError || e.name === 'CreditsExhaustedError') {
                    const info = notifications?.creditsExhausted || {
                        title: "⚠️ Free Credits Exhausted",
                        message: "You have used your 100 free credits.",
                        action: "👉 Click settings button to add API Key."
                    };
                    updateCardContent(cardId, `\n\n**${info.title}**\n\n${info.message}\n\n${info.action}`);
                    // Reload credits state
                    get().loadSystemCredits?.();
                } else {
                    // Provide user-friendly error messages based on error type
                    const errorMsg = e.message || 'Generation failed';
                    let userMessage;

                    if (errorMsg.toLowerCase().includes('upstream') ||
                        errorMsg.toLowerCase().includes('unavailable') ||
                        errorMsg.toLowerCase().includes('service')) {
                        // Service unavailable
                        const info = notifications?.serviceUnavailable;
                        userMessage = `\n\n**${info?.title || "⚠️ AI Service Unavailable"}**\n\n` +
                            `${info?.message}\n` +
                            `${info?.englishMessage ? info.englishMessage + '\n\n' : ''}` +
                            `${info?.action}`;
                    } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
                        // Rate limited
                        const info = notifications?.rateLimit;
                        userMessage = `\n\n**${info?.title || "⚠️ Rate Limited"}**\n\n` +
                            `${info?.message}\n` +
                            `${info?.englishMessage || ''}`;
                    } else if (errorMsg.includes('timeout')) {
                        // Timeout
                        const info = notifications?.timeout;
                        userMessage = `\n\n**${info?.title || "⚠️ Request Timeout"}**\n\n` +
                            `${info?.message}\n` +
                            `${info?.englishMessage || ''}`;
                    } else {
                        // Generic error
                        const info = notifications?.genericError;
                        userMessage = `\n\n**${info?.title || "⚠️ Generation Failed"}**\n\n` +
                            `${errorMsg}\n\n` +
                            `${info?.action}`;
                    }

                    updateCardContent(cardId, userMessage);
                }
            } finally {
                setCardGenerating(cardId, false);
            }
        },

        updateCardContent: (id, chunk, messageId = null) => {
            const state = get();
            const bufferKey = messageId ? `${id}:${messageId}` : id;
            const currentBuffer = contentBuffer.get(bufferKey) || "";
            contentBuffer.set(bufferKey, currentBuffer + chunk);

            const flush = () => {
                if (contentBuffer.size === 0) return;
                const updates = new Map(contentBuffer);
                contentBuffer.clear();
                if (contentFlushTimer) {
                    clearTimeout(contentFlushTimer);
                    contentFlushTimer = null;
                }

                set(state => ({
                    cards: state.cards.map(c => {
                        const directUpdate = updates.get(c.id);
                        const idUpdates = [];
                        updates.forEach((content, key) => {
                            if (key.startsWith(c.id + ':')) {
                                const msgId = key.split(':')[1];
                                idUpdates.push({ msgId, content });
                            }
                        });

                        if (!directUpdate && idUpdates.length === 0) return c;
                        const msgs = [...c.data.messages];

                        idUpdates.forEach(({ msgId, content }) => {
                            const msgIndex = msgs.findIndex(m => m.id === msgId);
                            if (msgIndex !== -1) {
                                msgs[msgIndex] = {
                                    ...msgs[msgIndex],
                                    content: msgs[msgIndex].content + content
                                };
                            }
                        });

                        if (directUpdate && idUpdates.length === 0) {
                            const lastMsg = msgs[msgs.length - 1];
                            if (!lastMsg || lastMsg.role !== 'assistant') {
                                msgs.push({ id: uuid(), role: 'assistant', content: directUpdate });
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
            };

            // Schedule flush
            if (!contentFlushTimer) {
                contentFlushTimer = setTimeout(flush, 20);
            }

            // Expose flush globally to slice
            state._flushAIContent = flush;
        },

        setCardGenerating: (id, isGenerating) => {
            set(state => {
                const next = new Set(state.generatingCardIds);
                if (isGenerating) {
                    next.add(id);
                } else {
                    next.delete(id);
                    // CRITICAL: Final Flush before stopping tracking
                    if (state._flushAIContent) {
                        state._flushAIContent();
                    }
                    // Clean up any remaining residue for this card
                    contentBuffer.forEach((_, key) => {
                        if (key === id || key.startsWith(id + ':')) {
                            contentBuffer.delete(key);
                        }
                    });
                }
                return { generatingCardIds: next };
            });
        },

        handleRegenerate: async () => {
            const { cards, selectedIds, updateCardContent, setCardGenerating, handleChatGenerate, getActiveConfig, activeProviderId, isSystemCreditsUser } = get();
            // Filter out cards that don't have messages (like sticky notes)
            const targets = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));
            if (targets.length === 0) return;

            // Get current active config to use for regeneration
            let currentModel, currentProviderId;

            if (isSystemCreditsUser) {
                // Force Kimi-K2-Thinking for system credits user
                currentModel = AI_MODELS.FREE_TIER;
                currentProviderId = AI_PROVIDERS.SYSTEM_CREDITS;
            } else {
                const activeConfig = getActiveConfig();
                currentModel = activeConfig?.model;
                currentProviderId = activeProviderId;
            }

            // Reset assistant messages first AND update to current model
            set(state => ({
                cards: state.cards.map(c => {
                    if (selectedIds.indexOf(c.id) !== -1) {
                        const newMsgs = [...(c.data.messages || [])];
                        const assistantId = uuid();
                        if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
                            newMsgs.pop();
                        }
                        newMsgs.push({ id: assistantId, role: 'assistant', content: '' });
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
                    // BUG FIX: 必须从freshCard获取更新后的messages，而不是targets中的旧数据
                    const freshCard = get().cards.find(c => c.id === card.id);
                    if (!freshCard) return;

                    const currentMsgs = [...(freshCard.data.messages || [])];
                    const assistantMsg = currentMsgs.slice().reverse().find(m => m.role === 'assistant');
                    const messageId = assistantMsg?.id;

                    // handleChatGenerate handles config resolution and AIManager enqueuing
                    return handleChatGenerate(card.id, currentMsgs, (chunk, msgId) => updateCardContent(card.id, chunk, msgId || messageId));
                }));
            } catch (e) {
                console.error("Regeneration failed", e);
            }
        },
    };
};
