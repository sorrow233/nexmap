import {
    BOARD_PATCH_OP_CARD_REMOVE,
    BOARD_PATCH_OP_CARD_UPSERT,
    BOARD_PATCH_OP_MESSAGE_APPEND,
    applyIncrementalPatchToBoard,
    buildIncrementalPatchCandidate
} from '../sync/boardIncrementalPatch';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';

export const BOARD_OPERATION_ENVELOPE_KIND = 'board_local_first_envelope_v1';
export const BOARD_OPERATION_CONNECTIONS_REPLACE = 'connections_replace';
export const BOARD_OPERATION_GROUPS_REPLACE = 'groups_replace';
export const BOARD_OPERATION_PROMPTS_REPLACE = 'board_prompts_replace';
export const BOARD_OPERATION_INSTRUCTION_SETTINGS_REPLACE = 'instruction_settings_replace';
export const BOARD_OPERATION_CARDS_REPLACE = 'cards_replace';

const safeArray = (value) => (Array.isArray(value) ? value : []);

const isObject = (value) => value !== null && typeof value === 'object';

const deepEqual = (left, right) => {
    if (left === right) return true;
    if (!isObject(left) || !isObject(right)) return false;

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
            return false;
        }
        for (let index = 0; index < left.length; index += 1) {
            if (!deepEqual(left[index], right[index])) return false;
        }
        return true;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;

    for (const key of leftKeys) {
        if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
        if (!deepEqual(left[key], right[key])) return false;
    }

    return true;
};

const normalizeBoardData = (board = {}) => ({
    cards: safeArray(board.cards),
    connections: safeArray(board.connections),
    groups: safeArray(board.groups),
    boardPrompts: safeArray(board.boardPrompts),
    boardInstructionSettings: normalizeBoardInstructionSettings(
        board.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});

const buildCardOperations = ({ baseBoard, nextBoard, fromClientRevision, toClientRevision, updatedAt }) => {
    const alignedBaseBoard = {
        ...baseBoard,
        connections: nextBoard.connections,
        groups: nextBoard.groups,
        boardPrompts: nextBoard.boardPrompts,
        boardInstructionSettings: nextBoard.boardInstructionSettings
    };

    const candidate = buildIncrementalPatchCandidate({
        baseBoard: alignedBaseBoard,
        nextBoard,
        fromClientRevision,
        toClientRevision,
        updatedAt
    });

    if (candidate?.eligible) {
        return candidate.patch.ops;
    }

    if (deepEqual(baseBoard.cards, nextBoard.cards)) {
        return [];
    }

    return [{
        type: BOARD_OPERATION_CARDS_REPLACE,
        cards: nextBoard.cards
    }];
};

const estimateBytes = (value) => {
    try {
        return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
        return 0;
    }
};

export const buildBoardOperationEnvelope = ({
    boardId,
    actorId,
    opId,
    lamport,
    createdAt = Date.now(),
    baseBoard,
    nextBoard,
    fromClientRevision = 0,
    toClientRevision = 0
}) => {
    const previous = normalizeBoardData(baseBoard || {});
    const next = normalizeBoardData(nextBoard || {});
    const ops = [];

    if (!deepEqual(previous.connections, next.connections)) {
        ops.push({
            type: BOARD_OPERATION_CONNECTIONS_REPLACE,
            connections: next.connections
        });
    }

    if (!deepEqual(previous.groups, next.groups)) {
        ops.push({
            type: BOARD_OPERATION_GROUPS_REPLACE,
            groups: next.groups
        });
    }

    if (!deepEqual(previous.boardPrompts, next.boardPrompts)) {
        ops.push({
            type: BOARD_OPERATION_PROMPTS_REPLACE,
            boardPrompts: next.boardPrompts
        });
    }

    if (!deepEqual(previous.boardInstructionSettings, next.boardInstructionSettings)) {
        ops.push({
            type: BOARD_OPERATION_INSTRUCTION_SETTINGS_REPLACE,
            boardInstructionSettings: next.boardInstructionSettings
        });
    }

    ops.push(...buildCardOperations({
        baseBoard: previous,
        nextBoard: next,
        fromClientRevision,
        toClientRevision,
        updatedAt: createdAt
    }));

    if (ops.length === 0) {
        return null;
    }

    return {
        kind: BOARD_OPERATION_ENVELOPE_KIND,
        boardId: typeof boardId === 'string' ? boardId : '',
        actorId: typeof actorId === 'string' ? actorId : '',
        opId: typeof opId === 'string' ? opId : '',
        lamport: Number.isFinite(Number(lamport)) ? Number(lamport) : 0,
        fromClientRevision: Number.isFinite(Number(fromClientRevision)) ? Number(fromClientRevision) : 0,
        toClientRevision: Number.isFinite(Number(toClientRevision)) ? Number(toClientRevision) : 0,
        createdAt: Number.isFinite(Number(createdAt)) ? Number(createdAt) : Date.now(),
        ackedAt: 0,
        opCount: ops.length,
        approxBytes: estimateBytes(ops),
        ops
    };
};

const applyStructuralOperation = (board, op) => {
    switch (op?.type) {
    case BOARD_OPERATION_CONNECTIONS_REPLACE:
        return { ...board, connections: safeArray(op.connections) };
    case BOARD_OPERATION_GROUPS_REPLACE:
        return { ...board, groups: safeArray(op.groups) };
    case BOARD_OPERATION_PROMPTS_REPLACE:
        return { ...board, boardPrompts: safeArray(op.boardPrompts) };
    case BOARD_OPERATION_INSTRUCTION_SETTINGS_REPLACE:
        return {
            ...board,
            boardInstructionSettings: normalizeBoardInstructionSettings(
                op.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
            )
        };
    case BOARD_OPERATION_CARDS_REPLACE:
        return {
            ...board,
            cards: safeArray(op.cards)
        };
    default:
        return board;
    }
};

const isPatchOperation = (op) => (
    op?.type === BOARD_PATCH_OP_CARD_UPSERT ||
    op?.type === BOARD_PATCH_OP_CARD_REMOVE ||
    op?.type === BOARD_PATCH_OP_MESSAGE_APPEND
);

export const applyBoardOperationEnvelope = (board, envelope) => {
    const normalizedBoard = normalizeBoardData(board);
    const ops = safeArray(envelope?.ops);
    if (ops.length === 0) return normalizedBoard;

    const structuralOps = ops.filter((op) => !isPatchOperation(op));
    const patchOps = ops.filter(isPatchOperation);

    let nextBoard = structuralOps.reduce((draft, op) => applyStructuralOperation(draft, op), normalizedBoard);

    if (patchOps.length > 0) {
        nextBoard = applyIncrementalPatchToBoard(nextBoard, { ops: patchOps });
    }

    return normalizeBoardData(nextBoard);
};
