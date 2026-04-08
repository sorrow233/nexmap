const activeStreamRoutes = new Map();

const toSafePreview = (value, maxLength = 80) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.length > maxLength
        ? `${value.slice(0, maxLength)}...`
        : value;
};

export const createStreamRouteTraceId = (cardId = '') => (
    `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${cardId ? `-${String(cardId).slice(-4)}` : ''}`
);

export const logStreamRouteDebug = (traceId, event, payload = {}) => {
    console.log(`[StreamRoute][${traceId || 'unknown'}] ${event}`, payload);
};

export const setActiveStreamRouteDebug = (cardId, routeMeta = {}) => {
    if (!cardId) return null;

    const nextMeta = {
        ...activeStreamRoutes.get(cardId),
        ...routeMeta,
        cardId
    };

    activeStreamRoutes.set(cardId, nextMeta);
    return nextMeta;
};

export const getActiveStreamRouteDebug = (cardId) => (
    activeStreamRoutes.get(cardId) || null
);

export const clearActiveStreamRouteDebug = (cardId, traceId = null) => {
    if (!cardId) return null;

    const currentMeta = activeStreamRoutes.get(cardId) || null;
    if (!currentMeta) return null;
    if (traceId && currentMeta.traceId && currentMeta.traceId !== traceId) {
        return currentMeta;
    }

    activeStreamRoutes.delete(cardId);
    return currentMeta;
};

export const findLatestAssistantMessage = (messages = []) => (
    [...(Array.isArray(messages) ? messages : [])]
        .reverse()
        .find((message) => message?.role === 'assistant') || null
);

export const getCardStreamBufferKeys = (streamingMessages = {}, cardId) => {
    if (!cardId || !streamingMessages) return [];

    const prefix = `${cardId}:`;
    return Object.keys(streamingMessages)
        .filter((bufferKey) => bufferKey === cardId || bufferKey.startsWith(prefix))
        .sort();
};

export const summarizeMessagesForRouteDebug = (messages = []) => {
    const safeMessages = Array.isArray(messages) ? messages : [];
    const lastMessage = safeMessages[safeMessages.length - 1] || null;
    const latestAssistantMessage = findLatestAssistantMessage(safeMessages);

    return {
        messageCount: safeMessages.length,
        lastMessageId: lastMessage?.id || null,
        lastMessageRole: lastMessage?.role || null,
        latestAssistantMessageId: latestAssistantMessage?.id || null
    };
};

export const summarizeChunkForRouteDebug = (chunk) => ({
    chunkLength: typeof chunk === 'string' ? chunk.length : 0,
    chunkPreview: toSafePreview(typeof chunk === 'string' ? chunk : '')
});
