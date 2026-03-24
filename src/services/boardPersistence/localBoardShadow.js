import { debugLog } from '../../utils/debugLogger';
import {
    idbDel,
    idbGet,
    idbSet
} from '../db/indexedDB';
import {
    isPersistenceSnapshotNewer,
    toEpochMillis,
    toSafeClientRevision
} from './persistenceCursor';
import { normalizeBoardSnapshot } from '../sync/boardSnapshot';

const BOARD_SHADOW_PREFIX = 'mixboard_board_shadow_';
const BOARD_SHADOW_IDB_PREFIX = 'mixboard_shadow_snapshot_';
const SHADOW_SCOPE_SESSION = 'session';
const SHADOW_SCOPE_LOCAL = 'local';
const SHADOW_SCOPE_BOTH = 'both';
const RECOVERY_TRACKED_KEYS = Object.freeze([
    'cards',
    'connections',
    'groups',
    'boardPrompts',
    'boardInstructionSettings'
]);

const shadowOperationChains = new Map();

const getBoardShadowStorageKey = (boardId) => `${BOARD_SHADOW_PREFIX}${boardId}`;
const getBoardShadowIdbKey = (boardId, scope = SHADOW_SCOPE_SESSION) => (
    `${BOARD_SHADOW_IDB_PREFIX}${scope}:${boardId}`
);

const getScopedStorage = (scope = SHADOW_SCOPE_SESSION) => {
    if (typeof window === 'undefined') return null;
    return scope === SHADOW_SCOPE_LOCAL ? window.localStorage : window.sessionStorage;
};

const getScopesToHandle = (scope = SHADOW_SCOPE_BOTH) => (
    scope === SHADOW_SCOPE_BOTH
        ? [SHADOW_SCOPE_SESSION, SHADOW_SCOPE_LOCAL]
        : [scope]
);

const hasOwnField = (value, key) => (
    Boolean(value) && Object.prototype.hasOwnProperty.call(value, key)
);

const buildRecoverySnapshotExtras = (payload = {}) => Object.fromEntries(
    Object.entries(payload).filter(([key]) => !RECOVERY_TRACKED_KEYS.includes(key))
);

const fillMissingTrackedFields = (primarySnapshot = {}, candidates = []) => {
    const nextSnapshot = { ...primarySnapshot };

    RECOVERY_TRACKED_KEYS.forEach((key) => {
        if (hasOwnField(primarySnapshot, key)) {
            return;
        }

        const fallbackCandidate = candidates.find((candidate) => hasOwnField(candidate?.snapshot, key));
        if (fallbackCandidate) {
            nextSnapshot[key] = fallbackCandidate.snapshot[key];
        }
    });

    return nextSnapshot;
};

const withShadowOperationQueue = (boardId, scope, operation) => {
    const queueKey = `${scope}:${boardId}`;
    const previousChain = shadowOperationChains.get(queueKey) || Promise.resolve();
    const nextChain = previousChain
        .catch(() => undefined)
        .then(async () => operation());
    const trackedChain = nextChain.catch(() => undefined);
    shadowOperationChains.set(queueKey, trackedChain);
    return nextChain.finally(() => {
        if (shadowOperationChains.get(queueKey) === trackedChain) {
            shadowOperationChains.delete(queueKey);
        }
    });
};

const normalizeShadowRecord = (boardId, scope, snapshot = {}) => ({
    boardId,
    scope,
    savedAt: toEpochMillis(snapshot.updatedAt ?? Date.now()),
    snapshot: buildBoardRecoverySnapshot(snapshot)
});

const loadLegacyBoardShadowSnapshot = (boardId, scope = SHADOW_SCOPE_SESSION) => {
    const storage = getScopedStorage(scope);
    if (!storage || !boardId) return null;

    try {
        const raw = storage.getItem(getBoardShadowStorageKey(boardId));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        debugLog.error(`[Storage] ${scope} legacy shadow snapshot load failed for board ${boardId}`, error);
        return null;
    }
};

const clearLegacyBoardShadowSnapshot = (boardId, scope = SHADOW_SCOPE_BOTH) => {
    getScopesToHandle(scope).forEach((currentScope) => {
        const storage = getScopedStorage(currentScope);
        if (!storage || !boardId) return;

        try {
            storage.removeItem(getBoardShadowStorageKey(boardId));
        } catch (error) {
            console.error(`[Storage] Failed to clear legacy ${currentScope} shadow snapshot for board ${boardId}`, error);
        }
    });
};

export const buildBoardRecoverySnapshot = (payload = {}, options = {}) => {
    const normalized = normalizeBoardSnapshot(payload);

    return {
        ...buildRecoverySnapshotExtras(payload),
        ...normalized,
        updatedAt: toEpochMillis(options.updatedAt ?? payload.updatedAt ?? Date.now()),
        clientRevision: toSafeClientRevision(options.clientRevision ?? payload.clientRevision)
    };
};

export const persistBoardShadowSnapshot = async (boardId, payload, options = {}) => {
    const scope = options.scope || SHADOW_SCOPE_SESSION;
    if (!boardId || !payload) return false;

    const nextSnapshot = buildBoardRecoverySnapshot(payload);
    const idbKey = getBoardShadowIdbKey(boardId, scope);

    return withShadowOperationQueue(boardId, scope, async () => {
        try {
            const currentRecord = await idbGet(idbKey);
            const currentSnapshot = currentRecord?.snapshot || null;
            if (currentSnapshot && !isPersistenceSnapshotNewer(nextSnapshot, currentSnapshot)) {
                return true;
            }

            await idbSet(idbKey, normalizeShadowRecord(boardId, scope, nextSnapshot));
            clearLegacyBoardShadowSnapshot(boardId, scope);
            debugLog.storage(`[Storage] ${scope} shadow snapshot saved to IndexedDB for board ${boardId}`);
            return true;
        } catch (error) {
            debugLog.error(`[Storage] ${scope} shadow snapshot save failed for board ${boardId}`, error);
            return false;
        }
    });
};

export const loadBoardShadowSnapshot = async (boardId, options = {}) => {
    const scope = options.scope || SHADOW_SCOPE_SESSION;
    if (!boardId) return null;

    const idbKey = getBoardShadowIdbKey(boardId, scope);
    let indexedSnapshot = null;

    try {
        const record = await idbGet(idbKey);
        indexedSnapshot = record?.snapshot || null;
    } catch (error) {
        debugLog.error(`[Storage] ${scope} shadow snapshot IndexedDB load failed for board ${boardId}`, error);
    }

    const legacySnapshot = loadLegacyBoardShadowSnapshot(boardId, scope);
    const { snapshot: preferredSnapshot, source } = pickMostRecentBoardSnapshot([
        { snapshot: indexedSnapshot, source: `${scope}_idb` },
        { snapshot: legacySnapshot, source: `${scope}_legacy` }
    ]);

    if (legacySnapshot && source === `${scope}_legacy`) {
        const migrated = await persistBoardShadowSnapshot(boardId, legacySnapshot, { scope });
        if (migrated) {
            clearLegacyBoardShadowSnapshot(boardId, scope);
        }
    } else if (legacySnapshot && indexedSnapshot) {
        clearLegacyBoardShadowSnapshot(boardId, scope);
    }

    return preferredSnapshot;
};

export const clearBoardShadowSnapshot = async (boardId, options = {}) => {
    const scope = options.scope || SHADOW_SCOPE_BOTH;
    if (!boardId) return;

    await Promise.all(getScopesToHandle(scope).map((currentScope) => (
        withShadowOperationQueue(boardId, currentScope, async () => {
            try {
                await idbDel(getBoardShadowIdbKey(boardId, currentScope));
            } catch (error) {
                debugLog.error(`[Storage] Failed to clear ${currentScope} shadow snapshot from IndexedDB for board ${boardId}`, error);
            }
        })
    )));

    clearLegacyBoardShadowSnapshot(boardId, scope);
};

export const pickMostRecentBoardSnapshot = (candidates = []) => {
    const validCandidates = candidates.filter((candidate) => candidate?.snapshot);
    let bestCandidate = null;

    validCandidates.forEach((candidate) => {
        if (!bestCandidate || isPersistenceSnapshotNewer(candidate.snapshot, bestCandidate.snapshot)) {
            bestCandidate = candidate;
        }
    });

    if (!bestCandidate) {
        return { snapshot: null, source: 'empty' };
    }

    return {
        snapshot: buildBoardRecoverySnapshot(fillMissingTrackedFields(
            bestCandidate.snapshot,
            validCandidates.filter((candidate) => candidate !== bestCandidate)
        )),
        source: bestCandidate.source
    };
};

export const loadMostRecentBoardShadowSnapshot = async (boardId) => {
    const [sessionSnapshot, localSnapshot] = await Promise.all([
        loadBoardShadowSnapshot(boardId, { scope: SHADOW_SCOPE_SESSION }),
        loadBoardShadowSnapshot(boardId, { scope: SHADOW_SCOPE_LOCAL })
    ]);

    return pickMostRecentBoardSnapshot([
        { snapshot: sessionSnapshot, source: 'shadow_session' },
        { snapshot: localSnapshot, source: 'shadow_local' }
    ]);
};

export const pickPreferredBoardSnapshot = ({ persistedSnapshot, shadowSnapshot }) => {
    return pickMostRecentBoardSnapshot([
        { snapshot: persistedSnapshot, source: 'persisted' },
        { snapshot: shadowSnapshot, source: 'shadow' }
    ]);
};
