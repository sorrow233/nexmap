const PENDING_CLOUD_SYNC_PREFIX = 'mixboard_pending_cloud_sync_';

const getPendingCloudSyncKey = (boardId) => `${PENDING_CLOUD_SYNC_PREFIX}${boardId}`;

export const readPendingCloudSync = (boardId) => {
    if (!boardId) return null;

    try {
        const raw = localStorage.getItem(getPendingCloudSyncKey(boardId));
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;

        return {
            boardId,
            updatedAt: Number(parsed.updatedAt) || 0,
            reason: typeof parsed.reason === 'string' ? parsed.reason : ''
        };
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to read pending state:', error);
        return null;
    }
};

export const hasPendingCloudSync = (boardId) => Boolean(readPendingCloudSync(boardId));

export const markPendingCloudSync = (boardId, metadata = {}) => {
    if (!boardId) return;

    try {
        localStorage.setItem(getPendingCloudSyncKey(boardId), JSON.stringify({
            updatedAt: Date.now(),
            reason: typeof metadata.reason === 'string' ? metadata.reason : ''
        }));
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to persist pending state:', error);
    }
};

export const clearPendingCloudSync = (boardId) => {
    if (!boardId) return;

    try {
        localStorage.removeItem(getPendingCloudSyncKey(boardId));
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to clear pending state:', error);
    }
};
