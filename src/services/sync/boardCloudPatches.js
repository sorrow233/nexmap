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
import { db } from './core';

const PATCHES_COLLECTION = 'patches';
const PATCH_LISTENER_LIMIT = 240;
const PATCH_GC_BATCH_SIZE = 300;
const PATCH_HISTORY_KEEP_COUNT = 240;
const MAX_PATCH_BYTES = 300 * 1024;

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

const buildPatchDocId = (patch = {}) => {
    const revision = String(toSafeInt(patch.toClientRevision)).padStart(12, '0');
    const updatedAt = String(toSafeInt(patch.updatedAt, Date.now())).padStart(13, '0');
    const nonce = Math.random().toString(36).slice(2, 9);
    return `${revision}_${updatedAt}_${nonce}`;
};

const getBoardPatchesCollectionRef = (userId, boardId) => (
    collection(db, 'users', userId, 'boards', boardId, PATCHES_COLLECTION)
);

const normalizePatchPayload = (patch = {}) => {
    const ops = Array.isArray(patch.ops) ? patch.ops : [];
    return {
        kind: typeof patch.kind === 'string' ? patch.kind : 'cards_patch_v1',
        fromClientRevision: toSafeInt(patch.fromClientRevision),
        toClientRevision: toSafeInt(patch.toClientRevision),
        updatedAt: toSafeInt(patch.updatedAt, Date.now()),
        opCount: toSafeInt(patch.opCount, ops.length),
        ops,
        baseContentHash: typeof patch.baseContentHash === 'string' ? patch.baseContentHash : '',
        contentHash: typeof patch.contentHash === 'string' ? patch.contentHash : ''
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

const cleanupStaleBoardPatches = async ({ userId, boardId, keepCount = PATCH_HISTORY_KEEP_COUNT }) => {
    if (!db || !userId || !boardId) return;

    const patchesRef = getBoardPatchesCollectionRef(userId, boardId);
    const headSnap = await getDocs(
        query(
            patchesRef,
            orderBy('toClientRevision', 'desc'),
            limit(Math.max(1, toSafeInt(keepCount, PATCH_HISTORY_KEEP_COUNT)))
        )
    );

    if (headSnap.empty) return;

    const floorRevision = headSnap.docs.reduce((minRevision, docSnap) => (
        Math.min(minRevision, toSafeInt(docSnap.data()?.toClientRevision, Number.MAX_SAFE_INTEGER))
    ), Number.MAX_SAFE_INTEGER);

    if (!Number.isFinite(floorRevision) || floorRevision <= 0) return;

    while (true) {
        const staleSnap = await getDocs(
            query(
                patchesRef,
                where('toClientRevision', '<', floorRevision),
                orderBy('toClientRevision', 'asc'),
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
    const patchDocId = buildPatchDocId(normalizedPatch);
    const patchDocRef = doc(getBoardPatchesCollectionRef(userId, boardId), patchDocId);

    const transactionResult = await runTransaction(db, async (transaction) => {
        const boardSnap = await transaction.get(boardRef);
        if (!boardSnap.exists()) {
            return {
                applied: false,
                fallbackToSnapshot: true,
                reason: 'board_missing'
            };
        }

        const remoteBoard = boardSnap.data() || {};
        const remoteContentHash = typeof remoteBoard.contentHash === 'string' ? remoteBoard.contentHash : '';
        const remoteClientRevision = Math.max(
            toSafeClientRevision(remoteBoard.clientRevision),
            toSafeInt(remoteBoard.patchHeadClientRevision)
        );

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
                remoteClientRevision
            };
        }

        transaction.set(patchDocRef, {
            ...normalizedPatch,
            approxBytes,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now()
        });

        transaction.set(boardRef, {
            contentHash: normalizedPatch.contentHash || remoteContentHash || '',
            patchHeadClientRevision: normalizedPatch.toClientRevision,
            patchUpdatedAt: normalizedPatch.updatedAt,
            patchOpCount: normalizedPatch.opCount
        }, { merge: true });

        return {
            applied: true,
            fallbackToSnapshot: false,
            reason: 'patch_applied',
            patchDocId
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
    fromClientRevision = 0,
    onPatchBatch,
    onError
}) => {
    if (!db || !userId || !boardId || typeof onPatchBatch !== 'function') {
        return () => { };
    }

    const normalizedStartRevision = toSafeInt(fromClientRevision);
    let lastSeenRevision = normalizedStartRevision;
    const patchesRef = getBoardPatchesCollectionRef(userId, boardId);
    const patchesQuery = query(
        patchesRef,
        where('toClientRevision', '>', normalizedStartRevision),
        orderBy('toClientRevision', 'asc'),
        limit(PATCH_LISTENER_LIMIT)
    );

    return onSnapshot(patchesQuery, (snapshot) => {
        const batch = snapshot.docChanges()
            .filter((change) => change.type === 'added')
            .map((change) => {
                const data = normalizePatchPayload(change.doc.data() || {});
                return {
                    ...data,
                    id: change.doc.id
                };
            })
            .filter((patch) => patch.toClientRevision > lastSeenRevision)
            .sort((left, right) => left.toClientRevision - right.toClientRevision);

        if (batch.length === 0) return;

        lastSeenRevision = batch.reduce(
            (maxRevision, patch) => Math.max(maxRevision, patch.toClientRevision),
            lastSeenRevision
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
