import { idbGet } from '../db/indexedDB';
import { saveBoard } from '../boardService';
import { debugLog } from '../../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';
import {
    toEpochMillis,
    toSafeClientRevision,
    toSafeSyncVersion
} from '../boardPersistence/persistenceCursor';
import { applyIncrementalPatchToBoard } from './boardIncrementalPatch';
import { BOARD_PREFIX, ensureArray, pickLocalArray } from './boardShared';

const loadActiveBoardState = async (boardId) => {
    const localData = await idbGet(BOARD_PREFIX + boardId);
    const { useStore } = await import('../../store/useStore');
    const store = useStore.getState();
    const activeBoardId = sessionStorage.getItem('mixboard_current_board_id');
    const canTrustStoreState = activeBoardId === boardId && !store.isBoardLoading;
    const storePersistenceCursor = canTrustStoreState ? (store.activeBoardPersistence || {}) : {};

    return {
        localData,
        canTrustStoreState,
        store,
        storePersistenceCursor,
        localCards: canTrustStoreState
            ? pickLocalArray(store.cards, localData?.cards)
            : ensureArray(localData?.cards),
        localConnections: canTrustStoreState
            ? pickLocalArray(store.connections, localData?.connections)
            : ensureArray(localData?.connections),
        localGroups: canTrustStoreState
            ? pickLocalArray(store.groups, localData?.groups)
            : ensureArray(localData?.groups),
        localBoardPrompts: canTrustStoreState
            ? pickLocalArray(store.boardPrompts, localData?.boardPrompts)
            : ensureArray(localData?.boardPrompts),
        localBoardInstructionSettings: canTrustStoreState
            ? (store.boardInstructionSettings || localData?.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS)
            : (localData?.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS),
        localUpdatedAt: canTrustStoreState
            ? Math.max(
                toEpochMillis(localData?.updatedAt),
                toEpochMillis(storePersistenceCursor.updatedAt),
                toEpochMillis(store.lastSavedAt)
            )
            : toEpochMillis(localData?.updatedAt),
        localSyncVersion: canTrustStoreState
            ? Math.max(
                toSafeSyncVersion(localData?.syncVersion),
                toSafeSyncVersion(storePersistenceCursor.syncVersion)
            )
            : toSafeSyncVersion(localData?.syncVersion),
        localClientRevision: canTrustStoreState
            ? Math.max(
                toSafeClientRevision(localData?.clientRevision),
                toSafeClientRevision(storePersistenceCursor.clientRevision)
            )
            : toSafeClientRevision(localData?.clientRevision)
    };
};

export const applyIncomingBoardPatch = async ({
    boardId,
    patch,
    onUpdate = null,
    tracePrefix = 'patch-sync',
    debugPrefix = 'PatchSync'
}) => {
    if (!boardId || !patch || !Array.isArray(patch.ops) || patch.ops.length === 0) {
        return { status: 'ignored_invalid_patch' };
    }

    const incomingClientRevision = toSafeClientRevision(patch.toClientRevision);
    const incomingUpdatedAt = toEpochMillis(patch.updatedAt) || Date.now();
    const {
        localCards,
        localConnections,
        localGroups,
        localBoardPrompts,
        localBoardInstructionSettings,
        localSyncVersion,
        localClientRevision
    } = await loadActiveBoardState(boardId);

    if (incomingClientRevision <= localClientRevision) {
        debugLog.sync(
            `[${debugPrefix}] Skip stale patch for ${boardId} ` +
            `(local rev${localClientRevision}, patch rev${incomingClientRevision})`
        );
        return {
            status: 'skipped_stale',
            localClientRevision,
            incomingClientRevision
        };
    }

    const baseBoard = {
        cards: localCards,
        connections: localConnections,
        groups: localGroups,
        boardPrompts: localBoardPrompts,
        boardInstructionSettings: normalizeBoardInstructionSettings(localBoardInstructionSettings)
    };

    const patchedBoard = applyIncrementalPatchToBoard(baseBoard, patch);
    const nextBoard = {
        cards: patchedBoard.cards || [],
        connections: patchedBoard.connections || [],
        groups: patchedBoard.groups || [],
        boardPrompts: patchedBoard.boardPrompts || [],
        boardInstructionSettings: normalizeBoardInstructionSettings(
            patchedBoard.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        ),
        updatedAt: incomingUpdatedAt,
        syncVersion: localSyncVersion,
        clientRevision: incomingClientRevision
    };

    await saveBoard(boardId, nextBoard);
    logPersistenceTrace(`${tracePrefix}:apply`, {
        boardId,
        patchRevision: incomingClientRevision,
        patchUpdatedAt: incomingUpdatedAt,
        opCount: patch.ops.length,
        cursor: buildBoardCursorTrace(nextBoard)
    });

    if (typeof onUpdate === 'function') {
        onUpdate(boardId, nextBoard);
    }

    return {
        status: 'applied',
        data: nextBoard
    };
};
