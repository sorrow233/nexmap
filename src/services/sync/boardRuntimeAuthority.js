import { normalizeBoardSnapshot } from './boardSnapshot';

const BOARD_RUNTIME_KEYS = Object.freeze([
    'cards',
    'connections',
    'groups',
    'boardPrompts',
    'boardInstructionSettings'
]);

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

export const registerActiveBoardRuntime = ({ boardId, controller } = {}) => {
    if (!boardId || !controller) {
        activeBoardRuntime = null;
        return;
    }

    activeBoardRuntime = {
        boardId,
        controller
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
    if (!controller?.started || typeof controller.commitAuthoritativeLocalSnapshot !== 'function') {
        return null;
    }

    const currentSnapshot = controller.readCurrentSnapshot?.();
    if (!currentSnapshot) {
        return null;
    }

    const nextSnapshot = normalizeBoardSnapshot({
        ...currentSnapshot,
        ...pickBoardRuntimePatch(partial)
    });
    const committedSnapshot = controller.commitAuthoritativeLocalSnapshot(nextSnapshot);

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

    const committedSnapshot = controller.commitAuthoritativeLocalSnapshot(snapshot);
    return {
        committedSnapshot,
        boardPatch: pickBoardRuntimePatch(committedSnapshot)
    };
};
