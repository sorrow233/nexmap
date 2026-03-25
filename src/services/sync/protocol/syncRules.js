import {
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from '../boardSnapshot';
import { isPersistenceSnapshotNewer } from '../../boardPersistence/persistenceCursor';

const toSafePositiveNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

export const getCardId = (card) => (
    card && typeof card === 'object' && typeof card.id === 'string' && card.id.trim()
        ? card.id.trim()
        : ''
);

export const getCardDeletedAt = (card) => toSafePositiveNumber(card?.deletedAt);

export const getCardUpdatedAt = (card) => {
    const updatedAt = toSafePositiveNumber(card?.updatedAt);
    if (updatedAt > 0) {
        return updatedAt;
    }

    return toSafePositiveNumber(card?.createdAt);
};

export const hasExplicitCardTombstone = (card) => getCardDeletedAt(card) > 0;

export const canIncomingCardRetireCurrent = (currentCard, incomingCard) => (
    getCardDeletedAt(incomingCard) > getCardDeletedAt(currentCard)
);

export const shouldRejectEmptySnapshotOverwrite = ({
    currentSnapshot,
    incomingSnapshot
} = {}) => (
    !isMeaningfullyEmptyBoardSnapshot(normalizeBoardSnapshot(currentSnapshot))
    && isMeaningfullyEmptyBoardSnapshot(normalizeBoardSnapshot(incomingSnapshot))
);

export const isIncomingSnapshotNewer = (incomingSnapshot, currentSnapshotOrCursor) => (
    isPersistenceSnapshotNewer(
        normalizeBoardSnapshot(incomingSnapshot),
        currentSnapshotOrCursor
    )
);

export const shouldPreserveNonEmptyCollection = (currentCollection = [], incomingCollection = []) => (
    Array.isArray(currentCollection)
    && currentCollection.length > 0
    && Array.isArray(incomingCollection)
    && incomingCollection.length === 0
);

export const normalizeSnapshotForRules = (snapshot = {}) => normalizeBoardSnapshot(snapshot);
