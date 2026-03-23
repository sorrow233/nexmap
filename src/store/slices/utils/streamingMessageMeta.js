const parseBufferKey = (bufferKey = '') => {
    const separatorIndex = bufferKey.indexOf(':');
    if (separatorIndex < 0) {
        return { cardId: bufferKey, messageId: null };
    }

    return {
        cardId: bufferKey.slice(0, separatorIndex),
        messageId: bufferKey.slice(separatorIndex + 1)
    };
};

export const mergeStreamingMessageMeta = (bufferState = {}, bufferKey, metaUpdates = {}) => {
    if (!bufferKey || !metaUpdates || typeof metaUpdates !== 'object') {
        return bufferState;
    }

    const filteredEntries = Object.entries(metaUpdates).filter(([, value]) => value !== undefined);
    if (filteredEntries.length === 0) {
        return bufferState;
    }

    const previousEntry = bufferState[bufferKey] || {};
    let nextEntry = previousEntry;
    let changed = false;

    filteredEntries.forEach(([key, value]) => {
        if (previousEntry[key] === value) {
            return;
        }

        if (nextEntry === previousEntry) {
            nextEntry = { ...previousEntry };
        }
        nextEntry[key] = value;
        changed = true;
    });

    if (!changed) {
        return bufferState;
    }

    return {
        ...bufferState,
        [bufferKey]: nextEntry
    };
};

export const collectStreamingMessageMetaForCard = (bufferState = {}, cardId) => {
    if (!cardId || !bufferState) {
        return {};
    }

    const prefix = `${cardId}:`;
    return Object.fromEntries(
        Object.entries(bufferState).filter(([bufferKey, value]) => (
            Boolean(value) && (bufferKey === cardId || bufferKey.startsWith(prefix))
        ))
    );
};

export const removeStreamingMessageMetaForCard = (bufferState = {}, cardId) => {
    if (!cardId || !bufferState) {
        return bufferState;
    }

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

export const removeStreamingMessageMetaByKey = (bufferState = {}, bufferKey) => {
    if (!bufferKey || !bufferState || !Object.prototype.hasOwnProperty.call(bufferState, bufferKey)) {
        return bufferState;
    }

    const nextBufferState = { ...bufferState };
    delete nextBufferState[bufferKey];
    return nextBufferState;
};

export const applyStreamingMessageMetaUpdates = (cards = [], metaByBufferKey = {}) => {
    const metaEntries = Object.entries(metaByBufferKey).filter(([, value]) => (
        value && typeof value === 'object'
    ));
    if (metaEntries.length === 0) {
        return cards;
    }

    const updatesByCard = new Map();
    metaEntries.forEach(([bufferKey, metaUpdates]) => {
        const { cardId, messageId } = parseBufferKey(bufferKey);
        if (!cardId || !messageId) {
            return;
        }

        let messageUpdates = updatesByCard.get(cardId);
        if (!messageUpdates) {
            messageUpdates = new Map();
            updatesByCard.set(cardId, messageUpdates);
        }

        messageUpdates.set(messageId, {
            ...(messageUpdates.get(messageId) || {}),
            ...metaUpdates
        });
    });

    if (updatesByCard.size === 0) {
        return cards;
    }

    const nextCards = cards.slice();
    let hasChanged = false;

    cards.forEach((card, index) => {
        const messageUpdates = updatesByCard.get(card.id);
        if (!messageUpdates) {
            return;
        }

        const messages = [...(card?.data?.messages || [])];
        let messageChanged = false;

        messages.forEach((message, messageIndex) => {
            if (!messageUpdates.has(message.id)) {
                return;
            }

            const nextMeta = {
                ...(message?.meta || {}),
                ...(messageUpdates.get(message.id) || {})
            };

            messages[messageIndex] = {
                ...message,
                meta: nextMeta
            };
            messageChanged = true;
        });

        if (!messageChanged) {
            return;
        }

        hasChanged = true;
        nextCards[index] = {
            ...card,
            data: {
                ...card.data,
                messages
            }
        };
    });

    return hasChanged ? nextCards : cards;
};
