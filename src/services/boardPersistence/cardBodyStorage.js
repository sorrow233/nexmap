import {
    idbDel,
    idbGet,
    idbGetEntriesByPrefix,
    idbSet
} from '../db/indexedDB';
import { extractMessageContentText } from '../../utils/boardPerformance';

export const CARD_BODY_LOAD_STATE_EXTERNAL = 'external';
export const CARD_BODY_LOAD_STATE_LOADED = 'loaded';

const CARD_BODY_STORAGE_PREFIX = 'mixboard_card_body_';
const BOARD_STORAGE_PREFIX = 'mixboard_board_';

const cloneValue = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

export const buildCardBodyStorageKey = (boardId, cardId) => (
    `${CARD_BODY_STORAGE_PREFIX}${boardId}_${cardId}`
);

const getCardMessages = (card = {}) => (
    Array.isArray(card?.data?.messages) ? card.data.messages : []
);

const loadLegacyBoardSnapshot = (boardId) => {
    try {
        const raw = localStorage.getItem(`${BOARD_STORAGE_PREFIX}${boardId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const getPreviewTextFromMessages = (messages = []) => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return '';

    const text = extractMessageContentText(lastMessage.content || '');
    if (!text) return '';
    return text.length > 300 ? `${text.slice(0, 300)}...` : text;
};

const countUserMessages = (messages = []) => (
    messages.reduce((total, message) => (
        message?.role === 'user' ? total + 1 : total
    ), 0)
);

const countTextChars = (messages = []) => (
    messages.reduce((total, message) => (
        total + extractMessageContentText(message?.content).length
    ), 0)
);

const normalizeBodyRecord = (record = {}) => {
    const messages = Array.isArray(record?.messages) ? cloneValue(record.messages) : [];
    return {
        version: 1,
        cardId: typeof record?.cardId === 'string' ? record.cardId : '',
        updatedAt: Number(record?.updatedAt) || 0,
        messages,
        messageCount: Number(record?.messageCount) || messages.length,
        userMessageCount: Number(record?.userMessageCount) || countUserMessages(messages),
        previewText: typeof record?.previewText === 'string' ? record.previewText : getPreviewTextFromMessages(messages),
        textChars: Number(record?.textChars) || countTextChars(messages)
    };
};

export const canExternalizeCardBody = (card = {}) => (
    card?.type !== 'note'
);

export const hasExternalCardBody = (card = {}) => (
    canExternalizeCardBody(card) &&
    card?.data?.bodyLoadState === CARD_BODY_LOAD_STATE_EXTERNAL
);

export const hasLoadedCardMessages = (card = {}) => (
    canExternalizeCardBody(card) &&
    Array.isArray(card?.data?.messages) &&
    card?.data?.bodyLoadState !== CARD_BODY_LOAD_STATE_EXTERNAL
);

export const buildCardBodyRecord = (card = {}) => {
    if (!canExternalizeCardBody(card)) {
        return null;
    }

    const messages = getCardMessages(card);
    return normalizeBodyRecord({
        cardId: card?.id || '',
        updatedAt: Number(card?.updatedAt) || Number(card?.createdAt) || 0,
        messages,
        messageCount: messages.length,
        userMessageCount: countUserMessages(messages),
        previewText: getPreviewTextFromMessages(messages),
        textChars: countTextChars(messages)
    });
};

export const createCardRuntimeSkeleton = (boardId, card = {}) => {
    if (!boardId || !canExternalizeCardBody(card)) {
        return card;
    }

    const bodyRecord = buildCardBodyRecord(card);
    if (!bodyRecord) {
        return card;
    }

    return {
        ...card,
        data: {
            ...(card.data || {}),
            messages: [],
            bodyStorageKey: buildCardBodyStorageKey(boardId, card.id),
            bodyLoadState: CARD_BODY_LOAD_STATE_EXTERNAL,
            messageCount: bodyRecord.messageCount,
            userMessageCount: bodyRecord.userMessageCount,
            previewText: bodyRecord.previewText,
            persistedTextChars: bodyRecord.textChars
        }
    };
};

export const hydrateCardWithBodyRecord = (card = {}, bodyRecord = null) => {
    if (!card || !bodyRecord || !canExternalizeCardBody(card)) {
        return card;
    }

    const normalizedRecord = normalizeBodyRecord(bodyRecord);
    return {
        ...card,
        data: {
            ...(card.data || {}),
            messages: normalizedRecord.messages,
            bodyStorageKey: card?.data?.bodyStorageKey || '',
            bodyLoadState: CARD_BODY_LOAD_STATE_LOADED,
            messageCount: normalizedRecord.messageCount,
            userMessageCount: normalizedRecord.userMessageCount,
            previewText: normalizedRecord.previewText,
            persistedTextChars: normalizedRecord.textChars
        }
    };
};

export const pickHydratedCardBodyData = (card = {}) => ({
    messages: Array.isArray(card?.data?.messages) ? cloneValue(card.data.messages) : [],
    bodyStorageKey: card?.data?.bodyStorageKey || '',
    bodyLoadState: card?.data?.bodyLoadState || CARD_BODY_LOAD_STATE_LOADED,
    messageCount: Number(card?.data?.messageCount) || 0,
    userMessageCount: Number(card?.data?.userMessageCount) || 0,
    previewText: typeof card?.data?.previewText === 'string' ? card.data.previewText : '',
    persistedTextChars: Number(card?.data?.persistedTextChars) || 0
});

export const persistCardBodyRecord = async (boardId, card) => {
    if (!boardId || !canExternalizeCardBody(card)) {
        return null;
    }

    const record = buildCardBodyRecord(card);
    if (!record) return null;

    await idbSet(buildCardBodyStorageKey(boardId, card.id), record);
    return record;
};

export const persistBoardCardBodies = async (boardId, cards = []) => {
    if (!boardId || !Array.isArray(cards) || cards.length === 0) {
        return;
    }

    await Promise.all(cards.map(async (card) => {
        if (!canExternalizeCardBody(card)) return;
        if (!Array.isArray(card?.data?.messages)) return;
        await persistCardBodyRecord(boardId, card);
    }));
};

export const loadCardBodyRecord = async (boardId, cardId) => {
    if (!boardId || !cardId) return null;

    try {
        const record = await idbGet(buildCardBodyStorageKey(boardId, cardId));
        return record ? normalizeBodyRecord(record) : null;
    } catch {
        return null;
    }
};

const loadCardBodyRecordFromBoardSnapshot = async (boardId, cardId) => {
    if (!boardId || !cardId) return null;

    let snapshot = null;
    try {
        snapshot = await idbGet(`${BOARD_STORAGE_PREFIX}${boardId}`);
    } catch {
        snapshot = null;
    }

    if (!snapshot) {
        snapshot = loadLegacyBoardSnapshot(boardId);
    }

    const snapshotCard = Array.isArray(snapshot?.cards)
        ? snapshot.cards.find((card) => card?.id === cardId)
        : null;

    if (!snapshotCard || hasExternalCardBody(snapshotCard)) {
        return null;
    }

    return buildCardBodyRecord(snapshotCard);
};

export const clearCardBodyRecord = async (boardId, cardId) => {
    if (!boardId || !cardId) return;

    try {
        await idbDel(buildCardBodyStorageKey(boardId, cardId));
    } catch {
        // Best-effort cleanup only.
    }
};

export const clearBoardCardBodies = async (boardId) => {
    if (!boardId) return;

    try {
        const entries = await idbGetEntriesByPrefix(`${CARD_BODY_STORAGE_PREFIX}${boardId}_`);
        if (!Array.isArray(entries) || entries.length === 0) {
            return;
        }

        await Promise.all(entries.map(({ key }) => idbDel(key).catch(() => undefined)));
    } catch {
        // Best-effort cleanup only.
    }
};

export const hydrateCardBody = async (boardId, card = {}) => {
    if (!boardId || !card?.id || !canExternalizeCardBody(card)) {
        return card;
    }

    if (!hasExternalCardBody(card)) {
        return card;
    }

    const record = await loadCardBodyRecord(boardId, card.id);
    if (record) {
        return {
            ...card,
            data: {
                ...(card.data || {}),
                messages: record.messages,
                bodyStorageKey: buildCardBodyStorageKey(boardId, card.id),
                bodyLoadState: CARD_BODY_LOAD_STATE_LOADED,
                messageCount: record.messageCount,
                userMessageCount: record.userMessageCount,
                previewText: record.previewText,
                persistedTextChars: record.textChars
            }
        };
    }

    const snapshotRecord = await loadCardBodyRecordFromBoardSnapshot(boardId, card.id);
    if (!snapshotRecord) {
        return card;
    }

    try {
        await persistCardBodyRecord(boardId, {
            ...card,
            data: {
                ...(card.data || {}),
                messages: snapshotRecord.messages
            }
        });
    } catch {
        // Hydration can still proceed from the durable board snapshot.
    }

    return {
        ...card,
        data: {
            ...(card.data || {}),
            messages: snapshotRecord.messages,
            bodyStorageKey: buildCardBodyStorageKey(boardId, card.id),
            bodyLoadState: CARD_BODY_LOAD_STATE_LOADED,
            messageCount: snapshotRecord.messageCount,
            userMessageCount: snapshotRecord.userMessageCount,
            previewText: snapshotRecord.previewText,
            persistedTextChars: snapshotRecord.textChars
        }
    };
};

export const materializeBoardCardsFromBodies = async (boardId, cards = [], fallbackCards = []) => {
    if (!boardId || !Array.isArray(cards) || cards.length === 0) {
        return Array.isArray(cards) ? cards : [];
    }

    const fallbackCardMap = new Map(
        (Array.isArray(fallbackCards) ? fallbackCards : [])
            .filter(Boolean)
            .map((card) => [card.id, card])
    );

    return Promise.all(cards.map(async (card) => {
        if (!hasExternalCardBody(card)) {
            return card;
        }

        const hydratedCard = await hydrateCardBody(boardId, card);
        if (!hasExternalCardBody(hydratedCard)) {
            return hydratedCard;
        }

        return fallbackCardMap.get(card.id) || card;
    }));
};
