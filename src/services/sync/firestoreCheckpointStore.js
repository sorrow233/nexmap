import { deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { estimateTextBytes } from './base64';
import {
    createBoardRootRef,
    createCheckpointPartsCollectionRef,
    createCheckpointSetRef,
    createCheckpointSetsCollectionRef
} from './firestoreSyncPaths';
import { buildAuthoritativeRootPayload } from './firestoreRootDocument';

const CHECKPOINT_STORAGE_INLINE = 'inline';
const CHECKPOINT_STORAGE_CHUNKED = 'chunked';
// Keep a safety margin below Firestore's 1 MiB document cap while dramatically
// reducing chunk counts for large checkpoints.
const INLINE_CHECKPOINT_MAX_BYTES = 900 * 1024;
const TARGET_PART_BYTES = 800 * 1024;
const MAX_PART_BYTES = 900 * 1024;
const MAX_PART_COUNT = 96;
const CLEANUP_BATCH_SIZE = 350;
const WRITE_PARTS_BATCH_MAX_DOCS = 40;
const WRITE_PARTS_BATCH_MAX_BYTES = 7 * 1024 * 1024;
const CURRENT_SYNC_BACKEND = 'yjs-firestore-v1';

const splitTextIntoParts = (text = '', targetBytes = TARGET_PART_BYTES) => {
    if (!text) return [];

    const safeTarget = Math.max(32 * 1024, Number(targetBytes) || TARGET_PART_BYTES);
    const parts = [];

    for (let offset = 0; offset < text.length; offset += safeTarget) {
        parts.push(text.slice(offset, offset + safeTarget));
    }

    return parts;
};

const resolveCheckpointPartTargetBytes = (updateBase64 = '', byteLength = 0) => {
    const safeByteLength = Math.max(estimateTextBytes(updateBase64), Number(byteLength) || 0);
    if (!safeByteLength) {
        return TARGET_PART_BYTES;
    }

    const requiredBytesPerPart = Math.ceil(safeByteLength / MAX_PART_COUNT);
    return Math.min(
        MAX_PART_BYTES,
        Math.max(TARGET_PART_BYTES, requiredBytesPerPart)
    );
};

const estimateCheckpointPartWriteBytes = (part = '') => {
    const payloadBytes = estimateTextBytes(part);
    return payloadBytes + 1024;
};

const toSafeMillis = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }

    if (value && typeof value.toMillis === 'function') {
        try {
            return Math.trunc(value.toMillis());
        } catch {
            return fallback;
        }
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
};

const listCheckpointSets = async (userId, boardId) => {
    const setsRef = createCheckpointSetsCollectionRef(userId, boardId);
    const setsSnapshot = await getDocs(query(setsRef, orderBy('savedAtMs', 'desc')));
    return setsSnapshot.docs;
};

const cleanupStaleCheckpointSets = async (userId, boardId, keepCheckpointId) => {
    const docs = await listCheckpointSets(userId, boardId);

    for (const setDocSnap of docs) {
        if (setDocSnap.id === keepCheckpointId) continue;

        const partsRef = createCheckpointPartsCollectionRef(userId, boardId, setDocSnap.id);
        const partsSnapshot = await getDocs(query(partsRef, orderBy('index', 'asc')));

        for (let offset = 0; offset < partsSnapshot.docs.length; offset += CLEANUP_BATCH_SIZE) {
            const batch = writeBatch(db);
            partsSnapshot.docs.slice(offset, offset + CLEANUP_BATCH_SIZE).forEach((partDoc) => {
                batch.delete(partDoc.ref);
            });
            await batch.commit();
            // Throttle batch deletions to avoid "Resource Exhausted" error
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        await deleteDoc(setDocSnap.ref);
        // Throttle individual doc deletions too just in case there are many sets
        await new Promise(resolve => setTimeout(resolve, 200));
    }
};

const persistChunkedCheckpoint = async ({
    userId,
    boardId,
    checkpointId,
    parts,
    byteLength,
    savedAtMs,
    deviceId,
    partTargetBytes
}) => {
    if (parts.length === 0) {
        throw new Error(`Checkpoint ${checkpointId} has no chunk parts`);
    }

    if (parts.length > MAX_PART_COUNT) {
        throw new Error(
            `Checkpoint ${checkpointId} exceeds max chunk count ${MAX_PART_COUNT} even after resizing parts to ${partTargetBytes} bytes`
        );
    }

    await setDoc(createCheckpointSetRef(userId, boardId, checkpointId), {
        checkpointId,
        storage: CHECKPOINT_STORAGE_CHUNKED,
        partCount: parts.length,
        partTargetBytes,
        byteLength,
        deviceId,
        savedAtMs
    }, { merge: true });

    let offset = 0;

    while (offset < parts.length) {
        const batch = writeBatch(db);
        let batchDocCount = 0;
        let batchByteLength = 0;

        while (offset < parts.length) {
            const part = parts[offset];
            const estimatedWriteBytes = estimateCheckpointPartWriteBytes(part);

            if (
                batchDocCount > 0 &&
                (batchDocCount >= WRITE_PARTS_BATCH_MAX_DOCS
                    || (batchByteLength + estimatedWriteBytes) > WRITE_PARTS_BATCH_MAX_BYTES)
            ) {
                break;
            }

            const actualIndex = offset;
            const partId = String(actualIndex).padStart(5, '0');
            batch.set(
                doc(createCheckpointPartsCollectionRef(userId, boardId, checkpointId), partId),
                {
                    index: actualIndex,
                    data: part
                },
                { merge: true }
            );
            batchDocCount += 1;
            batchByteLength += estimatedWriteBytes;
            offset += 1;
        }

        await batch.commit();
        
        // If there are more parts, throttle slightly to prevent "Resource Exhausted" error
        if (offset < parts.length) {
            await new Promise(resolve => setTimeout(resolve, 400));
        }
    }
};

export const getSyncBackendName = () => CURRENT_SYNC_BACKEND;

export const toFirestoreMillis = (value, fallback = 0) => toSafeMillis(value, fallback);

export const hasRemoteCheckpoint = (rootData = {}) => {
    const storage = typeof rootData.checkpointStorage === 'string'
        ? rootData.checkpointStorage
        : '';

    if (storage === CHECKPOINT_STORAGE_INLINE) {
        return typeof rootData.checkpointBase64 === 'string' && rootData.checkpointBase64.length > 0;
    }

    if (storage === CHECKPOINT_STORAGE_CHUNKED) {
        return typeof rootData.checkpointSetId === 'string' && rootData.checkpointSetId.length > 0;
    }

    return typeof rootData.checkpointBase64 === 'string' && rootData.checkpointBase64.length > 0;
};

export const loadBoardCheckpoint = async ({ userId, boardId, rootData = {} }) => {
    if (!db || !userId || !boardId || !rootData || typeof rootData !== 'object') {
        return null;
    }

    const storage = typeof rootData.checkpointStorage === 'string'
        ? rootData.checkpointStorage
        : CHECKPOINT_STORAGE_INLINE;
    const savedAtMs = toSafeMillis(rootData.checkpointSavedAtMs);

    if (storage === CHECKPOINT_STORAGE_INLINE) {
        const updateBase64 = typeof rootData.checkpointBase64 === 'string'
            ? rootData.checkpointBase64
            : '';

        if (!updateBase64) return null;

        return {
            updateBase64,
            savedAtMs,
            storage,
            signature: `inline:${savedAtMs}:${updateBase64.length}`
        };
    }

    if (storage !== CHECKPOINT_STORAGE_CHUNKED) {
        return null;
    }

    const checkpointId = typeof rootData.checkpointSetId === 'string'
        ? rootData.checkpointSetId
        : '';

    if (!checkpointId) return null;

    const partsSnapshot = await getDocs(query(
        createCheckpointPartsCollectionRef(userId, boardId, checkpointId),
        orderBy('index', 'asc')
    ));

    const updateBase64 = partsSnapshot.docs
        .map((docSnap) => (typeof docSnap.data()?.data === 'string' ? docSnap.data().data : ''))
        .join('');

    if (!updateBase64) return null;

    return {
        updateBase64,
        savedAtMs,
        storage,
        checkpointId,
        signature: `chunked:${checkpointId}:${savedAtMs}:${partsSnapshot.docs.length}`
    };
};

export const saveBoardCheckpoint = async ({
    userId,
    boardId,
    deviceId,
    updateBase64,
    reason = 'manual_snapshot',
    cleanupStale = false
}) => {
    if (!db || !userId || !boardId || !updateBase64) {
        return null;
    }

    const byteLength = estimateTextBytes(updateBase64);
    const savedAtMs = Date.now();
    const rootRef = createBoardRootRef(userId, boardId);

    if (byteLength <= INLINE_CHECKPOINT_MAX_BYTES) {
        await setDoc(rootRef, {
            ...buildAuthoritativeRootPayload({
            id: boardId,
            checkpointStorage: CHECKPOINT_STORAGE_INLINE,
            checkpointBase64: updateBase64,
            checkpointSetId: '',
            checkpointPartCount: 0,
            checkpointByteLength: byteLength,
            checkpointSavedAtMs: savedAtMs,
            checkpointServerSavedAt: serverTimestamp(),
            checkpointReason: reason,
            syncTouchedAtMs: savedAtMs,
            serverUpdatedAt: serverTimestamp(),
            lastDeviceId: deviceId
            })
        }, { merge: true });

        return {
            savedAtMs,
            storage: CHECKPOINT_STORAGE_INLINE,
            signature: `inline:${savedAtMs}:${updateBase64.length}`
        };
    }

    const checkpointId = `${deviceId}_${savedAtMs}`;
    const partTargetBytes = resolveCheckpointPartTargetBytes(updateBase64, byteLength);
    const parts = splitTextIntoParts(updateBase64, partTargetBytes);
    const partCount = parts.length;

    await persistChunkedCheckpoint({
        userId,
        boardId,
        checkpointId,
        parts,
        byteLength,
        savedAtMs,
        deviceId,
        partTargetBytes
    });

    await setDoc(rootRef, {
        ...buildAuthoritativeRootPayload({
        id: boardId,
        checkpointStorage: CHECKPOINT_STORAGE_CHUNKED,
        checkpointBase64: '',
        checkpointSetId: checkpointId,
        checkpointPartCount: partCount,
        checkpointByteLength: byteLength,
        checkpointSavedAtMs: savedAtMs,
        checkpointServerSavedAt: serverTimestamp(),
        checkpointReason: reason,
        syncTouchedAtMs: savedAtMs,
        serverUpdatedAt: serverTimestamp(),
        lastDeviceId: deviceId
        })
    }, { merge: true });

    if (cleanupStale) {
        void cleanupStaleCheckpointSets(userId, boardId, checkpointId).catch((error) => {
            console.warn(`[FirebaseSync] Failed to cleanup stale checkpoint sets for ${boardId}`, error);
        });
    }

    return {
        savedAtMs,
        storage: CHECKPOINT_STORAGE_CHUNKED,
        checkpointId,
        signature: `chunked:${checkpointId}:${savedAtMs}:${partCount}`
    };
};
