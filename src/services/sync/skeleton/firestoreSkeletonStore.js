import { serverTimestamp, setDoc } from 'firebase/firestore';
import { pickBoardSyncMetadata } from '../boardSyncMetadata';
import { createBoardRootRef } from '../firestoreSyncPaths';
import { buildAuthoritativeRootPayload } from '../firestoreRootDocument';
import {
    buildSkeletonSyncPayload,
    hasRemoteSkeletonPayload,
    readSkeletonSnapshotFromRoot
} from './skeletonSyncProtocol';

export const hasRemoteBoardSkeleton = (rootData = {}) => hasRemoteSkeletonPayload(rootData);

export const loadBoardSkeletonFromRoot = (rootData = {}) => readSkeletonSnapshotFromRoot(rootData);

export const saveBoardSkeleton = async ({
    userId,
    boardId,
    deviceId,
    snapshot = {},
    reason = 'skeleton_sync'
} = {}) => {
    if (!userId || !boardId) {
        return null;
    }

    const skeletonSnapshot = buildSkeletonSyncPayload(snapshot);
    const savedAtMs = Date.now();

    await setDoc(createBoardRootRef(userId, boardId), {
        ...buildAuthoritativeRootPayload({
            id: boardId,
            ...pickBoardSyncMetadata(skeletonSnapshot),
            skeleton: skeletonSnapshot,
            skeletonSavedAtMs: savedAtMs,
            skeletonReason: reason,
            syncTouchedAtMs: savedAtMs,
            serverUpdatedAt: serverTimestamp(),
            lastDeviceId: deviceId
        })
    }, { merge: true });

    return {
        savedAtMs,
        skeletonSnapshot
    };
};
