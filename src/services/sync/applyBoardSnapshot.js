import { idbGet } from '../db/indexedDB';
import { saveBoard } from '../boardService';
import { debugLog } from '../../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import { reconcileCards } from '../syncUtils';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';
import {
    buildPersistenceCursor,
    shouldSkipApplyingIncomingSnapshot,
    toEpochMillis,
    toSafeClientRevision,
    toSafeSyncVersion
} from '../boardPersistence/persistenceCursor';
import { ensureArray, pickLocalArray, BOARD_PREFIX } from './boardShared';
import { materializeCloudBoardSnapshot } from './boardCloudSnapshot';
import { readBoardOperationLogMeta, rehydrateBoardFromOperationLog } from '../localFirst/boardOperationLog';

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
            )
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
    clientRevision: incomingCursor.clientRevision
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
        store,
        canTrustStoreState,
        storePersistenceCursor,
        localCards,
        localConnections,
        localGroups,
        localBoardPrompts,
        localBoardInstructionSettings,
        localUpdatedAt,
        localVersion,
        localClientRevision
    } = await loadActiveBoardState(boardId);

    if (tracePrefix) {
        logPersistenceTrace(`${tracePrefix}:compare`, {
            boardId,
            canTrustStoreState,
            localCursor: {
                clientRevision: localClientRevision,
                version: localVersion,
                updatedAt: localUpdatedAt,
                idb: buildBoardCursorTrace(localData),
                store: {
                    updatedAt: toEpochMillis(storePersistenceCursor.updatedAt),
                    syncVersion: toSafeSyncVersion(storePersistenceCursor.syncVersion),
                    clientRevision: toSafeClientRevision(storePersistenceCursor.clientRevision),
                    dirty: storePersistenceCursor.dirty === true,
                    lastSavedAt: toEpochMillis(store.lastSavedAt),
                    cards: Array.isArray(store.cards) ? store.cards.length : 0
                }
            },
            cloudCursor: {
                clientRevision: incomingCursor.clientRevision,
                version: incomingCursor.syncVersion,
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
        localUpdatedAt,
        incomingUpdatedAt: incomingCursor.updatedAt
    })) {
        debugLog.sync(
            `[${debugPrefix}] Skipping snapshot for ${boardId}: local data is newer or equal ` +
            `(local rev${localClientRevision}/v${localVersion}/t${localUpdatedAt}, ` +
            `cloud rev${incomingCursor.clientRevision}/v${incomingCursor.syncVersion}/t${incomingCursor.updatedAt})`
        );
        if (tracePrefix) {
            logPersistenceTrace(`${tracePrefix}:skip-cloud`, {
                boardId,
                localClientRevision,
                cloudClientRevision: incomingCursor.clientRevision,
                localVersion,
                localUpdatedAt,
                cloudVersion: incomingCursor.syncVersion,
                cloudUpdatedAt: incomingCursor.updatedAt
            });
        }
        return { status: 'skipped', cursor: incomingCursor };
    }

    if (!localCards || localCards.length === 0) {
        const directPayload = buildCloudBoardPayload(hydratedBoardData, incomingCursor);
        await saveBoard(boardId, directPayload);
        if (tracePrefix) {
            logPersistenceTrace(`${tracePrefix}:apply-cloud-direct`, {
                boardId,
                cloudClientRevision: incomingCursor.clientRevision,
                cloudVersion: incomingCursor.syncVersion,
                cloudUpdatedAt: incomingCursor.updatedAt,
                cards: Array.isArray(hydratedBoardData.cards) ? hydratedBoardData.cards.length : 0
            });
        }
        if (typeof onUpdate === 'function') {
            onUpdate(boardId, directPayload);
        }
        return { status: 'applied_direct', cursor: incomingCursor, data: directPayload };
    }

    const finalCards = reconcileCards(
        hydratedBoardData.cards || [],
        localCards,
        localVersion,
        incomingCursor.syncVersion,
        localUpdatedAt,
        incomingCursor.updatedAt
    );

    debugLog.sync(
        `[${debugPrefix}] Merge result: ${localCards.length} local + ${(hydratedBoardData.cards || []).length} cloud = ${finalCards.length} final`
    );

    const mergedData = {
        cards: finalCards,
        connections: hydratedBoardData.connections || localConnections,
        groups: hydratedBoardData.groups !== undefined ? hydratedBoardData.groups : (localGroups || []),
        boardPrompts: hydratedBoardData.boardPrompts !== undefined ? hydratedBoardData.boardPrompts : (localBoardPrompts || []),
        boardInstructionSettings: hydratedBoardData.boardInstructionSettings !== undefined
            ? normalizeBoardInstructionSettings(hydratedBoardData.boardInstructionSettings)
            : normalizeBoardInstructionSettings(localBoardInstructionSettings),
        updatedAt: incomingCursor.updatedAt,
        syncVersion: incomingCursor.syncVersion,
        clientRevision: incomingCursor.clientRevision
    };

    await saveBoard(boardId, mergedData);
    if (tracePrefix) {
        logPersistenceTrace(`${tracePrefix}:apply-cloud-merge`, {
            boardId,
            cloudClientRevision: incomingCursor.clientRevision,
            cloudVersion: incomingCursor.syncVersion,
            cloudUpdatedAt: incomingCursor.updatedAt,
            localCards: localCards.length,
            finalCards: finalCards.length
        });
    }
    if (typeof onUpdate === 'function') {
        onUpdate(boardId, mergedData);
    }
    return { status: 'applied_merge', cursor: incomingCursor, data: mergedData };
};
