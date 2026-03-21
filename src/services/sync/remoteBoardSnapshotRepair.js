import * as Y from 'yjs';
import { getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    createBoardDoc,
    syncBoardSnapshotToDoc
} from './boardYDoc';
import {
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from './boardSnapshot';
import { bytesToBase64 } from './base64';
import {
    hasRemoteCheckpoint,
    loadBoardCheckpoint,
    saveBoardCheckpoint
} from './firestoreCheckpointStore';
import { createBoardRootRef } from './firestoreSyncPaths';
import { readCheckpointPayloadSnapshot } from './checkpointCompatibility';
import { migrateLegacyRootSnapshotToCheckpoint } from './legacyCloudBoardMigration';
import { isPersistenceSnapshotNewer } from '../boardPersistence/persistenceCursor';

const getActiveCardCount = (snapshot = {}) => {
    const cards = Array.isArray(snapshot?.cards) ? snapshot.cards : [];
    return cards.filter((card) => card && !card.deletedAt).length;
};

const readRemoteSnapshotFromCheckpoint = async ({ userId, boardId, rootData }) => {
    if (!hasRemoteCheckpoint(rootData)) {
        return null;
    }

    const checkpoint = await loadBoardCheckpoint({
        userId,
        boardId,
        rootData
    });

    if (!checkpoint?.updateBase64) {
        return null;
    }

    return readCheckpointPayloadSnapshot({
        updateBase64: checkpoint.updateBase64,
        rootData
    })?.snapshot || null;
};

export const repairRemoteBoardSnapshotIfLocalNewer = async ({
    userId,
    boardId,
    deviceId,
    localSnapshot,
    expectedCardCount
}) => {
    if (!db || !userId || !boardId || !deviceId) {
        return { repaired: false, reason: 'disabled' };
    }

    const normalizedLocalSnapshot = normalizeBoardSnapshot(localSnapshot);
    if (isMeaningfullyEmptyBoardSnapshot(normalizedLocalSnapshot)) {
        return { repaired: false, reason: 'local_empty' };
    }

    const rootRef = createBoardRootRef(userId, boardId);
    let rootData = (await getDoc(rootRef)).data();

    if (!hasRemoteCheckpoint(rootData)) {
        const migratedCheckpoint = await migrateLegacyRootSnapshotToCheckpoint({
            userId,
            boardId,
            deviceId,
            rootData
        });

        if (migratedCheckpoint) {
            rootData = (await getDoc(rootRef)).data();
        }
    }

    const remoteSnapshot = await readRemoteSnapshotFromCheckpoint({
        userId,
        boardId,
        rootData
    });

    const localActiveCardCount = getActiveCardCount(normalizedLocalSnapshot);
    const remoteActiveCardCount = getActiveCardCount(remoteSnapshot);
    const safeExpectedCardCount = Number(expectedCardCount) || 0;
    const localMatchesExpected = safeExpectedCardCount <= 0 || localActiveCardCount >= safeExpectedCardCount;
    const remoteLagsCardCount = safeExpectedCardCount > 0 && remoteActiveCardCount < safeExpectedCardCount;
    const remoteHasFewerCards = remoteSnapshot && localActiveCardCount > remoteActiveCardCount;

    if (
        remoteSnapshot &&
        !remoteLagsCardCount &&
        !remoteHasFewerCards &&
        !isPersistenceSnapshotNewer(normalizedLocalSnapshot, remoteSnapshot)
    ) {
        return { repaired: false, reason: 'remote_up_to_date' };
    }

    if (safeExpectedCardCount > 0 && !localMatchesExpected) {
        return { repaired: false, reason: 'local_snapshot_incomplete' };
    }

    const tempDoc = createBoardDoc();
    try {
        syncBoardSnapshotToDoc(tempDoc, normalizedLocalSnapshot);
        const checkpoint = await saveBoardCheckpoint({
            userId,
            boardId,
            deviceId,
            updateBase64: bytesToBase64(Y.encodeStateAsUpdate(tempDoc)),
            cleanupStale: true,
            reason: remoteSnapshot
                ? (remoteLagsCardCount || remoteHasFewerCards
                    ? 'local_snapshot_cardcount_repair'
                    : 'local_snapshot_repair')
                : 'local_snapshot_seed'
        });

        return {
            repaired: Boolean(checkpoint),
            reason: remoteSnapshot
                ? (remoteLagsCardCount || remoteHasFewerCards ? 'remote_missing_cards' : 'local_newer')
                : 'remote_empty'
        };
    } finally {
        tempDoc.destroy();
    }
};
