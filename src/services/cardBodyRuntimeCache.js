import { isLargeBoardCards } from '../utils/boardPerformance';

const PREVIEW_TEXT_LIMIT = 360;
const PREVIEW_MESSAGE_LIMIT = 220;
const HOT_HYDRATED_CARD_LIMIT = 3;
const HOT_HYDRATED_CHAR_BUDGET = 300_000;

const bodyRegistry = new Map();
const hotTouchOrder = new Map();
let activeBoardId = '';
let touchCounter = 0;
let lastHistoryCardsInput = null;
let lastHistoryCardsOutput = null;

const normalizeBoardId = (boardId = '') => (
    typeof boardId === 'string' ? boardId : ''
);

const ensureBoardContext = (boardId = activeBoardId) => {
    const normalizedBoardId = normalizeBoardId(boardId);
    if (normalizedBoardId && activeBoardId !== normalizedBoardId) {
        activeBoardId = normalizedBoardId;
        bodyRegistry.clear();
        hotTouchOrder.clear();
        touchCounter = 0;
        lastHistoryCardsInput = null;
        lastHistoryCardsOutput = null;
    } else if (!activeBoardId && normalizedBoardId) {
        activeBoardId = normalizedBoardId;
    }

    return activeBoardId;
};

const cleanPreviewText = (value = '', limit = PREVIEW_TEXT_LIMIT) => {
    const normalized = String(value || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) return '';
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit)}...`;
};

const extractMessageText = (content) => {
    if (typeof content === 'string') {
        return content;
    }

    if (!Array.isArray(content)) {
        return '';
    }

    const text = content
        .map((part) => {
            if (part?.type === 'text') return String(part.text || '');
            if (part?.type === 'image' || part?.type === 'image_url') return '[Image]';
            return '';
        })
        .join(' ')
        .trim();

    return text;
};

const estimateMessageChars = (messages = []) => (
    messages.reduce((total, message) => total + extractMessageText(message?.content).length, 0)
);

const estimateCardBodyChars = (body = {}) => {
    const messageChars = Array.isArray(body.messages) ? estimateMessageChars(body.messages) : 0;
    const contentChars = typeof body.content === 'string' ? body.content.length : 0;
    return messageChars + contentChars;
};

const getMessageCount = (messages = []) => (
    Array.isArray(messages) ? messages.length : 0
);

const getUserMessageCount = (messages = []) => (
    Array.isArray(messages)
        ? messages.filter((message) => message?.role === 'user').length
        : 0
);

const getLastMessagePreview = (messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) return '';
    const lastMessage = messages[messages.length - 1];
    return cleanPreviewText(extractMessageText(lastMessage?.content), PREVIEW_MESSAGE_LIMIT);
};

const getCardPreviewText = (card = {}, body = {}) => {
    if (Array.isArray(body.messages) && body.messages.length > 0) {
        return getLastMessagePreview(body.messages);
    }

    if (typeof body.content === 'string') {
        return cleanPreviewText(body.content, PREVIEW_TEXT_LIMIT);
    }

    return cleanPreviewText(card?.data?.runtimeBodyState?.previewText || '', PREVIEW_TEXT_LIMIT);
};

const cloneRuntimeBodyState = (card = {}, nextState = {}) => ({
    ...(card?.data?.runtimeBodyState || {}),
    ...nextState
});

export const isCardBodyRuntimeDehydrated = (card = {}) => (
    card?.data?.runtimeBodyState?.hydrated === false
);

export const isCardBodyRuntimeManaged = (card = {}) => (
    Boolean(card?.data?.runtimeBodyState)
);

const extractBodyFromCard = (card = {}) => {
    const data = card?.data || {};
    const hasMessages = Array.isArray(data.messages);
    const hasContent = typeof data.content === 'string';

    if (!hasMessages && !hasContent) {
        return null;
    }

    return {
        messages: hasMessages ? data.messages : undefined,
        content: hasContent ? data.content : undefined
    };
};

const buildMessageShell = (message = {}, preview = '') => ({
    id: message.id,
    role: message.role,
    meta: message.meta,
    content: preview
});

const removeRuntimeBodyState = (card = {}) => {
    if (!card?.data?.runtimeBodyState) return card;

    const { runtimeBodyState, ...nextData } = card.data;
    return {
        ...card,
        data: nextData
    };
};

const resolveCardBodyEntry = (cardId) => bodyRegistry.get(cardId) || null;

const writeCardBodyEntry = (cardId, entry) => {
    if (!cardId || !entry) return null;
    bodyRegistry.set(cardId, entry);
    return entry;
};

const createBodyEntryFromCard = (card = {}) => {
    const cardId = card?.id;
    if (!cardId) return null;

    const body = extractBodyFromCard(card);
    if (!body) return null;

    return {
        cardId,
        boardId: activeBoardId,
        messages: Array.isArray(body.messages) ? body.messages : undefined,
        content: typeof body.content === 'string' ? body.content : undefined,
        estimatedChars: estimateCardBodyChars(body),
        messageCount: getMessageCount(body.messages),
        userMessageCount: getUserMessageCount(body.messages),
        previewText: getCardPreviewText(card, body)
    };
};

export const setCardBodyRuntimeBoard = (boardId = '') => {
    ensureBoardContext(boardId);
};

export const clearCardBodyRuntimeCache = (boardId = '') => {
    if (!boardId || normalizeBoardId(boardId) === activeBoardId) {
        activeBoardId = normalizeBoardId(boardId);
        bodyRegistry.clear();
        hotTouchOrder.clear();
        touchCounter = 0;
        lastHistoryCardsInput = null;
        lastHistoryCardsOutput = null;
    }
};

export const removeCardBodyFromRuntimeCache = (cardId) => {
    if (!cardId) return;
    bodyRegistry.delete(cardId);
    hotTouchOrder.delete(cardId);
};

export const touchCardBodyRuntimeCache = (cardId) => {
    if (!cardId || !bodyRegistry.has(cardId)) return;
    touchCounter += 1;
    hotTouchOrder.set(cardId, touchCounter);
};

export const primeCardBodyRuntimeCache = (boardId, cards = []) => {
    ensureBoardContext(boardId);
    const activeCardIds = new Set(
        (Array.isArray(cards) ? cards : [])
            .map((card) => card?.id)
            .filter(Boolean)
    );

    Array.from(bodyRegistry.keys()).forEach((cardId) => {
        if (!activeCardIds.has(cardId)) {
            bodyRegistry.delete(cardId);
            hotTouchOrder.delete(cardId);
        }
    });

    cards.forEach((card) => {
        if (!card?.id || isCardBodyRuntimeDehydrated(card)) return;
        const entry = createBodyEntryFromCard(card);
        if (entry) {
            writeCardBodyEntry(card.id, entry);
        }
    });
};

export const cacheHydratedCardBody = (card, options = {}) => {
    ensureBoardContext(options.boardId);
    if (!card?.id || isCardBodyRuntimeDehydrated(card)) {
        return resolveCardBodyEntry(card?.id);
    }

    const entry = createBodyEntryFromCard(card);
    if (!entry) return null;

    writeCardBodyEntry(card.id, entry);
    if (options.touch !== false) {
        touchCardBodyRuntimeCache(card.id);
    }
    return entry;
};

export const hydrateCardBodyFromRuntimeCache = (card, options = {}) => {
    ensureBoardContext(options.boardId);
    if (!card?.id) return card;

    if (isCardBodyRuntimeManaged(card) && !isCardBodyRuntimeDehydrated(card)) {
        cacheHydratedCardBody(card, {
            boardId: options.boardId,
            touch: options.touch
        });
        return card;
    }

    const entry = resolveCardBodyEntry(card.id);
    if (!entry) return card;

    const nextData = {
        ...(card.data || {}),
        runtimeBodyState: cloneRuntimeBodyState(card, {
            hydrated: true,
            previewText: entry.previewText,
            messageCount: entry.messageCount,
            userMessageCount: entry.userMessageCount,
            estimatedChars: entry.estimatedChars
        })
    };

    if (Array.isArray(entry.messages)) {
        nextData.messages = entry.messages;
    }

    if (typeof entry.content === 'string') {
        nextData.content = entry.content;
    }

    if (options.touch !== false) {
        touchCardBodyRuntimeCache(card.id);
    }

    if (
        card.data === nextData ||
        (
            card.data?.messages === nextData.messages &&
            card.data?.content === nextData.content &&
            card.data?.runtimeBodyState?.hydrated === true
        )
    ) {
        return card;
    }

    return {
        ...card,
        data: nextData
    };
};

export const dehydrateCardBodyForRuntime = (card, options = {}) => {
    ensureBoardContext(options.boardId);
    if (!card?.id) return card;

    const entry = isCardBodyRuntimeDehydrated(card)
        ? resolveCardBodyEntry(card.id)
        : cacheHydratedCardBody(card, { boardId: options.boardId, touch: options.touch });

    if (!entry) {
        return removeRuntimeBodyState(card);
    }

    const nextData = {
        ...(card.data || {}),
        runtimeBodyState: cloneRuntimeBodyState(card, {
            hydrated: false,
            previewText: entry.previewText,
            messageCount: entry.messageCount,
            userMessageCount: entry.userMessageCount,
            estimatedChars: entry.estimatedChars
        })
    };

    if (Array.isArray(entry.messages)) {
        const lastIndex = entry.messages.length - 1;
        nextData.messages = entry.messages.map((message, index) => (
            buildMessageShell(message, index === lastIndex ? entry.previewText : '')
        ));
    }

    if (typeof entry.content === 'string') {
        nextData.content = cleanPreviewText(entry.content, PREVIEW_TEXT_LIMIT);
    }

    if (
        card.data?.runtimeBodyState?.hydrated === false &&
        card.data?.messages === nextData.messages &&
        card.data?.content === nextData.content
    ) {
        return card;
    }

    return {
        ...card,
        data: nextData
    };
};

export const resolvePreferredHydratedCardIds = (baseCardIds = []) => {
    const preferredIds = new Set(baseCardIds || []);
    const hotEntries = Array.from(hotTouchOrder.entries())
        .sort((left, right) => right[1] - left[1])
        .map(([cardId]) => cardId);

    let hotCount = 0;
    let totalChars = 0;

    hotEntries.forEach((cardId) => {
        if (preferredIds.has(cardId)) {
            return;
        }

        const entry = resolveCardBodyEntry(cardId);
        if (!entry) return;
        if (hotCount >= HOT_HYDRATED_CARD_LIMIT) return;
        if (totalChars + entry.estimatedChars > HOT_HYDRATED_CHAR_BUDGET) return;

        preferredIds.add(cardId);
        totalChars += entry.estimatedChars;
        hotCount += 1;
    });

    return preferredIds;
};

export const buildRuntimeCardsForStore = (cards = [], options = {}) => {
    ensureBoardContext(options.boardId);
    const preferredHydratedIds = resolvePreferredHydratedCardIds(options.keepHydratedIds || []);
    let didChange = false;
    const nextCards = cards.map((card) => {
        if (!card?.id) return card;
        if (preferredHydratedIds.has(card.id)) {
            const nextCard = hydrateCardBodyFromRuntimeCache(card, {
                boardId: options.boardId,
                touch: false
            });
            if (nextCard !== card) {
                didChange = true;
            }
            return nextCard;
        }
        const nextCard = dehydrateCardBodyForRuntime(card, {
            boardId: options.boardId,
            touch: false
        });
        if (nextCard !== card) {
            didChange = true;
        }
        return nextCard;
    });

    return {
        cards: didChange ? nextCards : cards,
        preferredHydratedIds
    };
};

export const buildHistoryCardsForRuntime = (cards = [], options = {}) => {
    if (cards === lastHistoryCardsInput) {
        return lastHistoryCardsOutput;
    }

    const hasRuntimeManagedCards = Array.isArray(cards)
        && (
            isLargeBoardCards(cards)
            || cards.some((card) => isCardBodyRuntimeManaged(card) || isCardBodyRuntimeDehydrated(card))
        );
    if (!hasRuntimeManagedCards) {
        lastHistoryCardsInput = cards;
        lastHistoryCardsOutput = cards;
        return cards;
    }

    const nextCards = buildRuntimeCardsForStore(cards, {
        ...options,
        keepHydratedIds: []
    }).cards;
    lastHistoryCardsInput = cards;
    lastHistoryCardsOutput = nextCards;
    return nextCards;
};

export const mergeRuntimeCardBodies = (cards = [], options = {}) => {
    ensureBoardContext(options.boardId);
    return cards.map((card) => {
        const hydratedCard = hydrateCardBodyFromRuntimeCache(card, {
            boardId: options.boardId,
            touch: false
        });

        if (isCardBodyRuntimeManaged(card) && !isCardBodyRuntimeDehydrated(card)) {
            cacheHydratedCardBody(hydratedCard, {
                boardId: options.boardId,
                touch: false
            });
        }

        return removeRuntimeBodyState(hydratedCard);
    });
};

export const getCardBodyRuntimeCacheSnapshot = () => ({
    boardId: activeBoardId,
    entries: bodyRegistry.size,
    hotEntries: hotTouchOrder.size
});
