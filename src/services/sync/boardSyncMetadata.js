import { getEffectiveBoardCardCount } from '../boardTitle/metadata';
import { normalizeBoardSnapshot } from './boardSnapshot';

export const pickBoardSyncMetadata = (snapshot = {}) => {
    const normalized = normalizeBoardSnapshot(snapshot);

    return {
        updatedAt: Number(normalized.updatedAt) || 0,
        clientRevision: Number(normalized.clientRevision) || 0,
        cardCount: getEffectiveBoardCardCount(normalized.cards)
    };
};
