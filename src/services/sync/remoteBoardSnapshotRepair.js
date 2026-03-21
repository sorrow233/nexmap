import * as Y from 'yjs';
import { getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    createBoardDoc,
    readBoardSnapshotFromDoc,
    syncBoardSnapshotToDoc
} from './boardYDoc';
import {
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from './boardSnapshot';
import { base64ToBytes, bytesToBase64 } from './base64';
import {
    hasRemoteCheckpoint,
    loadBoardCheckpoint,
    saveBoardCheckpoint
} from './firestoreCheckpointStore';
import { createBoardRootRef } from './firestoreSyncPaths';
import { migrateLegacyRootSnapshotToCheckpoint } from './legacyCloudBoardMigration';
import { isPersistenceSnapshotNewer } from '../boardPersistence/persistenceCursor';

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

    const tempDoc = createBoardDoc();
    try {
        Y.applyUpdate(tempDoc, base64ToBytes(checkpoint.updateBase64));
        return readBoardSnapshotFromDoc(tempDoc);
    } finally {
        tempDoc.destroy();
    }
};

export const repairRemoteBoardSnapshotIfLocalNewer = async ({
    userId,
    boardId,
    deviceId,
    localSnapshot
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

    if (remoteSnapshot && !isPersistenceSnapshotNewer(normalizedLocalSnapshot, remoteSnapshot)) {
        return { repaired: false, reason: 'remote_up_to_date' };
    }

    const tempDoc = createBoardDoc();
    try {
        syncBoardSnapshotToDoc(tempDoc, normalizedLocalSnapshot);
        const checkpoint = await saveBoardCheckpoint({
            userId,
            boardId,
            deviceId,
            updateBase64: bytesToBase64(Y.encodeStateAsUpdate(tempDoc)),
            reason: remoteSnapshot ? 'local_snapshot_repair' : 'local_snapshot_seed'
        });

        return {
            repaired: Boolean(checkpoint),
            reason: remoteSnapshot ? 'local_newer' : 'remote_empty'
        };
    } finally {
        tempDoc.destroy();
    }
};
