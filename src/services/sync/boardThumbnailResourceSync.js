import { getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
    loadBoardThumbnailResource,
    persistBoardThumbnailResource
} from '../boardPersistence/boardThumbnailStorage';
import { createThumbnailResourceRef } from './firestoreSyncPaths';

const uploadSignatureCache = new Map();
const remoteLoadCache = new Map();
const thumbnailUploadQueueState = new Map();
const THUMBNAIL_UPLOAD_SPACING_MS = 120;

const normalizeLooseString = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') {
        return String(value).trim();
    }
    return value.trim();
};

const normalizeUpdatedAt = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const buildUploadSignature = (userId, thumbnailRef, thumbnailUpdatedAt) => (
    `${userId}:${thumbnailRef}:${normalizeUpdatedAt(thumbnailUpdatedAt)}`
);

const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const getThumbnailUploadQueue = (userId) => {
    if (!thumbnailUploadQueueState.has(userId)) {
        thumbnailUploadQueueState.set(userId, {
            inFlight: null,
            pending: new Map()
        });
    }
    return thumbnailUploadQueueState.get(userId);
};

const normalizeBoardThumbnailPayload = (board = {}) => ({
    id: normalizeLooseString(board?.id),
    thumbnailRef: normalizeLooseString(board?.thumbnailRef),
    thumbnailUpdatedAt: normalizeUpdatedAt(board?.thumbnailUpdatedAt)
});

export const syncBoardThumbnailResourceToRemote = async (userId, board = {}) => {
    const normalizedUserId = normalizeLooseString(userId);
    const normalizedBoard = normalizeBoardThumbnailPayload(board);
    const thumbnailRef = normalizedBoard.thumbnailRef;
    if (!normalizedUserId || !thumbnailRef) {
        return false;
    }

    const thumbnailUpdatedAt = normalizedBoard.thumbnailUpdatedAt;
    const uploadSignature = buildUploadSignature(normalizedUserId, thumbnailRef, thumbnailUpdatedAt);
    if (uploadSignatureCache.has(uploadSignature)) {
        return true;
    }

    const localThumbnailData = await loadBoardThumbnailResource(thumbnailRef);
    if (!localThumbnailData) {
        return false;
    }

    await setDoc(createThumbnailResourceRef(normalizedUserId, thumbnailRef), {
        boardId: normalizedBoard.id,
        thumbnailRef,
        thumbnailUpdatedAt,
        dataUrl: localThumbnailData,
        syncedAt: serverTimestamp()
    }, { merge: true });

    uploadSignatureCache.set(uploadSignature, true);
    return true;
};

export const enqueueBoardThumbnailResourceSync = async (userId, board = {}) => {
    const normalizedUserId = normalizeLooseString(userId);
    const normalizedBoard = normalizeBoardThumbnailPayload(board);
    if (!normalizedUserId || !normalizedBoard.thumbnailRef) {
        return false;
    }

    const uploadSignature = buildUploadSignature(
        normalizedUserId,
        normalizedBoard.thumbnailRef,
        normalizedBoard.thumbnailUpdatedAt
    );

    if (uploadSignatureCache.has(uploadSignature)) {
        return true;
    }

    const queue = getThumbnailUploadQueue(normalizedUserId);
    queue.pending.set(uploadSignature, normalizedBoard);

    if (queue.inFlight) {
        return queue.inFlight;
    }

    const runQueue = async () => {
        while (queue.pending.size > 0) {
            const [nextSignature, nextBoard] = queue.pending.entries().next().value;
            queue.pending.delete(nextSignature);
            try {
                await syncBoardThumbnailResourceToRemote(normalizedUserId, nextBoard);
            } finally {
                if (queue.pending.size > 0) {
                    await sleep(THUMBNAIL_UPLOAD_SPACING_MS);
                }
            }
        }
    };

    queue.inFlight = runQueue().finally(() => {
        queue.inFlight = null;
        if (queue.pending.size === 0) {
            thumbnailUploadQueueState.delete(normalizedUserId);
        }
    });

    return queue.inFlight;
};

export const loadRemoteBoardThumbnailResource = async (userId, boardId, thumbnailRef, thumbnailUpdatedAt = 0) => {
    const normalizedUserId = normalizeLooseString(userId);
    const normalizedBoardId = normalizeLooseString(boardId);
    const normalizedThumbnailRef = normalizeLooseString(thumbnailRef);

    if (!normalizedUserId || !normalizedThumbnailRef) {
        return '';
    }

    const localThumbnail = await loadBoardThumbnailResource(normalizedThumbnailRef);
    if (localThumbnail) {
        return localThumbnail;
    }

    const cacheKey = `${normalizedUserId}:${normalizedThumbnailRef}`;
    if (remoteLoadCache.has(cacheKey)) {
        return remoteLoadCache.get(cacheKey);
    }

    const loadPromise = getDoc(createThumbnailResourceRef(normalizedUserId, normalizedThumbnailRef))
        .then(async (snapshot) => {
            const data = snapshot.data();
            const dataUrl = normalizeLooseString(data?.dataUrl);
            if (!dataUrl) {
                return '';
            }

            await persistBoardThumbnailResource(normalizedBoardId || data?.boardId || 'unknown', dataUrl, {
                thumbnailRef: normalizedThumbnailRef,
                thumbnailUpdatedAt: normalizeUpdatedAt(data?.thumbnailUpdatedAt) || normalizeUpdatedAt(thumbnailUpdatedAt)
            });

            return dataUrl;
        })
        .catch(() => '')
        .finally(() => {
            remoteLoadCache.delete(cacheKey);
        });

    remoteLoadCache.set(cacheKey, loadPromise);
    return loadPromise;
};
