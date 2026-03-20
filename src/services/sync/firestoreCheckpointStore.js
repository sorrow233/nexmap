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
const INLINE_CHECKPOINT_MAX_BYTES = 700 * 1024;
const TARGET_PART_BYTES = 180 * 1024;
const MAX_PART_COUNT = 96;
const CLEANUP_BATCH_SIZE = 350;
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
        }

        await deleteDoc(setDocSnap.ref);
    }
};

const persistChunkedCheckpoint = async ({
    userId,
    boardId,
    checkpointId,
    updateBase64,
    byteLength,
    savedAtMs,
    deviceId
}) => {
    const parts = splitTextIntoParts(updateBase64, TARGET_PART_BYTES);
    if (parts.length === 0) {
        throw new Error(`Checkpoint ${checkpointId} has no chunk parts`);
    }

    if (parts.length > MAX_PART_COUNT) {
        throw new Error(`Checkpoint ${checkpointId} exceeds max chunk count ${MAX_PART_COUNT}`);
    }

    await setDoc(createCheckpointSetRef(userId, boardId, checkpointId), {
        checkpointId,
        storage: CHECKPOINT_STORAGE_CHUNKED,
        partCount: parts.length,
        byteLength,
        deviceId,
        savedAtMs
    }, { merge: true });

    for (let offset = 0; offset < parts.length; offset += CLEANUP_BATCH_SIZE) {
        const batch = writeBatch(db);
        const slice = parts.slice(offset, offset + CLEANUP_BATCH_SIZE);

        slice.forEach((part, index) => {
            const actualIndex = offset + index;
            const partId = String(actualIndex).padStart(5, '0');
            batch.set(
                doc(createCheckpointPartsCollectionRef(userId, boardId, checkpointId), partId),
                {
                    index: actualIndex,
                    data: part
                },
                { merge: true }
            );
        });

        await batch.commit();
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
    reason = 'manual_snapshot'
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
            checkpointReason: reason,
            updatedAt: savedAtMs,
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
    const partCount = splitTextIntoParts(updateBase64, TARGET_PART_BYTES).length;

    await persistChunkedCheckpoint({
        userId,
        boardId,
        checkpointId,
        updateBase64,
        byteLength,
        savedAtMs,
        deviceId
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
        checkpointReason: reason,
        updatedAt: savedAtMs,
        serverUpdatedAt: serverTimestamp(),
        lastDeviceId: deviceId
        })
    }, { merge: true });

    void cleanupStaleCheckpointSets(userId, boardId, checkpointId).catch((error) => {
        console.warn(`[FirebaseSync] Failed to cleanup stale checkpoint sets for ${boardId}`, error);
    });

    return {
        savedAtMs,
        storage: CHECKPOINT_STORAGE_CHUNKED,
        checkpointId,
        signature: `chunked:${checkpointId}:${savedAtMs}:${partCount}`
    };
};
