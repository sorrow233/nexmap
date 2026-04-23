import { getEffectiveBoardCardCount } from '../boardTitle/metadata';

export const pickBoardSyncMetadata = (snapshot = {}) => {
    const cards = Array.isArray(snapshot.cards) ? snapshot.cards : [];

    return {
        updatedAt: Number(snapshot.updatedAt) || 0,
        clientRevision: Number(snapshot.clientRevision) || 0,
        cardCount: getEffectiveBoardCardCount(cards)
    };
};
