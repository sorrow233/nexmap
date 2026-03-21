import { useStore } from '../../store/useStore';
import { CARD_GEOMETRY, findOptimalPosition } from '../../utils/geometry';

export const AGENT_EXECUTION_CONCURRENCY = 5;

export const calculateMindmapChildPositions = (parent, childCount) => {
    const CARD_WIDTH = CARD_GEOMETRY.standard.width;
    const CARD_HEIGHT = CARD_GEOMETRY.standard.height;
    const HORIZONTAL_GAP = 130;
    const VERTICAL_GAP = 50;

    const childX = parent.x + CARD_WIDTH + HORIZONTAL_GAP;
    const totalHeight = childCount * CARD_HEIGHT + (childCount - 1) * VERTICAL_GAP;
    const parentCenterY = parent.y + CARD_HEIGHT / 2;
    const startY = parentCenterY - totalHeight / 2;

    return Array.from({ length: childCount }, (_, index) => ({
        x: childX,
        y: startY + index * (CARD_HEIGHT + VERTICAL_GAP)
    }));
};

export const applySearchMetaToLatestAssistant = (cardId, metadata = {}) => {
    const store = useStore.getState();
    const card = store.cards.find(c => c.id === cardId);
    const assistantMsg = card?.data?.messages?.slice().reverse().find(m => m.role === 'assistant');
    if (!assistantMsg?.id || typeof store.setAssistantMessageMeta !== 'function') return;

    store.setAssistantMessageMeta(cardId, assistantMsg.id, {
        usedSearch: metadata.usedSearch === true
    });
};

export const buildConversationContext = (messages = [], limit = 4) => (
    (messages || [])
        .slice(-limit)
        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
        .join('\n')
);

export const buildTargetConversationContext = (messages = [], targetMessageId, limit = 6) => {
    const targetIndex = targetMessageId
        ? messages.findIndex(m => m.id === targetMessageId)
        : messages.length - 1;
    const contextEndIndex = targetIndex >= 0 ? targetIndex + 1 : messages.length;

    return messages
        .slice(Math.max(0, contextEndIndex - limit), contextEndIndex)
        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : (m.text || '')}`)
        .join('\n');
};

export const findAgentRootPosition = (cards, offset, scale, selectedIds = []) => (
    findOptimalPosition(cards, offset, scale, selectedIds)
);
