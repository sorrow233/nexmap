import {
    cloneSerializable,
    normalizeBoardSnapshot
} from '../boardSnapshot';

const BODY_DATA_FIELDS = new Set([
    'messages',
    'content',
    'image',
    'text',
    'runtimeBodyState'
]);

export const pickSkeletonCardFields = (card = {}) => {
    if (!card || typeof card !== 'object') return card;

    const nextCard = cloneSerializable(card);
    const nextData = Object.entries(card.data || {}).reduce((accumulator, [key, value]) => {
        if (BODY_DATA_FIELDS.has(key)) {
            return accumulator;
        }
        accumulator[key] = cloneSerializable(value);
        return accumulator;
    }, {});

    if (Object.keys(nextData).length > 0) {
        nextCard.data = nextData;
    } else {
        delete nextCard.data;
    }

    return nextCard;
};

export const buildSkeletonCards = (cards = []) => (
    Array.isArray(cards) ? cards.map((card) => pickSkeletonCardFields(card)) : []
);

export const buildSkeletonSyncPayload = ({
    cards = [],
    connections = [],
    groups = [],
    boardPrompts = [],
    boardInstructionSettings,
    clientRevision = 0,
    updatedAt = 0
} = {}) => normalizeBoardSnapshot({
    cards: buildSkeletonCards(cards),
    connections,
    groups,
    boardPrompts,
    boardInstructionSettings,
    clientRevision,
    updatedAt
});

export const hasRemoteSkeletonPayload = (rootData = {}) => (
    Boolean(rootData?.skeleton && typeof rootData.skeleton === 'object')
);

export const readSkeletonSnapshotFromRoot = (rootData = {}) => (
    buildSkeletonSyncPayload(rootData?.skeleton || {})
);
