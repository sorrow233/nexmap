import { debugLog } from '../../utils/debugLogger';
import {
    buildPersistenceCursor,
    isPersistenceSnapshotNewer,
    toEpochMillis,
    toSafeClientRevision,
    toSafeSyncVersion
} from './persistenceCursor';

const BOARD_SHADOW_PREFIX = 'mixboard_board_shadow_';
const SHADOW_SCOPE_SESSION = 'session';
const SHADOW_SCOPE_LOCAL = 'local';

const getBoardShadowStorageKey = (boardId) => `${BOARD_SHADOW_PREFIX}${boardId}`;

const getScopedStorage = (scope = SHADOW_SCOPE_SESSION) => {
    if (typeof window === 'undefined') return null;
    return scope === SHADOW_SCOPE_LOCAL ? window.localStorage : window.sessionStorage;
};

export const buildBoardRecoverySnapshot = (payload = {}, options = {}) => ({
    ...payload,
    updatedAt: toEpochMillis(options.updatedAt ?? payload.updatedAt ?? Date.now()),
    syncVersion: toSafeSyncVersion(options.syncVersion ?? payload.syncVersion),
    clientRevision: toSafeClientRevision(options.clientRevision ?? payload.clientRevision)
});

export const persistBoardShadowSnapshot = (boardId, payload, options = {}) => {
    const scope = options.scope || SHADOW_SCOPE_SESSION;
    const storage = getScopedStorage(scope);
    if (!storage || !boardId || !payload) return false;

    try {
        storage.setItem(getBoardShadowStorageKey(boardId), JSON.stringify(payload));
        debugLog.storage(`[Storage] ${scope} shadow snapshot saved for board ${boardId}`);
        return true;
    } catch (error) {
        debugLog.error(`[Storage] ${scope} shadow snapshot save failed for board ${boardId}`, error);
        return false;
    }
};

export const loadBoardShadowSnapshot = (boardId, options = {}) => {
    const scope = options.scope || SHADOW_SCOPE_SESSION;
    const storage = getScopedStorage(scope);
    if (!storage || !boardId) return null;

    try {
        const raw = storage.getItem(getBoardShadowStorageKey(boardId));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        debugLog.error(`[Storage] ${scope} shadow snapshot load failed for board ${boardId}`, error);
        return null;
    }
};

export const clearBoardShadowSnapshot = (boardId, options = {}) => {
    const scope = options.scope || 'both';
    const scopesToClear = scope === 'both' ? [SHADOW_SCOPE_SESSION, SHADOW_SCOPE_LOCAL] : [scope];

    scopesToClear.forEach((currentScope) => {
        const storage = getScopedStorage(currentScope);
        if (!storage || !boardId) return;

        try {
            storage.removeItem(getBoardShadowStorageKey(boardId));
        } catch (error) {
            console.error(`[Storage] Failed to clear ${currentScope} shadow snapshot for board ${boardId}`, error);
        }
    });
};

export const pickMostRecentBoardSnapshot = (candidates = []) => {
    let bestCandidate = null;

    candidates.forEach((candidate) => {
        if (!candidate?.snapshot) return;
        if (!bestCandidate || isPersistenceSnapshotNewer(candidate.snapshot, bestCandidate.snapshot)) {
            bestCandidate = candidate;
        }
    });

    if (!bestCandidate) {
        return { snapshot: null, source: 'empty' };
    }

    return bestCandidate;
};

export const loadMostRecentBoardShadowSnapshot = (boardId) => pickMostRecentBoardSnapshot([
    { snapshot: loadBoardShadowSnapshot(boardId, { scope: SHADOW_SCOPE_SESSION }), source: 'shadow_session' },
    { snapshot: loadBoardShadowSnapshot(boardId, { scope: SHADOW_SCOPE_LOCAL }), source: 'shadow_local' }
]);

export const pickPreferredBoardSnapshot = ({ persistedSnapshot, shadowSnapshot }) => {
    return pickMostRecentBoardSnapshot([
        { snapshot: persistedSnapshot, source: 'persisted' },
        { snapshot: shadowSnapshot, source: 'shadow' }
    ]);
};
