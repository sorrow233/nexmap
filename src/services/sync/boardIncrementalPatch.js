import { buildBoardContentHash } from '../boardPersistence/boardContentHash';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';

export const BOARD_PATCH_KIND = 'cards_patch_v1';
export const BOARD_PATCH_OP_CARD_UPSERT = 'card_upsert';
export const BOARD_PATCH_OP_CARD_REMOVE = 'card_remove';
export const BOARD_PATCH_OP_MESSAGE_APPEND = 'message_append';

const MAX_PATCH_OPS = 96;
const MAX_PATCH_BYTES = 280 * 1024;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const toSafeRevision = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : 0;
};

const toStableDataShape = (board = {}) => ({
    cards: safeArray(board.cards),
    connections: safeArray(board.connections),
    groups: safeArray(board.groups),
    boardPrompts: safeArray(board.boardPrompts),
    boardInstructionSettings: normalizeBoardInstructionSettings(
        board.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});

const isObject = (value) => value !== null && typeof value === 'object';

const deepEqual = (left, right) => {
    if (left === right) return true;
    if (!isObject(left) || !isObject(right)) return false;

    const leftIsArray = Array.isArray(left);
    const rightIsArray = Array.isArray(right);
    if (leftIsArray !== rightIsArray) return false;

    if (leftIsArray && rightIsArray) {
        if (left.length !== right.length) return false;
        for (let index = 0; index < left.length; index += 1) {
            if (!deepEqual(left[index], right[index])) return false;
        }
        return true;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;

    for (const key of leftKeys) {
        if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
        if (!deepEqual(left[key], right[key])) return false;
    }

    return true;
};

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

const compactPatchOperations = (ops = []) => {
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
    updatedAt = Date.now()
}) => {
    const previous = toStableDataShape(baseBoard || {});
    const next = toStableDataShape(nextBoard || {});

    if (
        !deepEqual(previous.connections, next.connections) ||
        !deepEqual(previous.groups, next.groups) ||
        !deepEqual(previous.boardPrompts, next.boardPrompts) ||
        !deepEqual(previous.boardInstructionSettings, next.boardInstructionSettings)
    ) {
        return {
            eligible: false,
            reason: 'non_card_structure_changed'
        };
    }

    const previousCards = safeArray(previous.cards);
    const nextCards = safeArray(next.cards);
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

    const compactedOps = compactPatchOperations(ops);
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

    if (candidate.opCount > MAX_PATCH_OPS) {
        return {
            eligible: false,
            reason: 'op_count_exceeded',
            opCount: candidate.opCount
        };
    }

    if (candidate.approxBytes > MAX_PATCH_BYTES) {
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

    let nextCards = safeArray(stableBoard.cards);

    ops.forEach((op) => {
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
        ...stableBoard,
        cards: nextCards
    };
};
