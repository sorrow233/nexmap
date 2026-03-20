import { buildBoardContentHash } from '../boardPersistence/boardContentHash.js';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService.js';
import {
    applyBoardStructuralPatchOperations,
    buildBoardStructuralPatchOperations,
    BOARD_PATCH_OP_BOARD_PROMPT_REMOVE,
    BOARD_PATCH_OP_BOARD_PROMPT_UPSERT,
    BOARD_PATCH_OP_CONNECTION_REMOVE,
    BOARD_PATCH_OP_CONNECTION_UPSERT,
    BOARD_PATCH_OP_GROUP_REMOVE,
    BOARD_PATCH_OP_GROUP_UPSERT,
    BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_ENABLED,
    BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_SELECTION,
    BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_ENABLED,
    BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_MODE,
    deepEqual,
    toStableStructuralBoardShape
} from './boardPatchStructuralOps.js';

export const BOARD_PATCH_KIND = 'board_patch_v2';
export const BOARD_PATCH_OP_CARD_UPSERT = 'card_upsert';
export const BOARD_PATCH_OP_CARD_REMOVE = 'card_remove';
export const BOARD_PATCH_OP_MESSAGE_APPEND = 'message_append';

const DEFAULT_MAX_PATCH_OPS = 96;
const DEFAULT_MAX_PATCH_BYTES = 280 * 1024;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const toSafeRevision = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : 0;
};

const toStableDataShape = (board = {}) => ({
    cards: safeArray(board.cards),
    ...toStableStructuralBoardShape(board),
    boardInstructionSettings: normalizeBoardInstructionSettings(
        board.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});

const buildCardMap = (cards = []) => {
    const cardMap = new Map();
    cards.forEach((card) => {
        if (!card || !card.id) return;
        cardMap.set(card.id, card);
    });
    return cardMap;
};

const stripCardMessages = (card) => {
    if (!card || typeof card !== 'object') return card;
    const nextData = {
        ...(card.data || {})
    };
    if (Object.prototype.hasOwnProperty.call(nextData, 'messages')) {
        delete nextData.messages;
    }
    return {
        ...card,
        data: nextData
    };
};

const stripMessageContent = (message) => {
    if (!message || typeof message !== 'object') return message;
    return {
        ...message,
        content: ''
    };
};

const tryBuildMessageAppendOperation = (previousCard, nextCard) => {
    if (!previousCard || !nextCard) return null;
    if (previousCard.id !== nextCard.id) return null;

    const previousMessages = safeArray(previousCard?.data?.messages);
    const nextMessages = safeArray(nextCard?.data?.messages);
    if (previousMessages.length === 0 || previousMessages.length !== nextMessages.length) return null;

    const previousWithoutMessages = stripCardMessages(previousCard);
    const nextWithoutMessages = stripCardMessages(nextCard);
    if (!deepEqual(previousWithoutMessages, nextWithoutMessages)) return null;

    let changedIndex = -1;
    for (let index = 0; index < previousMessages.length; index += 1) {
        if (!deepEqual(previousMessages[index], nextMessages[index])) {
            if (changedIndex !== -1) return null;
            changedIndex = index;
        }
    }

    if (changedIndex === -1) return null;

    const previousMessage = previousMessages[changedIndex];
    const nextMessage = nextMessages[changedIndex];

    if (!deepEqual(stripMessageContent(previousMessage), stripMessageContent(nextMessage))) {
        return null;
    }

    if (typeof previousMessage?.content !== 'string' || typeof nextMessage?.content !== 'string') {
        return null;
    }

    if (!nextMessage.content.startsWith(previousMessage.content)) {
        return null;
    }

    const appendedText = nextMessage.content.slice(previousMessage.content.length);
    if (!appendedText) return null;

    return {
        type: BOARD_PATCH_OP_MESSAGE_APPEND,
        cardId: String(nextCard.id),
        messageId: typeof nextMessage.id === 'string' ? nextMessage.id : '',
        messageIndex: changedIndex,
        text: appendedText
    };
};

const buildCardPatchOperations = (previousCards = [], nextCards = []) => {
    const previousCardMap = buildCardMap(previousCards);
    const nextCardMap = buildCardMap(nextCards);
    const ops = [];

    previousCards.forEach((previousCard) => {
        const cardId = String(previousCard?.id || '');
        if (!cardId) return;
        if (!nextCardMap.has(cardId)) {
            ops.push({
                type: BOARD_PATCH_OP_CARD_REMOVE,
                cardId
            });
        }
    });

    nextCards.forEach((nextCard) => {
        const cardId = String(nextCard?.id || '');
        if (!cardId) return;

        const previousCard = previousCardMap.get(cardId);
        if (!previousCard) {
            ops.push({
                type: BOARD_PATCH_OP_CARD_UPSERT,
                cardId,
                card: nextCard
            });
            return;
        }

        if (deepEqual(previousCard, nextCard)) {
            return;
        }

        const appendOp = tryBuildMessageAppendOperation(previousCard, nextCard);
        if (appendOp) {
            ops.push(appendOp);
            return;
        }

        ops.push({
            type: BOARD_PATCH_OP_CARD_UPSERT,
            cardId,
            card: nextCard
        });
    });

    return ops;
};

const isCardPatchOperation = (op) => (
    op?.type === BOARD_PATCH_OP_CARD_UPSERT ||
    op?.type === BOARD_PATCH_OP_CARD_REMOVE ||
    op?.type === BOARD_PATCH_OP_MESSAGE_APPEND
);

const isStructuralPatchOperation = (op) => (
    op?.type === BOARD_PATCH_OP_CONNECTION_UPSERT ||
    op?.type === BOARD_PATCH_OP_CONNECTION_REMOVE ||
    op?.type === BOARD_PATCH_OP_GROUP_UPSERT ||
    op?.type === BOARD_PATCH_OP_GROUP_REMOVE ||
    op?.type === BOARD_PATCH_OP_BOARD_PROMPT_UPSERT ||
    op?.type === BOARD_PATCH_OP_BOARD_PROMPT_REMOVE ||
    op?.type === BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_ENABLED ||
    op?.type === BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_ENABLED ||
    op?.type === BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_MODE ||
    op?.type === BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_SELECTION
);

const compactCardPatchOperations = (ops = []) => {
    const compacted = [];
    const upsertIndexByCard = new Map();
    const lastAppendIndexByMessage = new Map();

    ops.forEach((op) => {
        if (!op || typeof op !== 'object') return;
        const cardId = typeof op.cardId === 'string' ? op.cardId : '';
        if (!cardId) return;

        if (op.type === BOARD_PATCH_OP_CARD_UPSERT) {
            if (upsertIndexByCard.has(cardId)) {
                compacted[upsertIndexByCard.get(cardId)] = op;
            } else {
                compacted.push(op);
                upsertIndexByCard.set(cardId, compacted.length - 1);
            }
            for (const [messageKey, opIndex] of lastAppendIndexByMessage.entries()) {
                if (messageKey.startsWith(`${cardId}:`)) {
                    compacted[opIndex] = null;
                    lastAppendIndexByMessage.delete(messageKey);
                }
            }
            return;
        }

        if (op.type === BOARD_PATCH_OP_CARD_REMOVE) {
            if (upsertIndexByCard.has(cardId)) {
                compacted[upsertIndexByCard.get(cardId)] = null;
                upsertIndexByCard.delete(cardId);
            }
            for (const [messageKey, opIndex] of lastAppendIndexByMessage.entries()) {
                if (messageKey.startsWith(`${cardId}:`)) {
                    compacted[opIndex] = null;
                    lastAppendIndexByMessage.delete(messageKey);
                }
            }
            compacted.push(op);
            return;
        }

        if (op.type === BOARD_PATCH_OP_MESSAGE_APPEND) {
            if (upsertIndexByCard.has(cardId)) {
                return;
            }
            const messageKey = `${cardId}:${op.messageId || `#${op.messageIndex}`}`;
            if (lastAppendIndexByMessage.has(messageKey)) {
                const previousIndex = lastAppendIndexByMessage.get(messageKey);
                const previousOp = compacted[previousIndex];
                if (previousOp && previousOp.type === BOARD_PATCH_OP_MESSAGE_APPEND) {
                    compacted[previousIndex] = {
                        ...previousOp,
                        text: `${previousOp.text || ''}${op.text || ''}`
                    };
                    return;
                }
            }
            compacted.push(op);
            lastAppendIndexByMessage.set(messageKey, compacted.length - 1);
        }
    });

    return compacted.filter(Boolean);
};

const compactPatchOperations = (ops = []) => {
    const structuralOps = [];
    const cardOps = [];

    ops.forEach((op) => {
        if (isCardPatchOperation(op)) {
            cardOps.push(op);
            return;
        }
        if (isStructuralPatchOperation(op)) {
            structuralOps.push(op);
        }
    });

    return [...structuralOps, ...compactCardPatchOperations(cardOps)];
};

const estimateBytes = (value) => {
    try {
        return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
        return 0;
    }
};

export const buildIncrementalPatchCandidate = ({
    baseBoard,
    nextBoard,
    fromClientRevision = 0,
    toClientRevision = 0,
    updatedAt = Date.now(),
    options = {}
}) => {
    const previous = toStableDataShape(baseBoard || {});
    const next = toStableDataShape(nextBoard || {});
    const structuralOps = buildBoardStructuralPatchOperations(previous, next);
    const cardOps = buildCardPatchOperations(previous.cards, next.cards);
    const compactedOps = compactPatchOperations([...structuralOps, ...cardOps]);

    if (compactedOps.length === 0) {
        return {
            eligible: false,
            reason: 'empty_ops'
        };
    }

    const candidate = {
        kind: BOARD_PATCH_KIND,
        fromClientRevision: toSafeRevision(fromClientRevision),
        toClientRevision: toSafeRevision(toClientRevision),
        updatedAt: Number.isFinite(Number(updatedAt)) ? Number(updatedAt) : Date.now(),
        opCount: compactedOps.length,
        ops: compactedOps,
        baseContentHash: buildBoardContentHash(previous),
        contentHash: buildBoardContentHash(next)
    };

    candidate.approxBytes = estimateBytes(candidate);

    const maxPatchOps = Number.isFinite(Number(options.maxOps)) ? Number(options.maxOps) : DEFAULT_MAX_PATCH_OPS;
    const maxPatchBytes = Number.isFinite(Number(options.maxBytes)) ? Number(options.maxBytes) : DEFAULT_MAX_PATCH_BYTES;

    if (candidate.opCount > maxPatchOps) {
        return {
            eligible: false,
            reason: 'op_count_exceeded',
            opCount: candidate.opCount
        };
    }

    if (candidate.approxBytes > maxPatchBytes) {
        return {
            eligible: false,
            reason: 'patch_bytes_exceeded',
            approxBytes: candidate.approxBytes
        };
    }

    return {
        eligible: true,
        reason: 'ok',
        patch: candidate
    };
};

const applyCardUpsert = (cards, indexById, op) => {
    const nextCards = cards.slice();
    const existingIndex = indexById.get(op.cardId);
    if (existingIndex === undefined) {
        nextCards.push(op.card);
    } else {
        nextCards[existingIndex] = op.card;
    }
    return nextCards;
};

const applyCardRemove = (cards, indexById, op) => {
    const existingIndex = indexById.get(op.cardId);
    if (existingIndex === undefined) return cards;
    const nextCards = cards.slice();
    nextCards.splice(existingIndex, 1);
    return nextCards;
};

const applyMessageAppend = (cards, indexById, op) => {
    const existingIndex = indexById.get(op.cardId);
    if (existingIndex === undefined) return cards;

    const currentCard = cards[existingIndex];
    const messages = safeArray(currentCard?.data?.messages);
    if (messages.length === 0) return cards;

    let targetIndex = Number.isFinite(Number(op.messageIndex)) ? Number(op.messageIndex) : -1;
    if (targetIndex < 0 || targetIndex >= messages.length) {
        if (op.messageId) {
            targetIndex = messages.findIndex((message) => message?.id === op.messageId);
        }
    }
    if (targetIndex < 0 || targetIndex >= messages.length) return cards;

    const targetMessage = messages[targetIndex];
    if (typeof targetMessage?.content !== 'string') return cards;

    const nextCards = cards.slice();
    const nextMessages = messages.slice();
    nextMessages[targetIndex] = {
        ...targetMessage,
        content: `${targetMessage.content}${op.text || ''}`
    };
    nextCards[existingIndex] = {
        ...currentCard,
        data: {
            ...(currentCard?.data || {}),
            messages: nextMessages
        }
    };
    return nextCards;
};

export const applyIncrementalPatchToBoard = (board = {}, patch = {}) => {
    const stableBoard = toStableDataShape(board || {});
    const ops = safeArray(patch?.ops);
    if (ops.length === 0) return stableBoard;

    const structuralOps = ops.filter(isStructuralPatchOperation);
    const cardOps = ops.filter(isCardPatchOperation);
    const nextBoard = applyBoardStructuralPatchOperations(stableBoard, structuralOps);
    let nextCards = safeArray(nextBoard.cards);

    cardOps.forEach((op) => {
        if (!op || typeof op !== 'object') return;

        const indexById = new Map();
        nextCards.forEach((card, index) => {
            if (card?.id) {
                indexById.set(card.id, index);
            }
        });

        if (op.type === BOARD_PATCH_OP_CARD_UPSERT && op.card && op.cardId) {
            nextCards = applyCardUpsert(nextCards, indexById, op);
            return;
        }

        if (op.type === BOARD_PATCH_OP_CARD_REMOVE && op.cardId) {
            nextCards = applyCardRemove(nextCards, indexById, op);
            return;
        }

        if (op.type === BOARD_PATCH_OP_MESSAGE_APPEND && op.cardId) {
            nextCards = applyMessageAppend(nextCards, indexById, op);
        }
    });

    return {
        ...nextBoard,
        cards: nextCards
    };
};
