import { applyIncrementalPatchToBoard } from '../sync/boardIncrementalPatch.js';
import { listPendingBoardOperationEnvelopes, readBoardOperationLogMeta } from './boardOperationLog.js';
import { loadAckedBoardSnapshot } from './boardAckedSnapshot.js';
import { rebaseBoardStateWithEnvelopes } from './boardRebaseCore.js';

const toSafeInt = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : fallback;
};

const normalizeBoardState = (board = {}) => ({
    ...board,
    cards: Array.isArray(board.cards) ? board.cards : [],
    connections: Array.isArray(board.connections) ? board.connections : [],
    groups: Array.isArray(board.groups) ? board.groups : [],
    boardPrompts: Array.isArray(board.boardPrompts) ? board.boardPrompts : []
});

export { rebaseBoardStateWithEnvelopes } from './boardRebaseCore.js';

export const rebaseRemoteBoardWithPendingOperations = async ({
    boardId,
    remoteBoard,
    afterClientRevision = 0
}) => {
    const pendingEnvelopes = await listPendingBoardOperationEnvelopes(boardId, {
        afterClientRevision
    });
    const rebaseResult = rebaseBoardStateWithEnvelopes(remoteBoard, pendingEnvelopes);

    return {
        ...rebaseResult,
        pendingEnvelopes,
        meta: await readBoardOperationLogMeta(boardId)
    };
};

export const buildRemoteBaseFromAckedSnapshotAndPatch = async ({
    boardId,
    patch,
    fallbackBoard = null
}) => {
    const ackedSnapshot = await loadAckedBoardSnapshot(boardId);
    const usableAckedSnapshot = ackedSnapshot && toSafeInt(ackedSnapshot.clientRevision) >= toSafeInt(patch?.fromClientRevision)
        ? ackedSnapshot
        : null;
    const patchBase = usableAckedSnapshot
        ? usableAckedSnapshot
        : normalizeBoardState(fallbackBoard || {});

    return {
        baseBoard: patchBase,
        ackedSnapshot: usableAckedSnapshot,
        nextRemoteBoard: applyIncrementalPatchToBoard(patchBase, patch)
    };
};
