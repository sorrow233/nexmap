import { saveImageToIDB, getCurrentBoardId } from '../../services/storage';
import { uuid } from '../../utils/uuid';
import { createPerformanceMonitor } from '../../utils/performanceMonitor';
import { aiManager, PRIORITY } from '../../services/ai/AIManager';

import favoritesService from '../../services/favoritesService';
import { CreditsExhaustedError } from '../../services/systemCredits/systemCreditsService';
import { AI_MODELS, AI_PROVIDERS } from '../../services/aiConstants';
import { assembleContext } from '../../utils/aiContextUtils';
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
            const { setCardGenerating, updateCardContent, updateCardFull } = get();
            setCardGenerating(cardId, true);

            try {
                // CRITICAL FIX: 在执行 assembleContext 之前获取最新的 cards 和 connections
                // 这确保了并发执行时每张卡片看到的是已更新的state，而不是共享的旧快照
                // 之前的BUG：第186行的解构在Promise.all同时启动多个handleChatGenerate时
                // 会导致所有调用共享同一个cards快照，使得assembleContext返回错误的上下文
                const { cards, connections } = get();

                // Context Walking
                const contextMessages = assembleContext(cardId, connections || [], cards);


                // Filter out error messages that were accidentally saved to history
                // These error messages pollute the context and may cause API issues
                const ERROR_MARKERS = ['⚠️', 'AI服务暂时不可用', 'AI Service', 'Service Unavailable', 'Rate Limited', 'Generation Failed', 'Request Timeout'];
                const cleanMessages = messages.filter(msg => {
                    if (msg.role !== 'assistant') return true;
                    const content = msg.content || '';
                    // Skip empty or error-only messages
                    if (!content.trim()) return false;
                    // Check if message starts with or contains error markers
                    return !ERROR_MARKERS.some(marker => content.includes(marker));
                });

                // Messages are now [contextMessages, ...cleanMessages]
                // Time injection will be handled by AIManager globally
                const fullMessages = [...contextMessages, ...cleanMessages];


                // FIXED: 使用新的 getEffectiveChatConfig 这种隔离机制来获取配置
                // 这确保了画布上的切换只影响对话，不影响全局 activeId (从而保护了功能模型和绘图模型)
                const freshState = get();
                const card = freshState.cards.find(c => c.id === cardId);

                let config;
                if (freshState.isSystemCreditsUser) {
                    config = {
                        apiKey: AI_PROVIDERS.SYSTEM_CREDITS,
                        model: AI_MODELS.FREE_TIER,
                        id: AI_PROVIDERS.SYSTEM_CREDITS,
                        protocol: AI_PROVIDERS.SYSTEM_CREDITS
                    };
                    if (card.data.model !== AI_MODELS.FREE_TIER) {
                        updateCardFull(cardId, c => ({ ...c, model: AI_MODELS.FREE_TIER }));
                    }
                } else {
                    config = freshState.getEffectiveChatConfig();
                }

                const runModel = config.model;
                const runProviderId = config.providerId || config.id;

                console.log(`[AI] Dispatching task: ${cardId}, Model: ${runModel}, Provider: ${runProviderId}`);

                // Create performance monitor
                const perfMonitor = createPerformanceMonitor({
                    cardId,
                    model: runModel,
                    providerId: runProviderId,
                    messages: fullMessages,
                    temperature: undefined,
                    stream: true
                });

                let firstToken = true;
                const resolveLatestAssistantMessageId = () => {
                    const latestCard = get().cards.find(c => c.id === cardId);
                    return latestCard?.data?.messages?.slice().reverse().find(m => m.role === 'assistant')?.id || null;
                };

                // Use AIManager for centralized scheduling and cancellation
                await aiManager.requestTask({
                    type: 'chat',
                    priority: PRIORITY.CRITICAL,
                    payload: {
                        messages: fullMessages,
                        model: runModel,
                        temperature: undefined,
                        config,
                        options: {
                            onResponseMetadata: (metadata = {}) => {
                                const assistantMessageId = resolveLatestAssistantMessageId();
                                if (!assistantMessageId) return;
                                get().setAssistantMessageMeta(cardId, assistantMessageId, {
                                    usedSearch: metadata.usedSearch === true
                                });
                            }
                        }
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

        setAssistantMessageMeta: (cardId, messageId, metaUpdates = {}) => {
            if (!cardId || !messageId || !metaUpdates || typeof metaUpdates !== 'object') return;

            set(state => ({
                cards: state.cards.map(card => {
                    if (card.id !== cardId) return card;
                    const messages = [...(card.data.messages || [])];
                    const targetIndex = messages.findIndex(msg => msg.id === messageId);
                    if (targetIndex === -1) return card;

                    const targetMsg = messages[targetIndex];
                    messages[targetIndex] = {
                        ...targetMsg,
                        meta: {
                            ...(targetMsg.meta || {}),
                            ...metaUpdates
                        }
                    };

                    return {
                        ...card,
                        data: { ...card.data, messages }
                    };
                })
            }));
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
            const { cards, selectedIds, updateCardContent, setCardGenerating, handleChatGenerate, activeProviderId, isSystemCreditsUser } = get();
            // Filter out cards that don't have messages (like sticky notes)
            const targets = cards.filter(c => selectedIds.indexOf(c.id) !== -1 && c.data && Array.isArray(c.data.messages));
            if (targets.length === 0) return;

            // Get current active config to use for regeneration (Respect Session Overrides)
            let currentModel, currentProviderId;

            if (isSystemCreditsUser) {
                currentModel = AI_MODELS.FREE_TIER;
                currentProviderId = AI_PROVIDERS.SYSTEM_CREDITS;
            } else {
                const effectiveConfig = get().getEffectiveChatConfig();
                currentModel = effectiveConfig.model;
                currentProviderId = effectiveConfig.providerId || effectiveConfig.id;
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
                                model: currentModel,
                                providerId: currentProviderId
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
