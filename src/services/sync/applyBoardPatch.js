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
    toSafeMutationSequence,
    toSafeSyncVersion
} from '../boardPersistence/persistenceCursor';
import { BOARD_PREFIX, ensureArray, pickLocalArray } from './boardShared';
import {
    markBoardOperationsAcked,
    readBoardOperationLogMeta,
    rehydrateBoardFromOperationLog
} from '../localFirst/boardOperationLog';
import { persistAckedBoardSnapshot } from '../localFirst/boardAckedSnapshot';
import {
    buildRemoteBaseFromAckedSnapshotAndPatch,
    rebaseRemoteBoardWithPendingOperations
} from '../localFirst/boardRebase';

const loadActiveBoardState = async (boardId) => {
    const rawLocalData = await idbGet(BOARD_PREFIX + boardId);
    const localFirstReplay = await rehydrateBoardFromOperationLog(boardId, rawLocalData);
    const localFirstMeta = await readBoardOperationLogMeta(boardId);
    const localData = localFirstReplay?.board || rawLocalData;
    const { useStore } = await import('../../store/useStore');
    const store = useStore.getState();
    const activeBoardId = sessionStorage.getItem('mixboard_current_board_id');
    const canTrustStoreState = activeBoardId === boardId && !store.isBoardLoading;
    const storePersistenceCursor = canTrustStoreState ? (store.activeBoardPersistence || {}) : {};

    return {
        localData,
        localFirstMeta,
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
                toEpochMillis(store.lastSavedAt),
                toEpochMillis(localFirstMeta.latestCreatedAt)
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
                toSafeClientRevision(storePersistenceCursor.clientRevision),
                toSafeClientRevision(localFirstMeta.latestClientRevision)
            )
            : Math.max(
                toSafeClientRevision(localData?.clientRevision),
                toSafeClientRevision(localFirstMeta.latestClientRevision)
            ),
        localMutationSequence: canTrustStoreState
            ? Math.max(
                toSafeMutationSequence(localData?.mutationSequence),
                toSafeMutationSequence(storePersistenceCursor.mutationSequence)
            )
            : toSafeMutationSequence(localData?.mutationSequence)
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
    const incomingMutationSequence = toSafeMutationSequence(patch.mutationSequence || patch.sequence);
    const {
        localData,
        localFirstMeta,
        localCards,
        localConnections,
        localGroups,
        localBoardPrompts,
        localBoardInstructionSettings,
        localSyncVersion,
        localClientRevision,
        localMutationSequence,
        localUpdatedAt
    } = await loadActiveBoardState(boardId);

    if (
        incomingMutationSequence > 0 &&
        incomingMutationSequence <= localMutationSequence &&
        incomingClientRevision <= localClientRevision
    ) {
        debugLog.sync(
            `[${debugPrefix}] Skip stale patch for ${boardId} ` +
            `(local seq${localMutationSequence}/rev${localClientRevision}, patch seq${incomingMutationSequence}/rev${incomingClientRevision})`
        );
        return {
            status: 'skipped_stale',
            localClientRevision,
            incomingClientRevision,
            localMutationSequence,
            incomingMutationSequence
        };
    }

    const canSafelyUseLocalFallback = (localFirstMeta?.pendingOperationCount || 0) === 0;
    const fallbackBoard = canSafelyUseLocalFallback
        ? {
            cards: localCards,
            connections: localConnections,
            groups: localGroups,
            boardPrompts: localBoardPrompts,
            boardInstructionSettings: normalizeBoardInstructionSettings(localBoardInstructionSettings),
            updatedAt: localUpdatedAt,
            syncVersion: localSyncVersion,
            clientRevision: localClientRevision,
            mutationSequence: localMutationSequence,
            syncMetadata: localData?.syncMetadata || null
        }
        : null;

    const { ackedSnapshot, nextRemoteBoard } = await buildRemoteBaseFromAckedSnapshotAndPatch({
        boardId,
        patch,
        fallbackBoard
    });

    if (!ackedSnapshot && !canSafelyUseLocalFallback) {
        debugLog.warn(
            `[${debugPrefix}] Missing acked snapshot for ${boardId}, defer patch until a full snapshot arrives`,
            {
                incomingClientRevision,
                incomingMutationSequence,
                pendingOperationCount: localFirstMeta?.pendingOperationCount || 0
            }
        );
        if (tracePrefix) {
            logPersistenceTrace(`${tracePrefix}:defer-until-snapshot`, {
                boardId,
                incomingClientRevision,
                incomingMutationSequence,
                pendingOperationCount: localFirstMeta?.pendingOperationCount || 0
            });
        }
        return {
            status: 'deferred_until_snapshot',
            localClientRevision,
            incomingClientRevision
        };
    }

    const remoteBasePayload = {
        cards: nextRemoteBoard.cards || [],
        connections: nextRemoteBoard.connections || [],
        groups: nextRemoteBoard.groups || [],
        boardPrompts: nextRemoteBoard.boardPrompts || [],
        boardInstructionSettings: normalizeBoardInstructionSettings(
            nextRemoteBoard.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        ),
        updatedAt: incomingUpdatedAt,
        syncVersion: localSyncVersion,
        clientRevision: incomingClientRevision,
        mutationSequence: incomingMutationSequence || localMutationSequence,
        syncMetadata: patch.syncMetadata || patch || null
    };

    try {
        await persistAckedBoardSnapshot(boardId, remoteBasePayload, {
            mutationSequence: remoteBasePayload.mutationSequence,
            syncMetadata: remoteBasePayload.syncMetadata
        });
    } catch (error) {
        debugLog.warn(`[${debugPrefix}] Failed to persist acked patch snapshot for board ${boardId}`, error);
    }

    if (
        typeof patch?.mutationActorId === 'string' &&
        patch.mutationActorId &&
        patch.mutationActorId === localFirstMeta?.actorId &&
        incomingClientRevision > 0
    ) {
        try {
            await markBoardOperationsAcked(boardId, incomingClientRevision);
        } catch (error) {
            debugLog.warn(`[${debugPrefix}] Failed to ack local operations from echoed patch for board ${boardId}`, error);
        }
    }

    const rebaseResult = await rebaseRemoteBoardWithPendingOperations({
        boardId,
        remoteBoard: remoteBasePayload,
        afterClientRevision: incomingClientRevision
    });

    const nextBoard = rebaseResult.rebased
        ? {
            ...remoteBasePayload,
            ...rebaseResult.board,
            updatedAt: Math.max(incomingUpdatedAt, toEpochMillis(rebaseResult.board?.updatedAt)),
            syncVersion: localSyncVersion,
            clientRevision: Math.max(incomingClientRevision, toSafeClientRevision(rebaseResult.board?.clientRevision)),
            mutationSequence: remoteBasePayload.mutationSequence,
            syncMetadata: remoteBasePayload.syncMetadata
        }
        : remoteBasePayload;

    await saveBoard(boardId, nextBoard);
    logPersistenceTrace(`${tracePrefix}:apply`, {
        boardId,
        patchRevision: incomingClientRevision,
        patchUpdatedAt: incomingUpdatedAt,
        patchMutationSequence: incomingMutationSequence,
        opCount: patch.ops.length,
        rebased: rebaseResult.rebased,
        pendingOperationCount: rebaseResult.pendingOperationCount || 0,
        cursor: buildBoardCursorTrace(nextBoard)
    });

    if (typeof onUpdate === 'function') {
        onUpdate(boardId, nextBoard);
    }

    return {
        status: rebaseResult.rebased ? 'applied_rebase' : 'applied',
        data: nextBoard
    };
};
