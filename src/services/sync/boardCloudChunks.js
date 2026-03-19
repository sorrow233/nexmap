import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { debugLog } from '../../utils/debugLogger';
import { db } from './core';

const SNAPSHOT_SETS_COLLECTION = 'snapshotSets';
const SNAPSHOT_PARTS_COLLECTION = 'parts';
const CLOUD_SNAPSHOT_STORAGE_INLINE = 'inline';
const CLOUD_SNAPSHOT_STORAGE_CHUNKED = 'chunked';

// Keep a healthy margin under Firestore's 1 MiB document limit.
const MAX_INLINE_SNAPSHOT_BYTES = 720 * 1024;
const TARGET_CHUNK_BYTES = 180 * 1024;
const MAX_CHUNK_COUNT = 96;

const uploadedChunkSetsCache = new Set();
const hydratedSnapshotCache = new Map();

const toSafeInt = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : fallback;
};

const getApproxBytes = (value) => {
    if (typeof value !== 'string') return 0;
    try {
        return new TextEncoder().encode(value).length;
    } catch {
        return value.length;
    }
};

const buildSnapshotHash = (text = '') => {
    // FNV-1a 32-bit for a compact deterministic set id.
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(36);
};

const splitSnapshotIntoChunks = (snapshotData, targetBytes = TARGET_CHUNK_BYTES) => {
    if (typeof snapshotData !== 'string' || !snapshotData) return [];

    const safeTargetBytes = Math.max(32 * 1024, toSafeInt(targetBytes, TARGET_CHUNK_BYTES));
    const chunks = [];
    let pointer = 0;

    // snapshotData is base64 (ASCII), so slicing by char length is safe and byte-equivalent.
    while (pointer < snapshotData.length) {
        const end = Math.min(pointer + safeTargetBytes, snapshotData.length);
        chunks.push(snapshotData.slice(pointer, end));
        pointer = end;
    }

    return chunks;
};

const getSnapshotSetDocRef = (userId, boardId, setId) => (
    doc(db, 'users', userId, 'boards', boardId, SNAPSHOT_SETS_COLLECTION, setId)
);

const getSnapshotPartsCollectionRef = (userId, boardId, setId) => (
    collection(db, 'users', userId, 'boards', boardId, SNAPSHOT_SETS_COLLECTION, setId, SNAPSHOT_PARTS_COLLECTION)
);

const makeUploadedChunkSetCacheKey = (userId, boardId, setId) => `${userId}:${boardId}:${setId}`;

export const buildCloudSnapshotStoragePlan = (snapshotPayload = {}) => {
    const snapshotData = typeof snapshotPayload.snapshotData === 'string'
        ? snapshotPayload.snapshotData
        : '';
    const approxBytes = getApproxBytes(snapshotData);

    if (!snapshotData || approxBytes <= MAX_INLINE_SNAPSHOT_BYTES) {
        return {
            mode: CLOUD_SNAPSHOT_STORAGE_INLINE,
            snapshotData,
            snapshotEncoding: snapshotPayload.snapshotEncoding,
            snapshotSchemaVersion: snapshotPayload.snapshotSchemaVersion,
            approxBytes,
            chunkCount: 0,
            setId: ''
        };
    }

    const chunks = splitSnapshotIntoChunks(snapshotData, TARGET_CHUNK_BYTES);
    if (chunks.length > MAX_CHUNK_COUNT) {
        throw new Error(
            `Snapshot chunking failed: chunk count ${chunks.length} exceeds max ${MAX_CHUNK_COUNT}`
        );
    }

    return {
        mode: CLOUD_SNAPSHOT_STORAGE_CHUNKED,
        snapshotData: '',
        snapshotEncoding: snapshotPayload.snapshotEncoding,
        snapshotSchemaVersion: snapshotPayload.snapshotSchemaVersion,
        approxBytes,
        chunkCount: chunks.length,
        chunks,
        setId: `${buildSnapshotHash(snapshotData)}_${snapshotData.length.toString(36)}`
    };
};

export const buildCloudSnapshotPayloadForDocument = (storagePlan = {}) => {
    if (storagePlan.mode === CLOUD_SNAPSHOT_STORAGE_CHUNKED) {
        return {
            snapshotData: undefined,
            snapshotStorage: CLOUD_SNAPSHOT_STORAGE_CHUNKED,
            snapshotSetId: storagePlan.setId || '',
            snapshotChunkCount: toSafeInt(storagePlan.chunkCount),
            snapshotBytes: toSafeInt(storagePlan.approxBytes),
            snapshotEncoding: storagePlan.snapshotEncoding,
            snapshotSchemaVersion: storagePlan.snapshotSchemaVersion
        };
    }

    return {
        snapshotData: storagePlan.snapshotData || '',
        snapshotStorage: CLOUD_SNAPSHOT_STORAGE_INLINE,
        snapshotSetId: '',
        snapshotChunkCount: 0,
        snapshotBytes: toSafeInt(storagePlan.approxBytes),
        snapshotEncoding: storagePlan.snapshotEncoding,
        snapshotSchemaVersion: storagePlan.snapshotSchemaVersion
    };
};

export const persistChunkedSnapshotSet = async ({
    userId,
    boardId,
    storagePlan,
    syncVersion = 0,
    clientRevision = 0
}) => {
    if (!db || !userId || !boardId) return false;
    if (!storagePlan || storagePlan.mode !== CLOUD_SNAPSHOT_STORAGE_CHUNKED) return false;

    const setId = String(storagePlan.setId || '').trim();
    if (!setId) return false;

    const cacheKey = makeUploadedChunkSetCacheKey(userId, boardId, setId);
    if (uploadedChunkSetsCache.has(cacheKey)) {
        return true;
    }

    const chunks = Array.isArray(storagePlan.chunks) ? storagePlan.chunks : [];
    if (chunks.length === 0) return false;

    const setDocRef = getSnapshotSetDocRef(userId, boardId, setId);
    const now = Date.now();
    await setDoc(setDocRef, {
        setId,
        chunkCount: chunks.length,
        snapshotBytes: toSafeInt(storagePlan.approxBytes),
        syncVersion: toSafeInt(syncVersion),
        clientRevision: toSafeInt(clientRevision),
        updatedAt: now
    }, { merge: true });

    // Firestore writeBatch limit is 500 operations.
    for (let offset = 0; offset < chunks.length; offset += 400) {
        const batch = writeBatch(db);
        const slice = chunks.slice(offset, offset + 400);
        slice.forEach((chunk, index) => {
            const actualIndex = offset + index;
            const partId = String(actualIndex).padStart(5, '0');
            const partDocRef = doc(getSnapshotPartsCollectionRef(userId, boardId, setId), partId);
            batch.set(partDocRef, {
                index: actualIndex,
                data: chunk
            }, { merge: true });
        });
        await batch.commit();
    }

    uploadedChunkSetsCache.add(cacheKey);
    debugLog.sync(
        `[Sync] Chunked snapshot persisted for board ${boardId}: set=${setId}, chunks=${chunks.length}`
    );
    return true;
};

export const cleanupStaleChunkedSnapshotSets = async ({ userId, boardId, keepSetId = '' }) => {
    if (!db || !userId || !boardId) return;

    const setsRef = collection(db, 'users', userId, 'boards', boardId, SNAPSHOT_SETS_COLLECTION);
    const setsSnap = await getDocs(setsRef);
    const keepId = String(keepSetId || '').trim();

    for (const setDocSnap of setsSnap.docs) {
        const setId = setDocSnap.id;
        if (keepId && setId === keepId) continue;

        const partsRef = getSnapshotPartsCollectionRef(userId, boardId, setId);
        const partsSnap = await getDocs(partsRef);

        for (let offset = 0; offset < partsSnap.docs.length; offset += 400) {
            const batch = writeBatch(db);
            const slice = partsSnap.docs.slice(offset, offset + 400);
            slice.forEach((partDoc) => batch.delete(partDoc.ref));
            await batch.commit();
        }

        await deleteDoc(setDocSnap.ref);
    }
};

export const hydrateCloudBoardSnapshotFromChunks = async ({ userId, boardId, boardData = {} }) => {
    if (!db || !userId || !boardId || !boardData || typeof boardData !== 'object') {
        return boardData;
    }

    const storageMode = String(boardData.snapshotStorage || CLOUD_SNAPSHOT_STORAGE_INLINE);
    if (storageMode !== CLOUD_SNAPSHOT_STORAGE_CHUNKED) {
        return boardData;
    }

    const setId = String(boardData.snapshotSetId || '').trim();
    if (!setId) return boardData;

    const cacheKey = makeUploadedChunkSetCacheKey(userId, boardId, setId);
    if (hydratedSnapshotCache.has(cacheKey)) {
        return {
            ...boardData,
            snapshotData: hydratedSnapshotCache.get(cacheKey)
        };
    }

    const partsRef = getSnapshotPartsCollectionRef(userId, boardId, setId);
    const partsSnap = await getDocs(partsRef);
    const sortedParts = partsSnap.docs
        .map((partDoc) => ({
            id: partDoc.id,
            index: toSafeInt(partDoc.data()?.index, Number(partDoc.id)),
            data: typeof partDoc.data()?.data === 'string' ? partDoc.data().data : ''
        }))
        .sort((left, right) => left.index - right.index);

    const snapshotData = sortedParts.map((part) => part.data).join('');
    if (!snapshotData) {
        debugLog.warn(`[Sync] Chunked snapshot hydration returned empty data for board ${boardId} (set=${setId})`);
        return boardData;
    }

    hydratedSnapshotCache.set(cacheKey, snapshotData);
    return {
        ...boardData,
        snapshotData
    };
};
