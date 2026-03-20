import { idbGet } from '../db/indexedDB';
import { saveBoard } from '../boardService';
import { debugLog } from '../../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';
import {
    buildPersistenceCursor,
    shouldSkipApplyingIncomingSnapshot,
    toEpochMillis,
    toSafeClientRevision,
    toSafeMutationSequence,
    toSafeSyncVersion
} from '../boardPersistence/persistenceCursor';
import { ensureArray, pickLocalArray, BOARD_PREFIX } from './boardShared';
import { materializeCloudBoardSnapshot } from './boardCloudSnapshot';
import { readBoardOperationLogMeta, rehydrateBoardFromOperationLog } from '../localFirst/boardOperationLog';
import { persistAckedBoardSnapshot } from '../localFirst/boardAckedSnapshot';
import { rebaseRemoteBoardWithPendingOperations } from '../localFirst/boardRebase';

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
        store,
        canTrustStoreState,
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
                toEpochMillis(store.lastSavedAt),
                toEpochMillis(localData?.updatedAt),
                toEpochMillis(storePersistenceCursor.updatedAt),
                toEpochMillis(localFirstMeta.latestCreatedAt)
            )
            : toEpochMillis(localData?.updatedAt),
        localVersion: canTrustStoreState
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

const buildCloudBoardPayload = (boardData = {}, incomingCursor) => ({
    cards: boardData.cards || [],
    connections: boardData.connections || [],
    groups: boardData.groups || [],
    boardPrompts: boardData.boardPrompts || [],
    boardInstructionSettings: normalizeBoardInstructionSettings(
        boardData.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    ),
    updatedAt: incomingCursor.updatedAt,
    syncVersion: incomingCursor.syncVersion,
    clientRevision: incomingCursor.clientRevision,
    mutationSequence: incomingCursor.mutationSequence,
    syncMetadata: boardData.syncMetadata || null
});

export const applyIncomingBoardSnapshot = async ({
    boardId,
    boardData,
    onUpdate = null,
    tracePrefix = '',
    debugPrefix = 'BoardSync'
}) => {
    const hydratedBoardData = materializeCloudBoardSnapshot(boardData);
    const incomingCursor = buildPersistenceCursor(hydratedBoardData);
    const {
        localData,
        localFirstMeta,
        store,
        canTrustStoreState,
        storePersistenceCursor,
        localUpdatedAt,
        localVersion,
        localClientRevision,
        localMutationSequence
    } = await loadActiveBoardState(boardId);

    if (tracePrefix) {
        logPersistenceTrace(`${tracePrefix}:compare`, {
            boardId,
            canTrustStoreState,
            localCursor: {
                clientRevision: localClientRevision,
                version: localVersion,
                mutationSequence: localMutationSequence,
                updatedAt: localUpdatedAt,
                idb: buildBoardCursorTrace(localData),
                store: {
                    updatedAt: toEpochMillis(storePersistenceCursor.updatedAt),
                    syncVersion: toSafeSyncVersion(storePersistenceCursor.syncVersion),
                    clientRevision: toSafeClientRevision(storePersistenceCursor.clientRevision),
                    mutationSequence: toSafeMutationSequence(storePersistenceCursor.mutationSequence),
                    dirty: storePersistenceCursor.dirty === true,
                    lastSavedAt: toEpochMillis(store.lastSavedAt),
                    cards: Array.isArray(store.cards) ? store.cards.length : 0,
                    pendingOperationCount: localFirstMeta.pendingOperationCount
                }
            },
            cloudCursor: {
                clientRevision: incomingCursor.clientRevision,
                version: incomingCursor.syncVersion,
                mutationSequence: incomingCursor.mutationSequence,
                updatedAt: incomingCursor.updatedAt,
                cards: Array.isArray(hydratedBoardData.cards) ? hydratedBoardData.cards.length : 0
            }
        });
    }

    if ((localData || canTrustStoreState) && shouldSkipApplyingIncomingSnapshot({
        localClientRevision,
        incomingClientRevision: incomingCursor.clientRevision,
        localVersion,
        incomingVersion: incomingCursor.syncVersion,
        localMutationSequence,
        incomingMutationSequence: incomingCursor.mutationSequence,
        localUpdatedAt,
        incomingUpdatedAt: incomingCursor.updatedAt
    })) {
        debugLog.sync(
            `[${debugPrefix}] Skipping snapshot for ${boardId}: local data is newer or equal ` +
            `(local seq${localMutationSequence}/rev${localClientRevision}/v${localVersion}/t${localUpdatedAt}, ` +
            `cloud seq${incomingCursor.mutationSequence}/rev${incomingCursor.clientRevision}/v${incomingCursor.syncVersion}/t${incomingCursor.updatedAt})`
        );
        if (tracePrefix) {
            logPersistenceTrace(`${tracePrefix}:skip-cloud`, {
                boardId,
                localClientRevision,
                localMutationSequence,
                cloudClientRevision: incomingCursor.clientRevision,
                cloudMutationSequence: incomingCursor.mutationSequence,
                localVersion,
                localUpdatedAt,
                cloudVersion: incomingCursor.syncVersion,
                cloudUpdatedAt: incomingCursor.updatedAt
            });
        }
        return { status: 'skipped', cursor: incomingCursor };
    }

    const remoteBasePayload = buildCloudBoardPayload(hydratedBoardData, incomingCursor);
    try {
        await persistAckedBoardSnapshot(boardId, remoteBasePayload, {
            mutationSequence: incomingCursor.mutationSequence,
            syncMetadata: remoteBasePayload.syncMetadata
        });
    } catch (error) {
        debugLog.warn(`[${debugPrefix}] Failed to persist acked snapshot for board ${boardId}`, error);
    }

    const rebaseResult = await rebaseRemoteBoardWithPendingOperations({
        boardId,
        remoteBoard: remoteBasePayload,
        afterClientRevision: incomingCursor.clientRevision
    });

    const nextBoard = rebaseResult.rebased
        ? {
            ...remoteBasePayload,
            ...rebaseResult.board,
            updatedAt: Math.max(incomingCursor.updatedAt, toEpochMillis(rebaseResult.board?.updatedAt)),
            syncVersion: incomingCursor.syncVersion,
            clientRevision: Math.max(incomingCursor.clientRevision, toSafeClientRevision(rebaseResult.board?.clientRevision)),
            mutationSequence: incomingCursor.mutationSequence,
            syncMetadata: remoteBasePayload.syncMetadata
        }
        : remoteBasePayload;

    await saveBoard(boardId, nextBoard);
    if (tracePrefix) {
        logPersistenceTrace(`${tracePrefix}:apply-cloud-rebase`, {
            boardId,
            cloudClientRevision: incomingCursor.clientRevision,
            cloudVersion: incomingCursor.syncVersion,
            cloudMutationSequence: incomingCursor.mutationSequence,
            cloudUpdatedAt: incomingCursor.updatedAt,
            rebased: rebaseResult.rebased,
            pendingOperationCount: rebaseResult.pendingOperationCount || 0,
            finalCursor: buildBoardCursorTrace(nextBoard)
        });
    }
    if (typeof onUpdate === 'function') {
        onUpdate(boardId, nextBoard);
    }
    return {
        status: rebaseResult.rebased ? 'applied_rebase' : 'applied_direct',
        cursor: incomingCursor,
        data: nextBoard
    };
};
