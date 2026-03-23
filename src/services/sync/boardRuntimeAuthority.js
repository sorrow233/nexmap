import {
    readBoardFieldFromDoc,
    readBoardRuntimePatchFromDoc
} from './boardYDoc';

export const BOARD_RUNTIME_KEYS = Object.freeze([
    'cards',
    'connections',
    'groups',
    'boardPrompts',
    'boardInstructionSettings'
]);

const RUNTIME_VIEW_SYNC_DEBOUNCE_MS = 500;

let activeBoardRuntime = null;
let boardRuntimeStoreWriteScope = '';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const pickBoardRuntimePatch = (value = {}) => Object.fromEntries(
    BOARD_RUNTIME_KEYS
        .filter((key) => hasOwn(value, key))
        .map((key) => [key, value[key]])
);

const flushRuntimeViewSync = (runtime = null) => {
    if (!runtime?.controller?.started || typeof runtime.onViewSync !== 'function') {
        if (runtime) {
            runtime.pendingViewKeys.clear();
            runtime.pendingViewOrigin = '';
            runtime.viewSyncScheduled = false;
            if (runtime.viewSyncTimer) {
                clearTimeout(runtime.viewSyncTimer);
                runtime.viewSyncTimer = null;
            }
        }
        return;
    }

    runtime.viewSyncScheduled = false;
    if (runtime.viewSyncTimer) {
        clearTimeout(runtime.viewSyncTimer);
        runtime.viewSyncTimer = null;
    }

    const keys = Array.from(runtime.pendingViewKeys);
    runtime.pendingViewKeys.clear();
    if (keys.length === 0) {
        runtime.pendingViewOrigin = '';
        return;
    }

    const origin = runtime.pendingViewOrigin || 'runtime_observe';
    runtime.pendingViewOrigin = '';

    runtime.onViewSync({
        boardId: runtime.boardId,
        origin,
        keys,
        patch: readBoardRuntimePatchFromDoc(runtime.controller.doc, keys),
        updatedAt: Number(readBoardFieldFromDoc(runtime.controller.doc, 'updatedAt')) || 0,
        clientRevision: Number(readBoardFieldFromDoc(runtime.controller.doc, 'clientRevision')) || 0,
        readSnapshot: () => runtime.controller.readCurrentSnapshot?.()
    });
};

const scheduleRuntimeViewSync = (runtime = null, key, origin = 'runtime_observe') => {
    if (!runtime || !BOARD_RUNTIME_KEYS.includes(key)) {
        return;
    }

    if (
        runtime.viewSyncScheduled &&
        runtime.pendingViewOrigin &&
        runtime.pendingViewOrigin !== origin
    ) {
        flushRuntimeViewSync(runtime);
    }

    runtime.pendingViewKeys.add(key);
    runtime.pendingViewOrigin = (
        runtime.pendingViewOrigin &&
        runtime.pendingViewOrigin !== origin
    )
        ? 'mixed'
        : origin;

    if (runtime.viewSyncScheduled) {
        return;
    }

    runtime.viewSyncScheduled = true;
    runtime.viewSyncTimer = setTimeout(() => {
        if (activeBoardRuntime !== runtime) {
            return;
        }
        flushRuntimeViewSync(runtime);
    }, RUNTIME_VIEW_SYNC_DEBOUNCE_MS);
};

const bindRuntimeFieldObserver = (runtime = null, key) => {
    const root = runtime?.controller?.doc?.getMap?.('board');
    const node = root?.get(key);
    if (!node) {
        return () => { };
    }

    const handler = (events, transaction) => {
        const tx = transaction || events?.[0]?.transaction;
        scheduleRuntimeViewSync(runtime, key, tx?.origin || 'runtime_observe');
    };

    if (typeof node.observeDeep === 'function') {
        node.observeDeep(handler);
        return () => node.unobserveDeep(handler);
    }

    if (typeof node.observe === 'function') {
        node.observe(handler);
        return () => node.unobserve(handler);
    }

    return () => { };
};

const cleanupRuntimeObservers = (runtime = null) => {
    if (!runtime?.observerCleanups) {
        return;
    }

    runtime.observerCleanups.forEach((cleanup) => {
        try {
            cleanup?.();
        } catch (error) {
            console.error('[BoardSync] Failed to cleanup runtime observer:', error);
        }
    });
    runtime.observerCleanups = [];
    runtime.pendingViewKeys.clear();
    runtime.pendingViewOrigin = '';
    runtime.viewSyncScheduled = false;
    if (runtime.viewSyncTimer) {
        clearTimeout(runtime.viewSyncTimer);
        runtime.viewSyncTimer = null;
    }
};

export const hasBoardRuntimePatch = (value = {}) => (
    BOARD_RUNTIME_KEYS.some((key) => hasOwn(value, key))
);

export const hasActiveBoardRuntime = () => Boolean(activeBoardRuntime?.controller);

export const getActiveBoardRuntimeBoardId = () => activeBoardRuntime?.boardId || '';

export const getBoardRuntimeStoreWriteScope = () => boardRuntimeStoreWriteScope;

export const withBoardRuntimeStoreWriteScope = (scope, callback) => {
    const previousScope = boardRuntimeStoreWriteScope;
    boardRuntimeStoreWriteScope = scope || previousScope;
    try {
        return callback();
    } finally {
        boardRuntimeStoreWriteScope = previousScope;
    }
};

export const readActiveBoardRuntimeSnapshot = () => (
    activeBoardRuntime?.controller?.readCurrentSnapshot?.() || null
);

export const registerActiveBoardRuntime = ({ boardId, controller, onViewSync } = {}) => {
    if (!boardId || !controller) {
        cleanupRuntimeObservers(activeBoardRuntime);
        activeBoardRuntime = null;
        return;
    }

    if (activeBoardRuntime) {
        cleanupRuntimeObservers(activeBoardRuntime);
    }

    activeBoardRuntime = {
        boardId,
        controller,
        onViewSync: typeof onViewSync === 'function' ? onViewSync : null,
        observerCleanups: [],
        pendingViewKeys: new Set(),
        pendingViewOrigin: '',
        viewSyncScheduled: false,
        viewSyncTimer: null
    };

    activeBoardRuntime.observerCleanups = BOARD_RUNTIME_KEYS.map((key) => (
        bindRuntimeFieldObserver(activeBoardRuntime, key)
    ));

    activeBoardRuntime.pendingViewOrigin = 'runtime_register';
    BOARD_RUNTIME_KEYS.forEach((key) => activeBoardRuntime.pendingViewKeys.add(key));
    flushRuntimeViewSync(activeBoardRuntime);
};

export const unregisterActiveBoardRuntime = ({ boardId, controller } = {}) => {
    if (!activeBoardRuntime) return;

    if (boardId && activeBoardRuntime.boardId !== boardId) {
        return;
    }

    if (controller && activeBoardRuntime.controller !== controller) {
        return;
    }

    cleanupRuntimeObservers(activeBoardRuntime);
    activeBoardRuntime = null;
};

export const isActiveBoardRuntimeController = (boardId, controller) => (
    Boolean(
        activeBoardRuntime &&
        activeBoardRuntime.boardId === boardId &&
        activeBoardRuntime.controller === controller
    )
);

export const commitActiveBoardRuntimePatch = (partial = {}) => {
    const controller = activeBoardRuntime?.controller;
    if (!controller?.started || typeof controller.commitAuthoritativeLocalPatch !== 'function') {
        return null;
    }

    const boardPatch = pickBoardRuntimePatch(partial);
    if (Object.keys(boardPatch).length === 0) {
        return null;
    }

    if (import.meta.env.DEV) {
        console.info('[BoardSync] local authority patch', {
            boardId: activeBoardRuntime?.boardId,
            keys: Object.keys(boardPatch)
        });
    }

    const committedSnapshot = controller.commitAuthoritativeLocalPatch(boardPatch);
    return {
        committedSnapshot,
        boardPatch: pickBoardRuntimePatch(committedSnapshot)
    };
};

export const commitActiveBoardRuntimeSnapshot = (snapshot = {}) => {
    const controller = activeBoardRuntime?.controller;
    if (!controller?.started || typeof controller.commitAuthoritativeLocalSnapshot !== 'function') {
        return null;
    }

    if (import.meta.env.DEV) {
        console.info('[BoardSync] uplink via runtime-authority snapshot', {
            boardId: activeBoardRuntime?.boardId,
            reason: 'immediate_snapshot',
            keys: Object.keys(pickBoardRuntimePatch(snapshot))
        });
    }

    const committedSnapshot = controller.commitAuthoritativeLocalSnapshot(snapshot);
    return {
        committedSnapshot,
        boardPatch: pickBoardRuntimePatch(committedSnapshot)
    };
};
