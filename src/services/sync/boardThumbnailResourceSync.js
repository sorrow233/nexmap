import { getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
    loadBoardThumbnailResource,
    persistBoardThumbnailResource
} from '../boardPersistence/boardThumbnailStorage';
import { createThumbnailResourceRef } from './firestoreSyncPaths';

const uploadSignatureCache = new Map();
const remoteLoadCache = new Map();

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

export const syncBoardThumbnailResourceToRemote = async (userId, board = {}) => {
    const normalizedUserId = normalizeLooseString(userId);
    const thumbnailRef = normalizeLooseString(board?.thumbnailRef);
    if (!normalizedUserId || !thumbnailRef) {
        return false;
    }

    const thumbnailUpdatedAt = normalizeUpdatedAt(board?.thumbnailUpdatedAt);
    const uploadSignature = buildUploadSignature(normalizedUserId, thumbnailRef, thumbnailUpdatedAt);
    if (uploadSignatureCache.has(uploadSignature)) {
        return true;
    }

    const localThumbnailData = await loadBoardThumbnailResource(thumbnailRef);
    if (!localThumbnailData) {
        return false;
    }

    await setDoc(createThumbnailResourceRef(normalizedUserId, thumbnailRef), {
        boardId: normalizeLooseString(board?.id),
        thumbnailRef,
        thumbnailUpdatedAt,
        dataUrl: localThumbnailData,
        syncedAt: serverTimestamp()
    }, { merge: true });

    uploadSignatureCache.set(uploadSignature, true);
    return true;
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
