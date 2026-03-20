import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    where,
    writeBatch
} from 'firebase/firestore';
import { debugLog } from '../../utils/debugLogger';
import { toSafeClientRevision } from '../boardPersistence/persistenceCursor';
import {
    buildPatchDocumentId,
    buildSyncMutationMetadata,
    getMutationSequence,
    normalizeSyncMutationMetadata
} from './boardSyncProtocol';
import { db } from './core';

const PATCHES_COLLECTION = 'patches';
const PATCH_LISTENER_LIMIT = 240;
const PATCH_GC_BATCH_SIZE = 300;
const PATCH_HISTORY_KEEP_COUNT = 240;
const MAX_PATCH_BYTES = 300 * 1024;
export const PATCH_CHECKPOINT_PATCH_LIMIT = 30;
export const PATCH_CHECKPOINT_MAX_AGE_MS = 10 * 60 * 1000;

const toSafeInt = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : fallback;
};

const estimateBytes = (value) => {
    try {
        return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
        return 0;
    }
};

const getBoardPatchesCollectionRef = (userId, boardId) => (
    collection(db, 'users', userId, 'boards', boardId, PATCHES_COLLECTION)
);

const normalizePatchPayload = (patch = {}) => {
    const ops = Array.isArray(patch.ops) ? patch.ops : [];
    const syncMetadata = normalizeSyncMutationMetadata(patch.syncMetadata || patch);
    const mutationSequence = getMutationSequence(patch);

    return {
        kind: typeof patch.kind === 'string' ? patch.kind : 'board_patch_v2',
        fromClientRevision: toSafeInt(patch.fromClientRevision),
        toClientRevision: toSafeInt(patch.toClientRevision),
        updatedAt: toSafeInt(patch.updatedAt, Date.now()),
        opCount: toSafeInt(patch.opCount, ops.length),
        ops,
        baseContentHash: typeof patch.baseContentHash === 'string' ? patch.baseContentHash : '',
        contentHash: typeof patch.contentHash === 'string' ? patch.contentHash : '',
        syncProtocolVersion: syncMetadata.syncProtocolVersion,
        mutationActorId: syncMetadata.mutationActorId,
        mutationOpId: syncMetadata.mutationOpId,
        mutationLamport: syncMetadata.mutationLamport,
        ackedClientRevision: Math.max(syncMetadata.ackedClientRevision, toSafeInt(patch.fromClientRevision)),
        ackedLamport: syncMetadata.ackedLamport,
        pendingOperationCount: syncMetadata.pendingOperationCount,
        mutationSequence,
        createdAtMs: toSafeInt(patch.createdAtMs, Date.now())
    };
};

const shouldFallbackToSnapshot = ({
    remoteContentHash = '',
    baseContentHash = '',
    remoteClientRevision = 0,
    baseClientRevision = 0
}) => (
    Boolean(remoteContentHash) &&
    Boolean(baseContentHash) &&
    remoteContentHash !== baseContentHash &&
    remoteClientRevision > baseClientRevision
);

const resolveCheckpointUpdatedAt = (remoteBoard = {}) => {
    const checkpointUpdatedAt = toSafeInt(remoteBoard?.checkpointUpdatedAt);
    if (checkpointUpdatedAt > 0) return checkpointUpdatedAt;
    return toSafeInt(remoteBoard?.updatedAt);
};

const cleanupStaleBoardPatches = async ({ userId, boardId, keepCount = PATCH_HISTORY_KEEP_COUNT }) => {
    if (!db || !userId || !boardId) return;

    const patchesRef = getBoardPatchesCollectionRef(userId, boardId);
    const headSnap = await getDocs(
        query(
            patchesRef,
            orderBy('sequence', 'desc'),
            limit(Math.max(1, toSafeInt(keepCount, PATCH_HISTORY_KEEP_COUNT)))
        )
    );

    if (headSnap.empty) return;

    const floorSequence = headSnap.docs.reduce((minSequence, docSnap) => (
        Math.min(minSequence, toSafeInt(docSnap.data()?.sequence, Number.MAX_SAFE_INTEGER))
    ), Number.MAX_SAFE_INTEGER);

    if (!Number.isFinite(floorSequence) || floorSequence <= 0) return;

    while (true) {
        const staleSnap = await getDocs(
            query(
                patchesRef,
                where('sequence', '<', floorSequence),
                orderBy('sequence', 'asc'),
                limit(PATCH_GC_BATCH_SIZE)
            )
        );

        if (staleSnap.empty) break;

        const batch = writeBatch(db);
        staleSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();

        if (staleSnap.docs.length < PATCH_GC_BATCH_SIZE) {
            break;
        }
    }
};

export const cleanupBoardPatchesHistory = async ({
    userId,
    boardId,
    keepCount = PATCH_HISTORY_KEEP_COUNT
}) => cleanupStaleBoardPatches({ userId, boardId, keepCount });

export const persistBoardIncrementalPatch = async ({
    userId,
    boardId,
    patch
}) => {
    if (!db || !userId || !boardId || !patch) {
        return {
            applied: false,
            fallbackToSnapshot: true,
            reason: 'invalid_input'
        };
    }

    const normalizedPatch = normalizePatchPayload(patch);
    if (!Array.isArray(normalizedPatch.ops) || normalizedPatch.ops.length === 0) {
        return {
            applied: false,
            fallbackToSnapshot: true,
            reason: 'empty_patch_ops'
        };
    }

    const approxBytes = estimateBytes(normalizedPatch);
    if (approxBytes > MAX_PATCH_BYTES) {
        return {
            applied: false,
            fallbackToSnapshot: true,
            reason: 'patch_payload_too_large',
            approxBytes
        };
    }

    const boardRef = doc(db, 'users', userId, 'boards', boardId);
    const patchDocId = buildPatchDocumentId(normalizedPatch);
    const patchDocRef = doc(getBoardPatchesCollectionRef(userId, boardId), patchDocId);

    const transactionResult = await runTransaction(db, async (transaction) => {
        const [boardSnap, patchSnap] = await Promise.all([
            transaction.get(boardRef),
            transaction.get(patchDocRef)
        ]);

        if (!boardSnap.exists()) {
            return {
                applied: false,
                fallbackToSnapshot: true,
                reason: 'board_missing'
            };
        }

        if (patchSnap.exists()) {
            const existingPatch = normalizePatchPayload(patchSnap.data() || {});
            return {
                applied: true,
                deduped: true,
                fallbackToSnapshot: false,
                reason: 'patch_already_exists',
                patchDocId,
                mutationSequence: getMutationSequence(existingPatch),
                syncMetadata: buildSyncMutationMetadata(existingPatch)
            };
        }

        const remoteBoard = boardSnap.data() || {};
        const remoteContentHash = typeof remoteBoard.contentHash === 'string' ? remoteBoard.contentHash : '';
        const remoteClientRevision = Math.max(
            toSafeClientRevision(remoteBoard.clientRevision),
            toSafeInt(remoteBoard.patchHeadClientRevision)
        );
        const remotePatchSinceCheckpoint = toSafeInt(remoteBoard.patchSinceCheckpoint);
        const nextPatchSinceCheckpoint = remotePatchSinceCheckpoint + 1;
        const checkpointUpdatedAt = resolveCheckpointUpdatedAt(remoteBoard);
        const checkpointAgeMs = checkpointUpdatedAt > 0
            ? Math.max(0, Date.now() - checkpointUpdatedAt)
            : Number.MAX_SAFE_INTEGER;
        const remoteMutationSequence = Math.max(
            getMutationSequence(remoteBoard),
            toSafeInt(remoteBoard.patchHeadSequence)
        );
        const nextMutationSequence = remoteMutationSequence + 1;

        if (shouldFallbackToSnapshot({
            remoteContentHash,
            baseContentHash: normalizedPatch.baseContentHash,
            remoteClientRevision,
            baseClientRevision: normalizedPatch.fromClientRevision
        })) {
            return {
                applied: false,
                fallbackToSnapshot: true,
                reason: 'remote_diverged',
                remoteClientRevision,
                mutationSequence: remoteMutationSequence
            };
        }

        if (
            nextPatchSinceCheckpoint >= PATCH_CHECKPOINT_PATCH_LIMIT ||
            checkpointAgeMs >= PATCH_CHECKPOINT_MAX_AGE_MS
        ) {
            return {
                applied: false,
                fallbackToSnapshot: true,
                reason: 'checkpoint_due',
                nextPatchSinceCheckpoint,
                checkpointAgeMs,
                mutationSequence: remoteMutationSequence
            };
        }

        const patchSyncMetadata = buildSyncMutationMetadata({
            ...normalizedPatch,
            mutationSequence: nextMutationSequence,
            createdAtMs: Date.now()
        });

        transaction.set(patchDocRef, {
            ...normalizedPatch,
            ...patchSyncMetadata,
            approxBytes,
            sequence: nextMutationSequence,
            mutationSequence: nextMutationSequence,
            createdAt: serverTimestamp(),
            createdAtMs: patchSyncMetadata.createdAtMs
        });

        transaction.set(boardRef, {
            contentHash: normalizedPatch.contentHash || remoteContentHash || '',
            patchHeadClientRevision: normalizedPatch.toClientRevision,
            patchUpdatedAt: normalizedPatch.updatedAt,
            patchOpCount: normalizedPatch.opCount,
            patchSinceCheckpoint: nextPatchSinceCheckpoint,
            patchHeadSequence: nextMutationSequence,
            mutationSequence: nextMutationSequence,
            ...patchSyncMetadata
        }, { merge: true });

        return {
            applied: true,
            fallbackToSnapshot: false,
            reason: 'patch_applied',
            patchDocId,
            mutationSequence: nextMutationSequence,
            syncMetadata: patchSyncMetadata
        };
    });

    if (transactionResult?.applied) {
        void cleanupStaleBoardPatches({ userId, boardId }).catch((error) => {
            debugLog.warn(`[SyncPatch] Cleanup failed for board ${boardId}`, error);
        });
    }

    return transactionResult;
};

export const listenForIncrementalBoardPatches = ({
    userId,
    boardId,
    fromMutationSequence = 0,
    onPatchBatch,
    onError
}) => {
    if (!db || !userId || !boardId || typeof onPatchBatch !== 'function') {
        return () => { };
    }

    const normalizedStartSequence = toSafeInt(fromMutationSequence);
    let lastSeenSequence = normalizedStartSequence;
    const patchesRef = getBoardPatchesCollectionRef(userId, boardId);
    const patchesQuery = query(
        patchesRef,
        where('sequence', '>', normalizedStartSequence),
        orderBy('sequence', 'asc'),
        limit(PATCH_LISTENER_LIMIT)
    );

    return onSnapshot(patchesQuery, (snapshot) => {
        const batch = snapshot.docChanges()
            .filter((change) => change.type === 'added')
            .map((change) => {
                const data = normalizePatchPayload(change.doc.data() || {});
                return {
                    ...data,
                    id: change.doc.id,
                    sequence: toSafeInt(change.doc.data()?.sequence, getMutationSequence(data)),
                    mutationSequence: toSafeInt(change.doc.data()?.mutationSequence, getMutationSequence(data))
                };
            })
            .filter((patchItem) => patchItem.sequence > lastSeenSequence)
            .sort((left, right) => left.sequence - right.sequence);

        if (batch.length === 0) return;

        lastSeenSequence = batch.reduce(
            (maxSequence, patchItem) => Math.max(maxSequence, patchItem.sequence),
            lastSeenSequence
        );

        try {
            const maybePromise = onPatchBatch(batch);
            if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.catch((error) => {
                    if (typeof onError === 'function') {
                        onError(error);
                    } else {
                        debugLog.error(`[SyncPatch] Async patch batch handler failed for board ${boardId}`, error);
                    }
                });
            }
        } catch (error) {
            if (typeof onError === 'function') {
                onError(error);
            } else {
                debugLog.error(`[SyncPatch] Patch batch handler failed for board ${boardId}`, error);
            }
        }
    }, (error) => {
        if (typeof onError === 'function') {
            onError(error);
            return;
        }
        debugLog.error(`[SyncPatch] Listener failed for board ${boardId}`, error);
    });
};
