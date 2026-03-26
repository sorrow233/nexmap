import {
    createBoardSnapshotFingerprint,
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from '../boardSnapshot';
import { mergeBodySnapshot } from '../body/bodySync';
import { protectHighValueCardContent } from '../highValueCardContentGuard';
import { mergeSkeletonSnapshot } from '../skeleton/skeletonSync';
import {
    canIncomingCardRetireCurrent,
    getCardDeletedAt,
    getCardId,
    getCardUpdatedAt,
    isIncomingSnapshotNewer,
    normalizeSnapshotForRules,
    shouldRejectEmptySnapshotOverwrite
} from './syncRules';

const getCardMessages = (card) => (
    Array.isArray(card?.data?.messages) ? card.data.messages : []
);

const getCardConversationTurnCount = (card) => (
    getCardMessages(card).reduce((count, message) => (
        message?.role === 'user' ? count + 1 : count
    ), 0)
);

const getCardMessageCount = (card) => getCardMessages(card).length;

const getMessageTextLength = (content) => {
    if (typeof content === 'string') return content.length;
    if (!Array.isArray(content)) return 0;

    return content.reduce((total, part) => {
        if (part?.type === 'text' && typeof part.text === 'string') {
            return total + part.text.length;
        }
        return total;
    }, 0);
};

const getCardConversationTextLength = (card) => (
    getCardMessages(card).reduce((total, message) => (
        total + getMessageTextLength(message?.content)
    ), 0)
);

export const shouldPreferIncomingCard = (currentCard, incomingCard) => {
    if (!currentCard) return true;

    const currentDeletedAt = getCardDeletedAt(currentCard);
    const incomingDeletedAt = getCardDeletedAt(incomingCard);
    if (currentDeletedAt !== incomingDeletedAt) {
        return canIncomingCardRetireCurrent(currentCard, incomingCard);
    }

    if (currentDeletedAt === 0 && incomingDeletedAt === 0) {
        const currentTurnCount = getCardConversationTurnCount(currentCard);
        const incomingTurnCount = getCardConversationTurnCount(incomingCard);
        if (currentTurnCount !== incomingTurnCount) {
            return incomingTurnCount > currentTurnCount;
        }

        const currentMessageCount = getCardMessageCount(currentCard);
        const incomingMessageCount = getCardMessageCount(incomingCard);
        if (currentMessageCount !== incomingMessageCount) {
            return incomingMessageCount > currentMessageCount;
        }

        const currentConversationTextLength = getCardConversationTextLength(currentCard);
        const incomingConversationTextLength = getCardConversationTextLength(incomingCard);
        if (currentConversationTextLength !== incomingConversationTextLength) {
            return incomingConversationTextLength >= currentConversationTextLength;
        }
    }

    return getCardUpdatedAt(incomingCard) >= getCardUpdatedAt(currentCard);
};

export const mergeCardSnapshotsWithReport = (currentCards = [], incomingCards = []) => {
    const currentById = new Map();
    currentCards.forEach((card) => {
        const cardId = getCardId(card);
        if (cardId) {
            currentById.set(cardId, card);
        }
    });

    const seenIds = new Set();
    const preservedCurrentCardIds = [];
    const mergedCards = incomingCards.map((incomingCard) => {
        const cardId = getCardId(incomingCard);
        if (!cardId) {
            return incomingCard;
        }

        seenIds.add(cardId);
        const currentCard = currentById.get(cardId);
        const protectedIncomingCard = protectHighValueCardContent(currentCard, incomingCard);
        const selectedCard = shouldPreferIncomingCard(currentCard, protectedIncomingCard)
            ? protectedIncomingCard
            : currentCard;

        if (selectedCard === currentCard && currentCard) {
            preservedCurrentCardIds.push(cardId);
        }

        return selectedCard;
    });

    currentCards.forEach((currentCard) => {
        const cardId = getCardId(currentCard);
        if (!cardId || seenIds.has(cardId)) {
            return;
        }

        preservedCurrentCardIds.push(cardId);
        mergedCards.push(currentCard);
    });

    return {
        cards: mergedCards,
        preservedCurrentCardIds: Array.from(new Set(preservedCurrentCardIds))
    };
};

export const mergeCardSnapshots = (currentCards = [], incomingCards = []) => (
    mergeCardSnapshotsWithReport(currentCards, incomingCards).cards
);

export const mergeBoardSnapshotsConservatively = (currentSnapshot = {}, incomingSnapshot = {}) => {
    const normalizedCurrent = normalizeSnapshotForRules(currentSnapshot);
    const normalizedIncoming = normalizeSnapshotForRules(incomingSnapshot);
    const mergedCardsResult = mergeCardSnapshotsWithReport(
        normalizedCurrent.cards,
        normalizedIncoming.cards
    );

    return {
        snapshot: normalizeBoardSnapshot({
            ...normalizedIncoming,
            cards: mergedCardsResult.cards,
            updatedAt: Math.max(
                Number(normalizedCurrent.updatedAt) || 0,
                Number(normalizedIncoming.updatedAt) || 0
            ),
            clientRevision: Math.max(
                Number(normalizedCurrent.clientRevision) || 0,
                Number(normalizedIncoming.clientRevision) || 0
            )
        }),
        preservedCurrentCardIds: mergedCardsResult.preservedCurrentCardIds,
        preservedCollections: []
    };
};

export const resolveLocalSnapshotForDoc = ({
    currentSnapshot,
    incomingSnapshot
} = {}) => {
    const normalizedCurrent = normalizeSnapshotForRules(currentSnapshot);
    const normalizedIncoming = normalizeSnapshotForRules(incomingSnapshot);

    if (shouldRejectEmptySnapshotOverwrite({
        currentSnapshot: normalizedCurrent,
        incomingSnapshot: normalizedIncoming
    })) {
        return {
            action: 'reject',
            reason: 'incoming_empty_cannot_overwrite_non_empty',
            snapshot: normalizedCurrent
        };
    }

    if (
        !isMeaningfullyEmptyBoardSnapshot(normalizedCurrent)
        && !isIncomingSnapshotNewer(normalizedIncoming, normalizedCurrent)
    ) {
        return {
            action: 'reject',
            reason: 'incoming_not_newer',
            snapshot: normalizedCurrent
        };
    }

    return {
        action: createBoardSnapshotFingerprint(normalizedCurrent) === createBoardSnapshotFingerprint(normalizedIncoming)
            ? 'noop'
            : 'apply',
        reason: 'apply_local_snapshot',
        snapshot: normalizedIncoming
    };
};

export const resolveCheckpointSnapshotForDoc = ({
    currentSnapshot,
    incomingSnapshot
} = {}) => {
    const normalizedCurrent = normalizeSnapshotForRules(currentSnapshot);
    const normalizedIncoming = normalizeSnapshotForRules(incomingSnapshot);

    if (shouldRejectEmptySnapshotOverwrite({
        currentSnapshot: normalizedCurrent,
        incomingSnapshot: normalizedIncoming
    })) {
        return {
            action: 'reject',
            reason: 'incoming_empty_cannot_overwrite_non_empty',
            snapshot: normalizedCurrent,
            shouldRepairRemote: true,
            preservedCurrentCardIds: [],
            preservedCollections: []
        };
    }

    if (
        !isMeaningfullyEmptyBoardSnapshot(normalizedCurrent)
        && !isIncomingSnapshotNewer(normalizedIncoming, normalizedCurrent)
    ) {
        return {
            action: 'reject',
            reason: 'incoming_not_newer',
            snapshot: normalizedCurrent,
            shouldRepairRemote: createBoardSnapshotFingerprint(normalizedCurrent) !== createBoardSnapshotFingerprint(normalizedIncoming),
            preservedCurrentCardIds: [],
            preservedCollections: []
        };
    }

    const mergedResult = mergeBoardSnapshotsConservatively(normalizedCurrent, normalizedIncoming);
    const changed = createBoardSnapshotFingerprint(normalizedCurrent) !== createBoardSnapshotFingerprint(mergedResult.snapshot);
    const shouldRepairRemote = mergedResult.preservedCurrentCardIds.length > 0;

    return {
        action: changed ? 'apply' : 'noop',
        reason: changed ? 'apply_remote_checkpoint' : 'remote_checkpoint_noop',
        snapshot: mergedResult.snapshot,
        shouldRepairRemote,
        preservedCurrentCardIds: mergedResult.preservedCurrentCardIds,
        preservedCollections: mergedResult.preservedCollections
    };
};

export const resolveRemoteSnapshotForStore = ({
    currentSnapshot,
    incomingSnapshot,
    currentCursor,
    localDirty = false
} = {}) => {
    const normalizedCurrent = normalizeSnapshotForRules(currentSnapshot);
    const normalizedIncoming = normalizeSnapshotForRules(incomingSnapshot);

    if (localDirty) {
        return {
            action: 'defer',
            reason: 'local_dirty',
            snapshot: normalizedIncoming
        };
    }

    if (shouldRejectEmptySnapshotOverwrite({
        currentSnapshot: normalizedCurrent,
        incomingSnapshot: normalizedIncoming
    })) {
        return {
            action: 'reject',
            reason: 'incoming_empty_cannot_overwrite_non_empty',
            snapshot: normalizedCurrent
        };
    }

    if (isMeaningfullyEmptyBoardSnapshot(normalizedCurrent)) {
        return {
            action: createBoardSnapshotFingerprint(normalizedCurrent) === createBoardSnapshotFingerprint(normalizedIncoming)
                ? 'noop'
                : 'apply',
            reason: 'apply_into_empty_store',
            snapshot: normalizedIncoming
        };
    }

    if (!isIncomingSnapshotNewer(normalizedIncoming, currentCursor || normalizedCurrent)) {
        return {
            action: 'reject',
            reason: 'incoming_not_newer',
            snapshot: normalizedCurrent
        };
    }

    const mergedResult = mergeBoardSnapshotsConservatively(normalizedCurrent, normalizedIncoming);
    return {
        action: createBoardSnapshotFingerprint(normalizedCurrent) === createBoardSnapshotFingerprint(mergedResult.snapshot)
            ? 'noop'
            : 'apply',
        reason: 'apply_remote_snapshot',
        snapshot: mergedResult.snapshot
    };
};

const resolveRemoteLaneSnapshotForStore = ({
    currentSnapshot,
    incomingSnapshot,
    localDirty = false,
    mergeSnapshot,
    applyReason = 'apply_remote_lane_snapshot'
} = {}) => {
    const normalizedCurrent = normalizeSnapshotForRules(currentSnapshot);
    const normalizedIncoming = normalizeSnapshotForRules(incomingSnapshot);
    const mergedSnapshot = mergeSnapshot(normalizedCurrent, normalizedIncoming);

    if (localDirty) {
        return {
            action: 'defer',
            reason: 'local_dirty',
            snapshot: mergedSnapshot
        };
    }

    if (shouldRejectEmptySnapshotOverwrite({
        currentSnapshot: normalizedCurrent,
        incomingSnapshot: mergedSnapshot
    })) {
        return {
            action: 'reject',
            reason: 'incoming_empty_cannot_overwrite_non_empty',
            snapshot: normalizedCurrent
        };
    }

    return {
        action: createBoardSnapshotFingerprint(normalizedCurrent) === createBoardSnapshotFingerprint(mergedSnapshot)
            ? 'noop'
            : 'apply',
        reason: applyReason,
        snapshot: mergedSnapshot
    };
};

export const resolveRemoteSkeletonSnapshotForStore = (options = {}) => resolveRemoteLaneSnapshotForStore({
    ...options,
    mergeSnapshot: mergeSkeletonSnapshot,
    applyReason: 'apply_remote_skeleton_snapshot'
});

export const resolveRemoteBodySnapshotForStore = (options = {}) => resolveRemoteLaneSnapshotForStore({
    ...options,
    mergeSnapshot: mergeBodySnapshot,
    applyReason: 'apply_remote_body_snapshot'
});
