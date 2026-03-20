import { collection, doc, onSnapshot } from 'firebase/firestore';
import { saveBoard, getCurrentBoardId } from '../boardService';
import { debugLog } from '../../utils/debugLogger';
import { logPersistenceTrace } from '../../utils/persistenceTrace';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../customInstructionsService';
import { materializeCloudBoardSnapshot } from './boardCloudSnapshot';
import { hydrateCloudBoardSnapshotFromChunks } from './boardCloudChunks';
import {
    buildPersistenceCursor,
    isIncomingCursorNewer,
    shouldSkipApplyingIncomingSnapshot
} from '../boardPersistence/persistenceCursor';
import { db, handleSyncError } from './core';
import {
    buildBoardMetadataListFromCloud,
    deprecatedBoardSnapshotCursor,
    loadPersistedBoardSnapshotForSync,
    singleBoardPatchCursor,
    singleBoardSnapshotCursor
} from './boardShared';
import { applyIncomingBoardSnapshot } from './applyBoardSnapshot';
import { applyIncomingBoardPatch } from './applyBoardPatch';
import { listenForIncrementalBoardPatches } from './boardCloudPatches';
import { persistBoardsMetadataList } from '../boardPersistence/boardsListStorage';

const hydrateBoardSnapshotIfNeeded = async (userId, boardId, boardData = {}) => {
    if (!boardData || typeof boardData !== 'object') return boardData;
    if (boardData.snapshotStorage !== 'chunked') return boardData;

    try {
        return await hydrateCloudBoardSnapshotFromChunks({
            userId,
            boardId,
            boardData
        });
    } catch (error) {
        debugLog.warn(`[Sync] Failed to hydrate chunked snapshot for board ${boardId}`, error);
        return boardData;
    }
};

const buildPersistedCloudPayload = (boardData = {}, incomingCursor) => {
    const hydratedBoardData = materializeCloudBoardSnapshot(boardData);

    return {
        ...hydratedBoardData,
        cards: hydratedBoardData.cards || [],
        connections: hydratedBoardData.connections || [],
        groups: hydratedBoardData.groups || [],
        boardPrompts: hydratedBoardData.boardPrompts || [],
        boardInstructionSettings: normalizeBoardInstructionSettings(
            hydratedBoardData.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        ),
        updatedAt: incomingCursor.updatedAt,
        syncVersion: incomingCursor.syncVersion,
        clientRevision: incomingCursor.clientRevision
    };
};

export const listenForBoardsMetadata = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        debugLog.sync('Initializing Firestore listener for boards METADATA + BACKGROUND CACHE');
        const boardsRef = collection(db, 'users', userId, 'boards');
        return onSnapshot(boardsRef, async (snapshot) => {
            debugLog.sync(`[Metadata] Snapshot received: ${snapshot.size} docs, ${snapshot.docChanges().length} changes`);

            const changeTasks = snapshot.docChanges().map(async (change) => {
                if (change.type !== 'added' && change.type !== 'modified') return;

                const boardData = change.doc.data();
                if (!boardData?.id) return;

                try {
                    const boardId = boardData.id;
                    if (boardId === getCurrentBoardId()) {
                        logPersistenceTrace('metadata-sync:skip-active-board', { boardId });
                        return;
                    }

                    const hydratedBoardData = await hydrateBoardSnapshotIfNeeded(userId, boardId, boardData);
                    const incomingCursor = buildPersistenceCursor(hydratedBoardData);
                    const { snapshot: persistedSnapshot } = await loadPersistedBoardSnapshotForSync(boardId);
                    const persistedCursor = buildPersistenceCursor(persistedSnapshot);

                    if (
                        !persistedSnapshot ||
                        !shouldSkipApplyingIncomingSnapshot({
                            localClientRevision: persistedCursor.clientRevision,
                            incomingClientRevision: incomingCursor.clientRevision,
                            localVersion: persistedCursor.syncVersion,
                            incomingVersion: incomingCursor.syncVersion,
                            localUpdatedAt: persistedCursor.updatedAt,
                            incomingUpdatedAt: incomingCursor.updatedAt
                        })
                    ) {
                        await saveBoard(boardId, buildPersistedCloudPayload(hydratedBoardData, incomingCursor));
                    }
                } catch (error) {
                    debugLog.error(`[BackgroundSync] Failed for ${boardData.id}`, error);
                }
            });

            const allBoards = snapshot.docs.map((docSnap) => docSnap.data()).filter((board) => board && board.id);
            const metadataList = buildBoardMetadataListFromCloud(allBoards);
            persistBoardsMetadataList(metadataList, { reason: 'listenForBoardsMetadata' });
            onUpdate(metadataList);

            if (changeTasks.length > 0) {
                Promise.all(changeTasks).then(() => {
                    debugLog.sync(`[BackgroundSync] Finished processing ${changeTasks.length} changes`);
                });
            }
        }, (error) => {
            handleSyncError('Firestore metadata sync error:', error);
        });
    } catch (error) {
        debugLog.error('listenForBoardsMetadata fatal error:', error);
        return () => { };
    }
};

export const listenForSingleBoard = (userId, boardId, onUpdate) => {
    if (!db || !userId || !boardId || boardId.startsWith('sample-')) {
        return () => { };
    }

    try {
        debugLog.sync(`[SingleBoard] Starting listener for board: ${boardId}`);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        const cloudCursorKey = `${userId}:${boardId}`;

        const unsubscribe = onSnapshot(boardRef, async (docSnap) => {
            if (!docSnap.exists()) {
                debugLog.sync(`[SingleBoard] Board ${boardId} does not exist in cloud`);
                return;
            }

            const rawBoardData = docSnap.data() || {};
            const hydratedBoardData = await hydrateBoardSnapshotIfNeeded(userId, boardId, rawBoardData);
            const boardData = materializeCloudBoardSnapshot(hydratedBoardData);
            const incomingCursor = buildPersistenceCursor(boardData);
            const previousCursor = singleBoardSnapshotCursor.get(cloudCursorKey);
            if (!isIncomingCursorNewer(incomingCursor, previousCursor)) {
                debugLog.sync(
                    `[SingleBoard] Skip stale/duplicate snapshot for ${boardId} ` +
                    `(incoming rev${incomingCursor.clientRevision}/v${incomingCursor.syncVersion}/t${incomingCursor.updatedAt}, ` +
                    `previous rev${previousCursor?.clientRevision || 0}/v${previousCursor?.syncVersion || 0}/t${previousCursor?.updatedAt || 0})`
                );
                return;
            }

            singleBoardSnapshotCursor.set(cloudCursorKey, incomingCursor);
            debugLog.sync(`[SingleBoard] Update received for ${boardId}`, {
                cloudCards: (boardData.cards || []).length,
                cloudVersion: incomingCursor.syncVersion,
                cloudClientRevision: incomingCursor.clientRevision
            });

            try {
                await applyIncomingBoardSnapshot({
                    boardId,
                    boardData,
                    onUpdate,
                    tracePrefix: 'single-board',
                    debugPrefix: 'SingleBoard'
                });
            } catch (error) {
                debugLog.error(`[SingleBoard] Merge failed for board ${boardId}`, error);
            }
        }, (error) => {
            handleSyncError(`[SingleBoard] Sync error for ${boardId}:`, error);
        });

        return () => {
            singleBoardSnapshotCursor.delete(cloudCursorKey);
            unsubscribe();
        };
    } catch (error) {
        debugLog.error(`listenForSingleBoard fatal error for ${boardId}:`, error);
        return () => { };
    }
};

export const listenForBoardPatches = (userId, boardId, onUpdate, options = {}) => {
    if (!db || !userId || !boardId || boardId.startsWith('sample-')) {
        return () => { };
    }

    const normalizedStartRevision = Number(options?.fromClientRevision);
    const patchCursorKey = `${userId}:${boardId}`;
    let lastAppliedRevision = Number.isFinite(normalizedStartRevision) && normalizedStartRevision >= 0
        ? normalizedStartRevision
        : 0;

    const cachedRevision = singleBoardPatchCursor.get(patchCursorKey);
    if (Number.isFinite(cachedRevision) && cachedRevision > lastAppliedRevision) {
        lastAppliedRevision = cachedRevision;
    }

    try {
        debugLog.sync(
            `[PatchSync] Starting patch listener for board ${boardId} from rev${lastAppliedRevision}`
        );

        const unsubscribe = listenForIncrementalBoardPatches({
            userId,
            boardId,
            fromClientRevision: lastAppliedRevision,
            onPatchBatch: async (patchBatch) => {
                for (const patch of patchBatch) {
                    if (!patch || patch.toClientRevision <= lastAppliedRevision) {
                        continue;
                    }

                    try {
                        const applyResult = await applyIncomingBoardPatch({
                            boardId,
                            patch,
                            onUpdate,
                            tracePrefix: 'single-board-patch',
                            debugPrefix: 'PatchSync'
                        });

                        if (applyResult?.status === 'applied') {
                            lastAppliedRevision = patch.toClientRevision;
                            singleBoardPatchCursor.set(patchCursorKey, lastAppliedRevision);
                        }
                    } catch (error) {
                        debugLog.error(
                            `[PatchSync] Failed to apply patch rev${patch.toClientRevision} for board ${boardId}`,
                            error
                        );
                    }
                }
            },
            onError: (error) => {
                handleSyncError(`[PatchSync] Listener failed for ${boardId}:`, error);
            }
        });

        return () => {
            singleBoardPatchCursor.delete(patchCursorKey);
            unsubscribe();
        };
    } catch (error) {
        debugLog.error(`listenForBoardPatches fatal error for ${boardId}:`, error);
        return () => { };
    }
};

export const listenForBoardUpdates = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    try {
        debugLog.sync('[DEPRECATED] Using listenForBoardUpdates - consider switching to listenForBoardsMetadata + listenForSingleBoard');
        const boardsRef = collection(db, 'users', userId, 'boards');
        const trackedCursorKeys = new Set();

        const unsubscribe = onSnapshot(boardsRef, async (snapshot) => {
            const promises = [];
            let hasChanges = false;

            debugLog.sync(`Firestore snapshot received: ${snapshot.size} docs, ${snapshot.docChanges().length} changes`);

            for (const change of snapshot.docChanges()) {
                const rawBoardData = change.doc.data() || {};
                const boardId = rawBoardData?.id;
                if (!boardId) continue;
                const hydratedBoardData = await hydrateBoardSnapshotIfNeeded(userId, boardId, rawBoardData);
                const boardData = materializeCloudBoardSnapshot(hydratedBoardData);
                if (!boardData?.id) continue;

                if (change.type === 'added' || change.type === 'modified') {
                    promises.push((async () => {
                        try {
                            const cloudCursorKey = `${userId}:${boardData.id}`;
                            trackedCursorKeys.add(cloudCursorKey);
                            const incomingCursor = buildPersistenceCursor(boardData);
                            const previousCursor = deprecatedBoardSnapshotCursor.get(cloudCursorKey);
                            if (!isIncomingCursorNewer(incomingCursor, previousCursor)) {
                                debugLog.sync(
                                    `[DeprecatedSync] Skip stale/duplicate snapshot for ${boardData.id} ` +
                                    `(incoming rev${incomingCursor.clientRevision}/v${incomingCursor.syncVersion}/t${incomingCursor.updatedAt}, ` +
                                    `previous rev${previousCursor?.clientRevision || 0}/v${previousCursor?.syncVersion || 0}/t${previousCursor?.updatedAt || 0})`
                                );
                                return;
                            }

                            deprecatedBoardSnapshotCursor.set(cloudCursorKey, incomingCursor);
                            hasChanges = true;
                            await applyIncomingBoardSnapshot({
                                boardId: boardData.id,
                                boardData,
                                debugPrefix: 'DeprecatedSync'
                            });
                        } catch (error) {
                            debugLog.error(`[Firebase Sync] Merge failed for board ${boardData.id}`, error);
                        }
                    })());
                } else if (change.type === 'removed') {
                    debugLog.sync(`Board removed in cloud: ${boardData.id}`);
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
                if (hasChanges) {
                    debugLog.sync(`Hydration complete for ${promises.length} board(s)`);
                }
            }

            const allBoards = snapshot.docs.map((docSnap) => docSnap.data()).filter((board) => board && board.id);
            const metadataList = buildBoardMetadataListFromCloud(allBoards);
            persistBoardsMetadataList(metadataList, { reason: 'listenForBoardUpdates' });
            onUpdate(metadataList, snapshot.docChanges().map((change) => change.doc.data().id));
        }, (error) => {
            handleSyncError('Firestore sync error:', error);
        });

        return () => {
            trackedCursorKeys.forEach((key) => deprecatedBoardSnapshotCursor.delete(key));
            unsubscribe();
        };
    } catch (error) {
        debugLog.error('listenForBoardUpdates fatal error:', error);
        return () => { };
    }
};
