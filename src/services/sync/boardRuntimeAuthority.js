const BOARD_RUNTIME_KEYS = Object.freeze([
    'cards',
    'connections',
    'groups',
    'boardPrompts',
    'boardInstructionSettings'
]);

const AUTHORITATIVE_PATCH_DEBOUNCE_MS = 900;

let activeBoardRuntime = null;

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const pickBoardRuntimePatch = (value = {}) => Object.fromEntries(
    BOARD_RUNTIME_KEYS
        .filter((key) => hasOwn(value, key))
        .map((key) => [key, value[key]])
);

export const hasBoardRuntimePatch = (value = {}) => (
    BOARD_RUNTIME_KEYS.some((key) => hasOwn(value, key))
);

const clearRuntimeFlushTimer = (runtime = null) => {
    if (!runtime?.flushTimer) return;
    clearTimeout(runtime.flushTimer);
    runtime.flushTimer = null;
};

const flushRuntimePatch = (runtime = null, reason = 'debounced_patch') => {
    if (!runtime?.controller) {
        return null;
    }

    clearRuntimeFlushTimer(runtime);

    const pendingPatch = runtime.pendingPatch;
    runtime.pendingPatch = null;

    if (!pendingPatch || Object.keys(pendingPatch).length === 0) {
        return null;
    }

    if (!runtime.controller.started || typeof runtime.controller.commitAuthoritativeLocalSnapshot !== 'function') {
        return {
            committedSnapshot: null,
            boardPatch: pendingPatch
        };
    }

    const currentSnapshot = runtime.controller.readCurrentSnapshot?.();
    if (!currentSnapshot) {
        return {
            committedSnapshot: null,
            boardPatch: pendingPatch
        };
    }

    console.info('[BoardSync] uplink via runtime-authority snapshot', {
        boardId: runtime.boardId,
        reason,
        keys: Object.keys(pendingPatch)
    });

    const committedSnapshot = runtime.controller.commitAuthoritativeLocalSnapshot({
        ...currentSnapshot,
        ...pendingPatch
    });

    return {
        committedSnapshot,
        boardPatch: pickBoardRuntimePatch(committedSnapshot)
    };
};

const scheduleRuntimePatchFlush = (runtime = null, reason = 'debounced_patch') => {
    if (!runtime?.controller) {
        return;
    }

    if (runtime.flushTimer) {
        return;
    }

    runtime.flushTimer = setTimeout(() => {
        runtime.flushTimer = null;
        flushRuntimePatch(runtime, reason);
    }, AUTHORITATIVE_PATCH_DEBOUNCE_MS);
};

export const registerActiveBoardRuntime = ({ boardId, controller } = {}) => {
    if (!boardId || !controller) {
        flushRuntimePatch(activeBoardRuntime, 'runtime_reset');
        activeBoardRuntime = null;
        return;
    }

    if (
        activeBoardRuntime &&
        (
            activeBoardRuntime.boardId !== boardId
            || activeBoardRuntime.controller !== controller
        )
    ) {
        flushRuntimePatch(activeBoardRuntime, 'runtime_switch');
    }

    activeBoardRuntime = {
        boardId,
        controller,
        pendingPatch: null,
        flushTimer: null
    };
};

export const unregisterActiveBoardRuntime = ({ boardId, controller } = {}) => {
    if (!activeBoardRuntime) return;

    if (boardId && activeBoardRuntime.boardId !== boardId) {
        return;
    }

    if (controller && activeBoardRuntime.controller !== controller) {
        return;
    }

    flushRuntimePatch(activeBoardRuntime, 'runtime_unregister');
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
    const runtime = activeBoardRuntime;
    const controller = runtime?.controller;
    if (!controller?.started || typeof controller.commitAuthoritativeLocalSnapshot !== 'function') {
        return null;
    }

    const boardPatch = pickBoardRuntimePatch(partial);
    if (Object.keys(boardPatch).length === 0) {
        return null;
    }

    runtime.pendingPatch = {
        ...(runtime.pendingPatch || {}),
        ...boardPatch
    };
    scheduleRuntimePatchFlush(runtime, 'queued_patch');

    return {
        committedSnapshot: null,
        boardPatch
    };
};

export const commitActiveBoardRuntimeSnapshot = (snapshot = {}) => {
    const runtime = activeBoardRuntime;
    const controller = runtime?.controller;
    if (!controller?.started || typeof controller.commitAuthoritativeLocalSnapshot !== 'function') {
        return null;
    }

    clearRuntimeFlushTimer(runtime);
    if (runtime) {
        runtime.pendingPatch = null;
    }

    console.info('[BoardSync] uplink via runtime-authority snapshot', {
        boardId: runtime?.boardId,
        reason: 'immediate_snapshot',
        keys: Object.keys(pickBoardRuntimePatch(snapshot))
    });

    const committedSnapshot = controller.commitAuthoritativeLocalSnapshot(snapshot);
    return {
        committedSnapshot,
        boardPatch: pickBoardRuntimePatch(committedSnapshot)
    };
};
