const DEFAULT_OPTIONS = {
    frameIntervalMs: 16,
    baseChunkSize: 24,
    maxChunkSize: 320,
    targetDrainSteps: 8
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

export const buildStreamBufferKey = (cardId, messageId = null) => (
    messageId ? `${cardId}:${messageId}` : cardId
);

export const appendStreamBufferUpdates = (bufferState = {}, updatesMap) => {
    if (!updatesMap || updatesMap.size === 0) {
        return {
            nextBufferState: bufferState,
            dirtyCardIds: new Set()
        };
    }

    let nextBufferState = bufferState;
    const dirtyCardIds = new Set();

    updatesMap.forEach((content, bufferKey) => {
        if (!content || !bufferKey) return;

        const { cardId } = parseBufferKey(bufferKey);
        if (!cardId) return;

        if (nextBufferState === bufferState) {
            nextBufferState = { ...bufferState };
        }

        nextBufferState[bufferKey] = `${nextBufferState[bufferKey] || ''}${content}`;
        dirtyCardIds.add(cardId);
    });

    return {
        nextBufferState,
        dirtyCardIds
    };
};

export const collectStreamBufferUpdatesForCard = (bufferState = {}, cardId) => {
    const updates = new Map();
    if (!cardId || !bufferState) return updates;

    const prefix = `${cardId}:`;
    Object.entries(bufferState).forEach(([bufferKey, content]) => {
        if (!content) return;
        if (bufferKey === cardId || bufferKey.startsWith(prefix)) {
            updates.set(bufferKey, content);
        }
    });

    return updates;
};

export const collectStreamBufferUpdateByKey = (bufferState = {}, bufferKey) => {
    const updates = new Map();
    if (!bufferKey || !bufferState) return updates;

    const content = bufferState[bufferKey];
    if (content) {
        updates.set(bufferKey, content);
    }

    return updates;
};

export const removeStreamBufferUpdatesForCard = (bufferState = {}, cardId) => {
    if (!cardId || !bufferState) return bufferState;

    const prefix = `${cardId}:`;
    let nextBufferState = bufferState;

    Object.keys(bufferState).forEach((bufferKey) => {
        if (bufferKey !== cardId && !bufferKey.startsWith(prefix)) {
            return;
        }

        if (nextBufferState === bufferState) {
            nextBufferState = { ...bufferState };
        }
        delete nextBufferState[bufferKey];
    });

    return nextBufferState;
};

export const removeStreamBufferUpdateByKey = (bufferState = {}, bufferKey) => {
    if (!bufferKey || !bufferState || !Object.prototype.hasOwnProperty.call(bufferState, bufferKey)) {
        return bufferState;
    }

    const nextBufferState = { ...bufferState };
    delete nextBufferState[bufferKey];
    return nextBufferState;
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

    const nextCards = cards.slice();
    const pendingCardIds = new Set(updatesByCard.keys());
    let hasCardChanged = false;

    for (let index = 0; index < cards.length; index += 1) {
        const card = cards[index];
        if (!pendingCardIds.has(card.id)) continue;

        const cardUpdates = updatesByCard.get(card.id);
        if (!cardUpdates) {
            pendingCardIds.delete(card.id);
            continue;
        }

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

        pendingCardIds.delete(card.id);

        if (!messageChanged) {
            if (pendingCardIds.size === 0) break;
            continue;
        }

        hasCardChanged = true;
        nextCards[index] = {
            ...card,
            data: {
                ...card.data,
                messages
            }
        };

        if (pendingCardIds.size === 0) {
            break;
        }
    }

    return hasCardChanged ? nextCards : cards;
};

export const createStreamRenderBuffer = (onFlush, options = {}) => {
    const config = { ...DEFAULT_OPTIONS, ...options };

    const pendingChunks = new Map();
    const renderChunks = new Map();
    let drainHandle = null;
    let flushHandle = null;
    let destroyed = false;
    const scheduleFrame = (callback) => {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            const id = window.requestAnimationFrame(callback);
            return () => window.cancelAnimationFrame(id);
        }

        const timeoutId = setTimeout(callback, config.frameIntervalMs);
        return () => clearTimeout(timeoutId);
    };

    const clearTimers = () => {
        if (drainHandle) {
            drainHandle();
            drainHandle = null;
        }
        if (flushHandle) {
            flushHandle();
            flushHandle = null;
        }
    };

    const flushRenderChunks = () => {
        flushHandle = null;
        if (destroyed || renderChunks.size === 0) return;

        const updates = new Map(renderChunks);
        renderChunks.clear();
        onFlush(updates);
    };

    const scheduleFlush = () => {
        if (destroyed || flushHandle) return;
        flushHandle = scheduleFrame(flushRenderChunks);
    };

    const drainPendingChunks = () => {
        drainHandle = null;
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
            drainHandle = scheduleFrame(drainPendingChunks);
        }
    };

    const enqueue = (key, chunk) => {
        if (destroyed || !key || !chunk) return;
        appendText(pendingChunks, key, chunk);

        if (!drainHandle) {
            drainHandle = scheduleFrame(drainPendingChunks);
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

    const cleanupKey = (bufferKey) => {
        if (!bufferKey) return;
        pendingChunks.delete(bufferKey);
        renderChunks.delete(bufferKey);
    };

    const clearAll = () => {
        clearTimers();
        pendingChunks.clear();
        renderChunks.clear();
    };

    const destroy = () => {
        destroyed = true;
        clearAll();
    };

    return {
        enqueue,
        flushNow,
        cleanupCard,
        cleanupKey,
        clearAll,
        destroy
    };
};
