const DEFAULT_OPTIONS = {
    drainIntervalMs: 16,
    baseChunkSize: 6,
    maxChunkSize: 90,
    targetDrainSteps: 14
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getAdaptiveChunkSize = (pendingLength, options) => {
    const adaptive = Math.ceil(pendingLength / options.targetDrainSteps);
    return clamp(adaptive, options.baseChunkSize, options.maxChunkSize);
};

const appendText = (targetMap, key, text) => {
    if (!text) return;
    targetMap.set(key, (targetMap.get(key) || '') + text);
};

const parseBufferKey = (bufferKey) => {
    const separatorIndex = bufferKey.indexOf(':');
    if (separatorIndex < 0) {
        return { cardId: bufferKey, messageId: null };
    }

    return {
        cardId: bufferKey.slice(0, separatorIndex),
        messageId: bufferKey.slice(separatorIndex + 1)
    };
};

export const applyStreamTextUpdates = (cards, updatesMap) => {
    if (!updatesMap || updatesMap.size === 0) return cards;

    const updatesByCard = new Map();
    updatesMap.forEach((content, bufferKey) => {
        if (!content) return;
        const { cardId, messageId } = parseBufferKey(bufferKey);
        if (!cardId) return;

        let cardUpdates = updatesByCard.get(cardId);
        if (!cardUpdates) {
            cardUpdates = {
                directChunk: '',
                messageChunks: new Map()
            };
            updatesByCard.set(cardId, cardUpdates);
        }

        if (messageId) {
            const previous = cardUpdates.messageChunks.get(messageId) || '';
            cardUpdates.messageChunks.set(messageId, previous + content);
            return;
        }

        cardUpdates.directChunk += content;
    });

    if (updatesByCard.size === 0) return cards;

    let hasCardChanged = false;
    const nextCards = cards.map((card) => {
        const cardUpdates = updatesByCard.get(card.id);
        if (!cardUpdates) return card;

        const messages = [...(card.data.messages || [])];
        let messageChanged = false;

        cardUpdates.messageChunks.forEach((chunk, messageId) => {
            const targetIndex = messages.findIndex((message) => message.id === messageId);
            if (targetIndex < 0) return;

            const targetMessage = messages[targetIndex];
            messages[targetIndex] = {
                ...targetMessage,
                content: (targetMessage.content || '') + chunk
            };
            messageChanged = true;
        });

        // Preserve legacy behavior: direct chunk only applies when there is no message-targeted update.
        if (cardUpdates.directChunk && cardUpdates.messageChunks.size === 0) {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.role !== 'assistant') {
                messages.push({ role: 'assistant', content: cardUpdates.directChunk });
            } else {
                messages[messages.length - 1] = {
                    ...lastMessage,
                    content: (lastMessage.content || '') + cardUpdates.directChunk
                };
            }
            messageChanged = true;
        }

        if (!messageChanged) return card;
        hasCardChanged = true;
        return {
            ...card,
            data: {
                ...card.data,
                messages
            }
        };
    });

    return hasCardChanged ? nextCards : cards;
};

export const createStreamRenderBuffer = (onFlush, options = {}) => {
    const config = { ...DEFAULT_OPTIONS, ...options };

    const pendingChunks = new Map();
    const renderChunks = new Map();
    let drainTimer = null;
    let flushTimer = null;
    let destroyed = false;

    const clearTimers = () => {
        if (drainTimer) {
            clearTimeout(drainTimer);
            drainTimer = null;
        }
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
    };

    const flushRenderChunks = () => {
        flushTimer = null;
        if (destroyed || renderChunks.size === 0) return;

        const updates = new Map(renderChunks);
        renderChunks.clear();
        onFlush(updates);
    };

    const scheduleFlush = () => {
        if (destroyed || flushTimer) return;
        flushTimer = setTimeout(flushRenderChunks, config.drainIntervalMs);
    };

    const drainPendingChunks = () => {
        drainTimer = null;
        if (destroyed || pendingChunks.size === 0) return;

        pendingChunks.forEach((fullPendingText, key) => {
            if (!fullPendingText) {
                pendingChunks.delete(key);
                return;
            }

            const sliceSize = getAdaptiveChunkSize(fullPendingText.length, config);
            const slice = fullPendingText.slice(0, sliceSize);
            const remaining = fullPendingText.slice(sliceSize);

            appendText(renderChunks, key, slice);
            if (remaining) {
                pendingChunks.set(key, remaining);
            } else {
                pendingChunks.delete(key);
            }
        });

        scheduleFlush();

        if (pendingChunks.size > 0) {
            drainTimer = setTimeout(drainPendingChunks, config.drainIntervalMs);
        }
    };

    const enqueue = (key, chunk) => {
        if (destroyed || !key || !chunk) return;
        appendText(pendingChunks, key, chunk);

        if (!drainTimer) {
            drainTimer = setTimeout(drainPendingChunks, config.drainIntervalMs);
        }
    };

    const flushNow = () => {
        if (destroyed) return;
        clearTimers();

        pendingChunks.forEach((content, key) => appendText(renderChunks, key, content));
        pendingChunks.clear();

        if (renderChunks.size === 0) return;

        const updates = new Map(renderChunks);
        renderChunks.clear();
        onFlush(updates);
    };

    const cleanupCard = (cardId) => {
        if (!cardId) return;

        pendingChunks.forEach((_, key) => {
            if (key === cardId || key.startsWith(`${cardId}:`)) {
                pendingChunks.delete(key);
            }
        });

        renderChunks.forEach((_, key) => {
            if (key === cardId || key.startsWith(`${cardId}:`)) {
                renderChunks.delete(key);
            }
        });
    };

    const destroy = () => {
        destroyed = true;
        clearTimers();
        pendingChunks.clear();
        renderChunks.clear();
    };

    return {
        enqueue,
        flushNow,
        cleanupCard,
        destroy
    };
};
