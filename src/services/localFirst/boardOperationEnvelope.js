import { applyIncrementalPatchToBoard, buildIncrementalPatchCandidate } from '../sync/boardIncrementalPatch.js';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService.js';

export const BOARD_OPERATION_ENVELOPE_KIND = 'board_local_first_envelope_v2';

const safeArray = (value) => (Array.isArray(value) ? value : []);

const estimateBytes = (value) => {
    try {
        return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
        return 0;
    }
};

const normalizeBoardData = (board = {}) => ({
    ...board,
    cards: safeArray(board.cards),
    connections: safeArray(board.connections),
    groups: safeArray(board.groups),
    boardPrompts: safeArray(board.boardPrompts),
    boardInstructionSettings: normalizeBoardInstructionSettings(
        board.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});

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
    const candidate = buildIncrementalPatchCandidate({
        baseBoard: normalizeBoardData(baseBoard || {}),
        nextBoard: normalizeBoardData(nextBoard || {}),
        fromClientRevision,
        toClientRevision,
        updatedAt: createdAt,
        options: {
            maxOps: Number.POSITIVE_INFINITY,
            maxBytes: Number.POSITIVE_INFINITY
        }
    });

    if (!candidate?.eligible || !Array.isArray(candidate.patch?.ops) || candidate.patch.ops.length === 0) {
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
        opCount: candidate.patch.ops.length,
        approxBytes: estimateBytes(candidate.patch.ops),
        ops: candidate.patch.ops
    };
};

export const applyBoardOperationEnvelope = (board, envelope) => {
    const normalizedBoard = normalizeBoardData(board || {});
    const ops = safeArray(envelope?.ops);
    if (ops.length === 0) return normalizedBoard;
    return normalizeBoardData(applyIncrementalPatchToBoard(normalizedBoard, { ops }));
};
