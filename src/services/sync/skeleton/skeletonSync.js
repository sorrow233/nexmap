import { normalizeBoardSnapshot } from '../boardSnapshot';
import { buildSkeletonSyncPayload, pickSkeletonCardFields } from './skeletonSyncProtocol';

const SKELETON_CHANGE_TYPES = new Set([
    'card_move',
    'card_add',
    'card_delete',
    'card_restore',
    'connection_change',
    'group_change',
    'canvas_line_change',
    'card_content'
]);

const SKELETON_SYNC_DELAY_MS = Object.freeze({
    card_move: 900,
    card_add: 320,
    card_delete: 320,
    card_restore: 320,
    connection_change: 420,
    group_change: 420,
    canvas_line_change: 320,
    card_content: 500
});

const mergeSkeletonCard = (currentCard, incomingCard) => {
    if (!currentCard) {
        return incomingCard;
    }

    return {
        ...currentCard,
        ...incomingCard,
        data: incomingCard?.data
            ? {
                ...(currentCard.data || {}),
                ...incomingCard.data
            }
            : currentCard.data
    };
};

export const isSkeletonSyncChangeType = (changeType = '') => SKELETON_CHANGE_TYPES.has(changeType);

export const resolveSkeletonSyncDelay = (changeType = '') => (
    SKELETON_SYNC_DELAY_MS[changeType] ?? 550
);

export const buildSkeletonSyncSnapshot = ({
    cards = [],
    connections = [],
    groups = [],
    canvasLines = [],
    boardPrompts = [],
    boardInstructionSettings,
    clientRevision = 0,
    updatedAt = 0
} = {}) => buildSkeletonSyncPayload({
    cards,
    connections,
    groups,
    canvasLines,
    boardPrompts,
    boardInstructionSettings,
    clientRevision,
    updatedAt
});

export const mergeSkeletonSnapshot = (currentSnapshot = {}, incomingSnapshot = {}) => {
    const current = normalizeBoardSnapshot(currentSnapshot);
    const incoming = normalizeBoardSnapshot(incomingSnapshot);
    const currentById = new Map(
        current.cards.map((card) => [card?.id, card])
    );
    const seenIds = new Set();

    const cards = incoming.cards.map((incomingCard) => {
        const cardId = incomingCard?.id;
        if (!cardId) {
            return incomingCard;
        }

        seenIds.add(cardId);
        return mergeSkeletonCard(currentById.get(cardId), incomingCard);
    });

    current.cards.forEach((currentCard) => {
        const cardId = currentCard?.id;
        if (!cardId || seenIds.has(cardId)) {
            return;
        }

        cards.push(currentCard);
    });

    return normalizeBoardSnapshot({
        ...current,
        cards,
        connections: incoming.connections,
        groups: incoming.groups,
        canvasLines: incoming.canvasLines,
        boardPrompts: incoming.boardPrompts,
        boardInstructionSettings: incoming.boardInstructionSettings,
        clientRevision: Math.max(
            Number(current.clientRevision) || 0,
            Number(incoming.clientRevision) || 0
        ),
        updatedAt: Math.max(
            Number(current.updatedAt) || 0,
            Number(incoming.updatedAt) || 0
        )
    });
};

export { pickSkeletonCardFields };
