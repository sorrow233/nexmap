import {
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from './boardSnapshot';
import { isPersistenceSnapshotNewer } from '../boardPersistence/persistenceCursor';

const getActiveCardCount = (snapshot = {}) => {
    const cards = Array.isArray(snapshot?.cards) ? snapshot.cards : [];
    return cards.filter((card) => card && !card.deletedAt).length;
};

const toSafeNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

export const planDeferredRemoteCheckpointRepair = ({
    localSnapshot,
    remoteMetadata = {},
    expectedCardCount = 0
}) => {
    const normalizedLocalSnapshot = normalizeBoardSnapshot(localSnapshot);
    if (isMeaningfullyEmptyBoardSnapshot(normalizedLocalSnapshot)) {
        return { shouldRepair: false, reason: 'local_empty' };
    }

    if (!remoteMetadata?.hasCheckpoint) {
        return { shouldRepair: false, reason: 'remote_empty' };
    }

    const safeExpectedCardCount = toSafeNumber(expectedCardCount);
    const localActiveCardCount = getActiveCardCount(normalizedLocalSnapshot);
    if (safeExpectedCardCount > 0 && localActiveCardCount < safeExpectedCardCount) {
        return { shouldRepair: false, reason: 'local_snapshot_incomplete' };
    }

    const remoteActiveCardCount = toSafeNumber(remoteMetadata.cardCount);
    const remoteRecoveredFromCompatibility = Boolean(remoteMetadata.recoveredFromCompatibility);
    const remoteMissingExpectedCards = (
        safeExpectedCardCount > 0 && remoteActiveCardCount < safeExpectedCardCount
    );
    const remoteHasFewerCards = localActiveCardCount > remoteActiveCardCount;
    const localCursorIsNewer = isPersistenceSnapshotNewer(normalizedLocalSnapshot, {
        updatedAt: remoteMetadata.updatedAt,
        clientRevision: remoteMetadata.clientRevision
    });

    if (remoteRecoveredFromCompatibility) {
        return {
            shouldRepair: true,
            reason: 'checkpoint_decode_repair'
        };
    }

    if (remoteMissingExpectedCards || remoteHasFewerCards) {
        return {
            shouldRepair: true,
            reason: 'local_snapshot_cardcount_repair'
        };
    }

    if (localCursorIsNewer) {
        return {
            shouldRepair: true,
            reason: 'local_snapshot_repair'
        };
    }

    return { shouldRepair: false, reason: 'remote_up_to_date' };
};
