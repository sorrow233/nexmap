import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService.js';

export const BOARD_PATCH_OP_CONNECTION_UPSERT = 'connection_upsert';
export const BOARD_PATCH_OP_CONNECTION_REMOVE = 'connection_remove';
export const BOARD_PATCH_OP_GROUP_UPSERT = 'group_upsert';
export const BOARD_PATCH_OP_GROUP_REMOVE = 'group_remove';
export const BOARD_PATCH_OP_BOARD_PROMPT_UPSERT = 'board_prompt_upsert';
export const BOARD_PATCH_OP_BOARD_PROMPT_REMOVE = 'board_prompt_remove';
export const BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_ENABLED = 'instruction_settings_set_enabled';
export const BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_ENABLED = 'instruction_settings_set_auto_enabled';
export const BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_MODE = 'instruction_settings_set_mode';
export const BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_SELECTION = 'instruction_settings_set_auto_selection';

const safeArray = (value) => (Array.isArray(value) ? value : []);

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const deepEqual = (left, right) => {
    if (left === right) return true;
    if (!isObject(left) && !Array.isArray(left) && !isObject(right) && !Array.isArray(right)) {
        return false;
    }

    const leftIsArray = Array.isArray(left);
    const rightIsArray = Array.isArray(right);
    if (leftIsArray !== rightIsArray) return false;

    if (leftIsArray && rightIsArray) {
        if (left.length !== right.length) return false;
        for (let index = 0; index < left.length; index += 1) {
            if (!deepEqual(left[index], right[index])) return false;
        }
        return true;
    }

    if (!isObject(left) || !isObject(right)) return false;

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;

    for (const key of leftKeys) {
        if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
        if (!deepEqual(left[key], right[key])) return false;
    }

    return true;
};

export const normalizeConnection = (connection) => {
    if (!isObject(connection)) return null;
    const from = String(connection.from || '').trim();
    const to = String(connection.to || '').trim();
    if (!from || !to || from === to) return null;
    const [first, second] = [from, to].sort();
    return {
        ...connection,
        from: first,
        to: second
    };
};

export const buildConnectionKey = (connection) => {
    const normalized = normalizeConnection(connection);
    return normalized ? `${normalized.from}::${normalized.to}` : '';
};

const buildEntityMap = (items = [], getKey) => {
    const map = new Map();
    items.forEach((item) => {
        const key = getKey(item);
        if (!key) return;
        map.set(key, item);
    });
    return map;
};

const toStableEntityList = (items = [], getKey, normalizer = (value) => value) => {
    const seen = new Set();
    const normalized = [];

    safeArray(items).forEach((item) => {
        const nextItem = normalizer(item);
        const key = getKey(nextItem);
        if (!key || seen.has(key)) return;
        seen.add(key);
        normalized.push(nextItem);
    });

    return normalized;
};

export const toStableStructuralBoardShape = (board = {}) => ({
    connections: toStableEntityList(board.connections, buildConnectionKey, normalizeConnection),
    groups: toStableEntityList(
        board.groups,
        (group) => (typeof group?.id === 'string' ? group.id : ''),
        (group) => (isObject(group) ? group : null)
    ),
    boardPrompts: toStableEntityList(
        board.boardPrompts,
        (prompt) => (typeof prompt?.id === 'string' ? prompt.id : ''),
        (prompt) => (isObject(prompt) ? prompt : null)
    ),
    boardInstructionSettings: normalizeBoardInstructionSettings(
        board.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});

const buildEntityUpsertRemoveOps = ({
    previousItems = [],
    nextItems = [],
    getKey,
    buildUpsert,
    buildRemove
}) => {
    const previousMap = buildEntityMap(previousItems, getKey);
    const nextMap = buildEntityMap(nextItems, getKey);
    const ops = [];

    previousMap.forEach((item, key) => {
        if (!nextMap.has(key)) {
            ops.push(buildRemove(item, key));
        }
    });

    nextMap.forEach((item, key) => {
        const previousItem = previousMap.get(key);
        if (!previousItem || !deepEqual(previousItem, item)) {
            ops.push(buildUpsert(item, key));
        }
    });

    return ops.filter(Boolean);
};

export const buildBoardStructuralPatchOperations = (previousBoard = {}, nextBoard = {}) => {
    const previous = toStableStructuralBoardShape(previousBoard);
    const next = toStableStructuralBoardShape(nextBoard);
    const ops = [];

    ops.push(...buildEntityUpsertRemoveOps({
        previousItems: previous.connections,
        nextItems: next.connections,
        getKey: buildConnectionKey,
        buildUpsert: (connection, connectionKey) => ({
            type: BOARD_PATCH_OP_CONNECTION_UPSERT,
            connectionKey,
            connection
        }),
        buildRemove: (connection, connectionKey) => ({
            type: BOARD_PATCH_OP_CONNECTION_REMOVE,
            connectionKey,
            from: connection.from,
            to: connection.to
        })
    }));

    ops.push(...buildEntityUpsertRemoveOps({
        previousItems: previous.groups,
        nextItems: next.groups,
        getKey: (group) => (typeof group?.id === 'string' ? group.id : ''),
        buildUpsert: (group) => ({
            type: BOARD_PATCH_OP_GROUP_UPSERT,
            groupId: group.id,
            group
        }),
        buildRemove: (group) => ({
            type: BOARD_PATCH_OP_GROUP_REMOVE,
            groupId: group.id
        })
    }));

    ops.push(...buildEntityUpsertRemoveOps({
        previousItems: previous.boardPrompts,
        nextItems: next.boardPrompts,
        getKey: (prompt) => (typeof prompt?.id === 'string' ? prompt.id : ''),
        buildUpsert: (prompt) => ({
            type: BOARD_PATCH_OP_BOARD_PROMPT_UPSERT,
            promptId: prompt.id,
            prompt
        }),
        buildRemove: (prompt) => ({
            type: BOARD_PATCH_OP_BOARD_PROMPT_REMOVE,
            promptId: prompt.id
        })
    }));

    if (!deepEqual(previous.boardInstructionSettings.enabledInstructionIds, next.boardInstructionSettings.enabledInstructionIds)) {
        ops.push({
            type: BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_ENABLED,
            enabledInstructionIds: next.boardInstructionSettings.enabledInstructionIds
        });
    }

    if (!deepEqual(previous.boardInstructionSettings.autoEnabledInstructionIds, next.boardInstructionSettings.autoEnabledInstructionIds)) {
        ops.push({
            type: BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_ENABLED,
            autoEnabledInstructionIds: next.boardInstructionSettings.autoEnabledInstructionIds
        });
    }

    if (previous.boardInstructionSettings.autoSelectionMode !== next.boardInstructionSettings.autoSelectionMode) {
        ops.push({
            type: BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_MODE,
            autoSelectionMode: next.boardInstructionSettings.autoSelectionMode
        });
    }

    if (!deepEqual(previous.boardInstructionSettings.autoSelection, next.boardInstructionSettings.autoSelection)) {
        ops.push({
            type: BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_SELECTION,
            autoSelection: next.boardInstructionSettings.autoSelection
        });
    }

    return ops;
};

const upsertEntityInList = (items = [], nextItem, getKey) => {
    const nextKey = getKey(nextItem);
    if (!nextKey) return items;
    const existingIndex = items.findIndex((item) => getKey(item) === nextKey);
    if (existingIndex === -1) {
        return [...items, nextItem];
    }
    const nextItems = items.slice();
    nextItems[existingIndex] = nextItem;
    return nextItems;
};

const removeEntityFromList = (items = [], targetKey, getKey) => {
    if (!targetKey) return items;
    const existingIndex = items.findIndex((item) => getKey(item) === targetKey);
    if (existingIndex === -1) return items;
    const nextItems = items.slice();
    nextItems.splice(existingIndex, 1);
    return nextItems;
};

export const applyBoardStructuralPatchOperations = (board = {}, ops = []) => {
    const stableBoard = {
        ...board,
        ...toStableStructuralBoardShape(board)
    };

    let nextConnections = safeArray(stableBoard.connections);
    let nextGroups = safeArray(stableBoard.groups);
    let nextBoardPrompts = safeArray(stableBoard.boardPrompts);
    let nextInstructionSettings = normalizeBoardInstructionSettings(
        stableBoard.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    );

    safeArray(ops).forEach((op) => {
        if (!isObject(op)) return;

        switch (op.type) {
        case BOARD_PATCH_OP_CONNECTION_UPSERT: {
            const normalizedConnection = normalizeConnection(op.connection);
            if (!normalizedConnection) return;
            nextConnections = upsertEntityInList(nextConnections, normalizedConnection, buildConnectionKey);
            return;
        }
        case BOARD_PATCH_OP_CONNECTION_REMOVE: {
            const connectionKey = typeof op.connectionKey === 'string'
                ? op.connectionKey
                : buildConnectionKey(op);
            nextConnections = removeEntityFromList(nextConnections, connectionKey, buildConnectionKey);
            return;
        }
        case BOARD_PATCH_OP_GROUP_UPSERT:
            if (!isObject(op.group) || typeof op.group.id !== 'string') return;
            nextGroups = upsertEntityInList(nextGroups, op.group, (group) => group?.id || '');
            return;
        case BOARD_PATCH_OP_GROUP_REMOVE:
            nextGroups = removeEntityFromList(nextGroups, String(op.groupId || ''), (group) => group?.id || '');
            return;
        case BOARD_PATCH_OP_BOARD_PROMPT_UPSERT:
            if (!isObject(op.prompt) || typeof op.prompt.id !== 'string') return;
            nextBoardPrompts = upsertEntityInList(nextBoardPrompts, op.prompt, (prompt) => prompt?.id || '');
            return;
        case BOARD_PATCH_OP_BOARD_PROMPT_REMOVE:
            nextBoardPrompts = removeEntityFromList(nextBoardPrompts, String(op.promptId || ''), (prompt) => prompt?.id || '');
            return;
        case BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_ENABLED:
            nextInstructionSettings = normalizeBoardInstructionSettings({
                ...nextInstructionSettings,
                enabledInstructionIds: safeArray(op.enabledInstructionIds)
            });
            return;
        case BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_ENABLED:
            nextInstructionSettings = normalizeBoardInstructionSettings({
                ...nextInstructionSettings,
                autoEnabledInstructionIds: safeArray(op.autoEnabledInstructionIds)
            });
            return;
        case BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_MODE:
            nextInstructionSettings = normalizeBoardInstructionSettings({
                ...nextInstructionSettings,
                autoSelectionMode: typeof op.autoSelectionMode === 'string'
                    ? op.autoSelectionMode
                    : nextInstructionSettings.autoSelectionMode
            });
            return;
        case BOARD_PATCH_OP_INSTRUCTION_SETTINGS_SET_AUTO_SELECTION:
            nextInstructionSettings = normalizeBoardInstructionSettings({
                ...nextInstructionSettings,
                autoSelection: isObject(op.autoSelection)
                    ? op.autoSelection
                    : nextInstructionSettings.autoSelection
            });
            return;
        default:
            return;
        }
    });

    return {
        ...stableBoard,
        connections: nextConnections,
        groups: nextGroups,
        boardPrompts: nextBoardPrompts,
        boardInstructionSettings: nextInstructionSettings
    };
};
