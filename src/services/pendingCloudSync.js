import { idbDel, idbGet, idbSet } from './db/indexedDB.js';

const PENDING_CLOUD_SYNC_PREFIX = 'mixboard_pending_cloud_sync_';
const pendingCloudSyncMemoryCache = new Map();

const getPendingCloudSyncKey = (boardId) => `${PENDING_CLOUD_SYNC_PREFIX}${boardId}`;

const hasWindowStorage = () => typeof window !== 'undefined';

const hasIndexedDbRuntime = () => typeof indexedDB !== 'undefined';

const getSessionStorage = () => (hasWindowStorage() ? window.sessionStorage : null);

const getLegacyLocalStorage = () => (hasWindowStorage() ? window.localStorage : null);

const normalizePendingCloudSync = (boardId, value) => {
    if (!boardId || !value || typeof value !== 'object') return null;

    return {
        boardId,
        updatedAt: Number(value.updatedAt) || 0,
        reason: typeof value.reason === 'string' ? value.reason : ''
    };
};

const parsePendingCloudSync = (boardId, raw) => {
    if (typeof raw !== 'string' || !raw) return null;

    try {
        return normalizePendingCloudSync(boardId, JSON.parse(raw));
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to parse pending state:', error);
        return null;
    }
};

const readPendingCloudSyncFromSession = (boardId) => {
    const storage = getSessionStorage();
    if (!storage || !boardId) return null;

    try {
        return parsePendingCloudSync(boardId, storage.getItem(getPendingCloudSyncKey(boardId)));
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to read session pending state:', error);
        return null;
    }
};

const readPendingCloudSyncFromLegacyLocalStorage = (boardId) => {
    const storage = getLegacyLocalStorage();
    if (!storage || !boardId) return null;

    try {
        return parsePendingCloudSync(boardId, storage.getItem(getPendingCloudSyncKey(boardId)));
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to read legacy pending state:', error);
        return null;
    }
};

const writePendingCloudSyncToSession = (boardId, payload) => {
    const storage = getSessionStorage();
    if (!storage || !boardId || !payload) return false;

    try {
        storage.setItem(getPendingCloudSyncKey(boardId), JSON.stringify(payload));
        return true;
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to persist session pending state:', error);
        return false;
    }
};

const clearPendingCloudSyncFromSession = (boardId) => {
    const storage = getSessionStorage();
    if (!storage || !boardId) return;

    try {
        storage.removeItem(getPendingCloudSyncKey(boardId));
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to clear session pending state:', error);
    }
};

const clearPendingCloudSyncFromLegacyLocalStorage = (boardId) => {
    const storage = getLegacyLocalStorage();
    if (!storage || !boardId) return;

    try {
        storage.removeItem(getPendingCloudSyncKey(boardId));
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to clear legacy pending state:', error);
    }
};

const persistPendingCloudSyncToIdb = async (boardId, payload) => {
    if (!boardId || !payload || !hasIndexedDbRuntime()) return false;

    try {
        await idbSet(getPendingCloudSyncKey(boardId), payload);
        return true;
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to persist pending state to IndexedDB:', error);
        return false;
    }
};

const loadPendingCloudSyncFromIdb = async (boardId) => {
    if (!boardId || !hasIndexedDbRuntime()) return null;

    try {
        return normalizePendingCloudSync(boardId, await idbGet(getPendingCloudSyncKey(boardId)));
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to read pending state from IndexedDB:', error);
        return null;
    }
};

const clearPendingCloudSyncFromIdb = async (boardId) => {
    if (!boardId || !hasIndexedDbRuntime()) return false;

    try {
        await idbDel(getPendingCloudSyncKey(boardId));
        return true;
    } catch (error) {
        console.warn('[PendingCloudSync] Failed to clear pending state from IndexedDB:', error);
        return false;
    }
};

const primePendingCloudSyncCache = (boardId, payload) => {
    const normalized = normalizePendingCloudSync(boardId, payload);
    if (!normalized) return null;

    pendingCloudSyncMemoryCache.set(boardId, normalized);
    writePendingCloudSyncToSession(boardId, normalized);
    return normalized;
};

export const readPendingCloudSync = (boardId) => {
    if (!boardId) return null;

    const memoryValue = pendingCloudSyncMemoryCache.get(boardId);
    if (memoryValue) return memoryValue;

    const sessionValue = readPendingCloudSyncFromSession(boardId);
    if (sessionValue) {
        pendingCloudSyncMemoryCache.set(boardId, sessionValue);
        return sessionValue;
    }

    const legacyValue = readPendingCloudSyncFromLegacyLocalStorage(boardId);
    if (legacyValue) {
        primePendingCloudSyncCache(boardId, legacyValue);
        void persistPendingCloudSyncToIdb(boardId, legacyValue);
        clearPendingCloudSyncFromLegacyLocalStorage(boardId);
        return legacyValue;
    }

    return null;
};

export const hasPendingCloudSync = (boardId) => Boolean(readPendingCloudSync(boardId));

export const hydratePendingCloudSync = async (boardId) => {
    if (!boardId) return null;

    const existing = readPendingCloudSync(boardId);
    if (existing) return existing;

    const persistedValue = await loadPendingCloudSyncFromIdb(boardId);
    if (persistedValue) {
        return primePendingCloudSyncCache(boardId, persistedValue);
    }

    return null;
};

export const markPendingCloudSync = (boardId, metadata = {}) => {
    if (!boardId) return null;

    const payload = primePendingCloudSyncCache(boardId, {
        updatedAt: Date.now(),
        reason: typeof metadata.reason === 'string' ? metadata.reason : ''
    });

    if (!payload) return null;

    clearPendingCloudSyncFromLegacyLocalStorage(boardId);
    void persistPendingCloudSyncToIdb(boardId, payload);
    return payload;
};

export const clearPendingCloudSync = (boardId) => {
    if (!boardId) return;

    pendingCloudSyncMemoryCache.delete(boardId);
    clearPendingCloudSyncFromSession(boardId);
    clearPendingCloudSyncFromLegacyLocalStorage(boardId);
    void clearPendingCloudSyncFromIdb(boardId);
};
