import { getCurrentBoardId } from '../../services/storage';
import { uuid } from '../../utils/uuid';
import { createPerformanceMonitor } from '../../utils/performanceMonitor';
import { aiManager, PRIORITY } from '../../services/ai/AIManager';

import favoritesService from '../../services/favoritesService';
import { CreditsExhaustedError } from '../../services/systemCredits/systemCreditsService';
import { AI_MODELS, AI_PROVIDERS } from '../../services/aiConstants';
import { assembleContext } from '../../utils/aiContextUtils';
import translations from '../../contexts/translations';
import {
    appendStreamBufferUpdates,
    applyStreamTextUpdates,
    buildStreamBufferKey,
    collectStreamBufferUpdateByKey,
    collectStreamBufferUpdatesForCard,
    createStreamRenderBuffer,
    removeStreamBufferUpdateByKey,
    removeStreamBufferUpdatesForCard
} from './utils/streamRenderBuffer';
import { createCardTimestampFields } from '../../services/cards/cardTimestamps';
import {
    createMessageContentWithImages,
    persistCardMessageImagesToIDB
} from '../../services/ai/messageContent';
import { yieldToMainThread } from '../../utils/scheduling';
import { nextCardIndexMutation } from './utils/cardIndexMutation';

const bumpStreamingCardVersions = (currentVersions = {}, dirtyCardIds = new Set()) => {
    if (!(dirtyCardIds instanceof Set) || dirtyCardIds.size === 0) {
        return currentVersions;
    }

    const nextVersions = { ...currentVersions };
    dirtyCardIds.forEach((cardId) => {
        if (!cardId) return;
        nextVersions[cardId] = (nextVersions[cardId] || 0) + 1;
    });
    return nextVersions;
};

const clearStreamingCardVersion = (currentVersions = {}, cardId) => {
    if (!cardId || !Object.prototype.hasOwnProperty.call(currentVersions, cardId)) {
        return currentVersions;
    }

    const nextVersions = { ...currentVersions };
    delete nextVersions[cardId];
    return nextVersions;
};

const incrementGeneratingTaskCount = (currentCounts = {}, cardId) => {
    if (!cardId) return currentCounts;
    return {
        ...currentCounts,
        [cardId]: (currentCounts[cardId] || 0) + 1
    };
};

const decrementGeneratingTaskCount = (currentCounts = {}, cardId) => {
    if (!cardId || !Object.prototype.hasOwnProperty.call(currentCounts, cardId)) {
        return currentCounts;
    }

    const nextCount = Math.max(0, (currentCounts[cardId] || 0) - 1);
    if (nextCount > 0) {
        return {
            ...currentCounts,
            [cardId]: nextCount
        };
    }

    const nextCounts = { ...currentCounts };
    delete nextCounts[cardId];
    return nextCounts;
};

const mergeStreamUpdateMaps = (...maps) => {
    const merged = new Map();

    maps.forEach((map) => {
        if (!(map instanceof Map) || map.size === 0) return;

        map.forEach((content, bufferKey) => {
            if (!content || !bufferKey) return;
            merged.set(bufferKey, `${merged.get(bufferKey) || ''}${content}`);
        });
    });

    return merged;
};


export const createAISlice = (set, get) => {
    const streamRenderBuffer = createStreamRenderBuffer((updates) => {
        if (!updates || updates.size === 0) return;

        set((state) => {
            const { nextBufferState, dirtyCardIds } = appendStreamBufferUpdates(
                state.streamingMessages,
                updates
            );
            if (nextBufferState === state.streamingMessages) return {};

            return {
                streamingMessages: nextBufferState,
                streamingCardVersions: bumpStreamingCardVersions(
                    state.streamingCardVersions,
                    dirtyCardIds
                )
            };
        });
    });

    return {
        generatingCardIds: new Set(),
        generatingCardTaskCounts: {},
        streamingMessages: {},
        streamingCardVersions: {},

        // Persistent message queue: { cardId: [{ text, images }] }
        // Survives ChatModal close, allowing messages to be sent after current stream completes
        pendingMessages: {},

        getStreamingMessage: (cardId, messageId = null) => {
            const bufferKey = buildStreamBufferKey(cardId, messageId);
            const streamingMessages = get().streamingMessages || {};
            return streamingMessages[bufferKey] || '';
        },

        clearStreamingState: (cardId = null) => set((state) => {
            if (!cardId) {
                streamRenderBuffer.clearAll();
            } else {
                streamRenderBuffer.cleanupCard(cardId);
            }

            if (!cardId) {
                if (
                    Object.keys(state.streamingMessages || {}).length === 0 &&
                    Object.keys(state.streamingCardVersions || {}).length === 0
                ) {
                    return {};
                }

                return {
                    streamingMessages: {},
                    streamingCardVersions: {}
                };
            }

            const nextStreamingMessages = removeStreamBufferUpdatesForCard(
                state.streamingMessages,
                cardId
            );
            const nextStreamingCardVersions = clearStreamingCardVersion(
                state.streamingCardVersions,
                cardId
            );

            if (
                nextStreamingMessages === state.streamingMessages &&
                nextStreamingCardVersions === state.streamingCardVersions
            ) {
                return {};
            }

            return {
                streamingMessages: nextStreamingMessages,
                streamingCardVersions: nextStreamingCardVersions
            };
        }),

        setGeneratingCardIds: (valOrUpdater) => set((state) => ({
            generatingCardIds: typeof valOrUpdater === 'function' ? valOrUpdater(state.generatingCardIds) : valOrUpdater
        })),

        resetGeneratingState: () => set(() => ({
            generatingCardIds: new Set(),
            generatingCardTaskCounts: {}
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
                    ...createCardTimestampFields(),
                    data: {
                        title: text.length > 20 ? text.substring(0, 20) + '...' : (text || 'New Card'),
                        messages: initialMessages,
                        model,
                        providerId
                    }
                };

                set(state => ({
                    cards: [...state.cards, newCard],
                    connections: [...state.connections, ...autoConnections],
                    cardIndexMutation: nextCardIndexMutation(state.cardIndexMutation, {
                        mode: 'bulk',
                        reason: 'createAICard:initialMessages'
                    })
                    // NOTE: Do NOT add to generatingCardIds since we're not generating
                }));

                return newId;
            }

            // Original logic for creating new AI cards
            const userMessageId = uuid();
            const content = createMessageContentWithImages(text, images, contextPrefix);

            const newCard = {
                id: newId, x, y,
                ...createCardTimestampFields(),
                data: {
                    title: text.length > 20 ? text.substring(0, 20) + '...' : (text || 'New Card'),
                    messages: [
                        { id: userMessageId, role: 'user', content },
                        { id: uuid(), role: 'assistant', content: '' }
                    ],
                    model,
                    providerId
                }
            };

            set(state => ({
                cards: [...state.cards, newCard],
                connections: [...state.connections, ...autoConnections],
                generatingCardIds: new Set(state.generatingCardIds).add(newId),
                generatingCardTaskCounts: incrementGeneratingTaskCount(state.generatingCardTaskCounts, newId),
                cardIndexMutation: nextCardIndexMutation(state.cardIndexMutation, {
                    mode: 'bulk',
                    reason: 'createAICard:streaming'
                })
            }));

            if (images.length > 0) {
                void persistCardMessageImagesToIDB({
                    cardId: newId,
                    messageId: userMessageId,
                    images,
                    updateCardFull: get().updateCardFull
                });
            }

            // Removed: position-based auto-add to zone
            // Cards now only join zones via connections

            return newId;
        },

        handleChatGenerate: async (cardId, messages, onToken, options = {}) => {
            const { setCardGenerating, updateCardContent, updateCardFull } = get();
            const assistantMessageId = options?.assistantMessageId || null;
            setCardGenerating(cardId, true, { messageId: assistantMessageId });
            await yieldToMainThread();

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
                const runProviderName = config.name || runProviderId || 'unknown';
                const runBaseUrl = config.baseUrl || 'default';

                console.log(`[AI] Dispatching task: ${cardId}, Model: ${runModel}, ProviderId: ${runProviderId}, ProviderName: ${runProviderName}, BaseUrl: ${runBaseUrl}`);

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
                    if (assistantMessageId) return assistantMessageId;
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

                        onToken(chunk, resolveLatestAssistantMessageId());
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
                    updateCardContent(
                        cardId,
                        `\n\n**${info.title}**\n\n${info.message}\n\n${info.action}`,
                        assistantMessageId
                    );
                    // Reload credits state
                    get().loadSystemCredits?.();
                } else {
                    // Provide user-friendly error messages based on error type
                    const errorMsg = e.message || 'Generation failed';
                    const lowerErrorMsg = errorMsg.toLowerCase();
                    let userMessage;

                    if (
                        lowerErrorMsg.includes('high demand') ||
                        (lowerErrorMsg.includes('503') && lowerErrorMsg.includes('unavailable'))
                    ) {
                        userMessage = lang.startsWith('zh')
                            ? `\n\n**⚠️ Gemini 3.1 当前高负载**\n\nGoogle 官方的 Gemini 3.1 Pro Preview 当前负载较高，这次请求被上游拒绝了。\n这不是你的 Key 问题，也不是你把额度打爆了。请直接重试一次。`
                            : `\n\n**⚠️ Gemini 3.1 is under high demand**\n\nGoogle's official Gemini 3.1 Pro Preview is currently overloaded and rejected this request.\nThis is not a key problem and not a quota blow-up. Please retry once.`;
                    } else if (
                        lowerErrorMsg.includes('generative language api has not been used') ||
                        lowerErrorMsg.includes('service_disabled') ||
                        lowerErrorMsg.includes('api key not valid')
                    ) {
                        userMessage = lang.startsWith('zh')
                            ? `\n\n**⚠️ 官方 Gemini Key 配置有问题**\n\n当前这把 Google 官方 Key 不能直接调用 Gemini API。\n请确认这个 Key 所属的 Google Cloud 项目已经启用 Generative Language API，或者换一把已经开通的官方 Key。`
                            : `\n\n**⚠️ Official Gemini key is not configured correctly**\n\nThis Google official key cannot call the Gemini API directly.\nPlease make sure the Google Cloud project behind this key has Generative Language API enabled, or use another official key that is already enabled.`;
                    } else if (lowerErrorMsg.includes('upstream') ||
                        lowerErrorMsg.includes('unavailable') ||
                        lowerErrorMsg.includes('service')) {
                        // Service unavailable
                        const info = notifications?.serviceUnavailable;
                        userMessage = `\n\n**${info?.title || "⚠️ AI Service Unavailable"}**\n\n` +
                            `${info?.message}\n` +
                            `${info?.englishMessage ? info.englishMessage + '\n\n' : ''}` +
                            `${info?.action}`;
                    } else if (lowerErrorMsg.includes('rate limit') || errorMsg.includes('429')) {
                        // Rate limited
                        const info = notifications?.rateLimit;
                        userMessage = `\n\n**${info?.title || "⚠️ Rate Limited"}**\n\n` +
                            `${info?.message}\n` +
                            `${info?.englishMessage || ''}`;
                    } else if (lowerErrorMsg.includes('timeout')) {
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

                    updateCardContent(cardId, userMessage, assistantMessageId);
                }
            } finally {
                setCardGenerating(cardId, false, { messageId: assistantMessageId });
            }
        },

        updateCardContent: (id, chunk, messageId = null) => {
            const bufferKey = buildStreamBufferKey(id, messageId);
            streamRenderBuffer.enqueue(bufferKey, chunk);
        },

        setAssistantMessageMeta: (cardId, messageId, metaUpdates = {}) => {
            if (!cardId || !messageId || !metaUpdates || typeof metaUpdates !== 'object') return;

            set(state => {
                const updatedCards = [];
                const nextCards = state.cards.map((card) => {
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

                    const updatedCard = {
                        ...card,
                        data: { ...card.data, messages }
                    };
                    updatedCards.push(updatedCard);
                    return updatedCard;
                });

                return {
                    cards: nextCards,
                    cardIndexMutation: updatedCards.length > 0
                        ? nextCardIndexMutation(state.cardIndexMutation, {
                            mode: 'patch',
                            scope: 'content',
                            updatedCards,
                            reason: 'setAssistantMessageMeta'
                        })
                        : state.cardIndexMutation
                };
            });
        },

        setCardGenerating: (id, isGenerating, options = {}) => {
            if (!id) return;
            const bufferKey = buildStreamBufferKey(id, options?.messageId || null);
            const flushedTailUpdates = isGenerating
                ? new Map()
                : streamRenderBuffer.flushKeyNow(bufferKey);

            if (isGenerating) {
                streamRenderBuffer.cleanupKey(bufferKey);
            }

            set(state => {
                const nextGeneratingTaskCounts = isGenerating
                    ? incrementGeneratingTaskCount(state.generatingCardTaskCounts, id)
                    : decrementGeneratingTaskCount(state.generatingCardTaskCounts, id);

                const nextGeneratingCardIds = new Set(state.generatingCardIds);
                const nextCount = nextGeneratingTaskCounts[id] || 0;
                if (nextCount > 0) {
                    nextGeneratingCardIds.add(id);
                } else {
                    nextGeneratingCardIds.delete(id);
                }

                const committedUpdates = isGenerating
                    ? new Map()
                    : mergeStreamUpdateMaps(
                        collectStreamBufferUpdateByKey(state.streamingMessages, bufferKey),
                        flushedTailUpdates
                    );
                const nextCards = committedUpdates.size > 0
                    ? applyStreamTextUpdates(state.cards, committedUpdates)
                    : state.cards;
                const updatedCards = committedUpdates.size > 0
                    ? nextCards.filter((card) => card.id === id)
                    : [];

                const nextStreamingMessages = isGenerating
                    ? state.streamingMessages
                    : removeStreamBufferUpdateByKey(state.streamingMessages, bufferKey);
                const nextStreamingCardVersions = nextCount > 0
                    ? state.streamingCardVersions
                    : clearStreamingCardVersion(state.streamingCardVersions, id);

                const patch = {
                    generatingCardIds: nextGeneratingCardIds,
                    generatingCardTaskCounts: nextGeneratingTaskCounts
                };

                if (nextCards !== state.cards) {
                    patch.cards = nextCards;
                    patch.cardIndexMutation = nextCardIndexMutation(state.cardIndexMutation, {
                        mode: 'patch',
                        scope: 'content',
                        updatedCards,
                        reason: 'setCardGenerating:commitStream'
                    });
                }

                if (nextStreamingMessages !== state.streamingMessages) {
                    patch.streamingMessages = nextStreamingMessages;
                }

                if (nextStreamingCardVersions !== state.streamingCardVersions) {
                    patch.streamingCardVersions = nextStreamingCardVersions;
                }

                return patch;
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
            set(state => {
                const updatedCards = [];
                const nextCards = state.cards.map((c) => {
                    if (selectedIds.indexOf(c.id) !== -1) {
                        const newMsgs = [...(c.data.messages || [])];
                        const assistantId = uuid();
                        if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
                            newMsgs.pop();
                        }
                        newMsgs.push({ id: assistantId, role: 'assistant', content: '' });
                        // Update card to use current active model and provider
                        const updatedCard = {
                            ...c,
                            data: {
                                ...c.data,
                                messages: newMsgs,
                                model: currentModel,
                                providerId: currentProviderId
                            }
                        };
                        updatedCards.push(updatedCard);
                        return updatedCard;
                    }
                    return c;
                });

                return {
                    cards: nextCards,
                    cardIndexMutation: updatedCards.length > 0
                        ? nextCardIndexMutation(state.cardIndexMutation, {
                            mode: 'patch',
                            scope: 'geometry',
                            updatedCards,
                            reason: 'handleRegenerate:resetAssistant'
                        })
                        : state.cardIndexMutation,
                    // Create new Set properly: spread existing Set, then add each selectedId
                    generatingCardIds: new Set([...state.generatingCardIds, ...selectedIds])
                };
            });

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
                    return handleChatGenerate(
                        card.id,
                        currentMsgs,
                        (chunk, msgId) => updateCardContent(card.id, chunk, msgId || messageId),
                        { assistantMessageId: messageId }
                    );
                }));
            } catch (e) {
                console.error("Regeneration failed", e);
            }
        },
    };
};
