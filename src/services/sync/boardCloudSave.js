import { deleteDoc, doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { saveBoard, getRawBoardsList } from '../boardService';
import { debugLog } from '../../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import { DEFAULT_BOARD_INSTRUCTION_SETTINGS } from '../customInstructionsService';
import { getEffectiveBoardCardCount } from '../boardTitle/metadata';
import { buildBoardContentHash } from '../boardPersistence/boardContentHash';
import {
    toSafeClientRevision,
    toSafeSyncVersion,
    isSnapshotClearlyNewer
} from '../boardPersistence/persistenceCursor';
import {
    buildCloudBoardDocument,
    encodeBoardSnapshotData,
    materializeCloudBoardSnapshot,
    sanitizeBoardContentForCloud
} from './boardCloudSnapshot';
import {
    buildCloudSnapshotPayloadForDocument,
    buildCloudSnapshotStoragePlan,
    cleanupStaleChunkedSnapshotSets,
    hydrateCloudBoardSnapshotFromChunks,
    persistChunkedSnapshotSet
} from './boardCloudChunks';
import {
    cleanupBoardPatchesHistory,
    persistBoardIncrementalPatch
} from './boardCloudPatches';
import {
    db,
    handleSyncError,
    isOfflineMode,
    isRetryableSyncWriteError,
    onSyncSuccess
} from './core';
import { loadPersistedBoardSnapshotForSync } from './boardShared';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const inFlightCloudSaveTasks = new Map();
const pendingCloudSavePayloads = new Map();
const cloudSaveRetryTimers = new Map();
const cloudSaveRetryAttempts = new Map();
const lastSyncedContentHash = new Map();

const CLOUD_SAVE_RETRY_DELAYS_MS = [500, 1500, 3500];
const CLOUD_SAVE_QUEUE_RETRY_DELAYS_MS = [1000, 3000, 10000, 30000];

export const CLOUD_SAVE_RESULT_OK = 'ok';
export const CLOUD_SAVE_RESULT_DEFERRED_OFFLINE = 'deferred_offline';
export const CLOUD_SAVE_RESULT_QUEUED_RETRY = 'queued_retry';

const EMPTY_CLOUD_CONTENT_HASH = buildBoardContentHash({
    cards: [],
    connections: [],
    groups: [],
    boardPrompts: [],
    boardInstructionSettings: DEFAULT_BOARD_INSTRUCTION_SETTINGS
});

const getCloudQueueRetryDelay = (cacheKey) => {
    const nextAttempt = (cloudSaveRetryAttempts.get(cacheKey) || 0) + 1;
    cloudSaveRetryAttempts.set(cacheKey, nextAttempt);
    const delayIndex = Math.min(nextAttempt - 1, CLOUD_SAVE_QUEUE_RETRY_DELAYS_MS.length - 1);
    return CLOUD_SAVE_QUEUE_RETRY_DELAYS_MS[delayIndex];
};

const clearCloudQueueRetryState = (cacheKey) => {
    cloudSaveRetryAttempts.delete(cacheKey);
    const timer = cloudSaveRetryTimers.get(cacheKey);
    if (timer) {
        clearTimeout(timer);
        cloudSaveRetryTimers.delete(cacheKey);
    }
};

const setBoardDocWithRetry = async (boardRef, payloadFactory, boardId) => {
    for (let attempt = 0; attempt <= CLOUD_SAVE_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
            const writePlan = await runTransaction(db, async (transaction) => {
                const docSnap = await transaction.get(boardRef);
                const remoteBoard = docSnap.data() || {};
                const nextWritePlan = payloadFactory(remoteBoard, docSnap.exists());

                if (!nextWritePlan || typeof nextWritePlan !== 'object') {
                    throw new Error(`Cloud save payload factory returned invalid write plan for board ${boardId}`);
                }

                if (!nextWritePlan.skipWrite) {
                    if (!nextWritePlan.payload || typeof nextWritePlan.payload !== 'object') {
                        throw new Error(`Cloud save write plan is missing Firestore payload for board ${boardId}`);
                    }
                    transaction.set(boardRef, nextWritePlan.payload);
                }

                return nextWritePlan;
            });
            return writePlan;
        } catch (error) {
            const hasMoreRetries = attempt < CLOUD_SAVE_RETRY_DELAYS_MS.length;
            if (!hasMoreRetries || !isRetryableSyncWriteError(error)) {
                throw error;
            }

            const delayMs = CLOUD_SAVE_RETRY_DELAYS_MS[attempt];
            debugLog.warn(
                `[Sync] Cloud save retry ${attempt + 1}/${CLOUD_SAVE_RETRY_DELAYS_MS.length} for board ${boardId} in ${delayMs}ms`,
                error
            );
            await sleep(delayMs);
        }
    }

    return null;
};

const persistBoardToCloudOnce = async (payload) => {
    const { userId, boardId, boardContent, cacheKey, contentHash, incrementalPatch = null } = payload;
    const clientRevision = toSafeClientRevision(boardContent?.clientRevision);

    if (isOfflineMode()) {
        debugLog.sync(`Skipping cloud save for ${boardId}: offline mode enabled`);
        return { status: CLOUD_SAVE_RESULT_DEFERRED_OFFLINE };
    }

    if (lastSyncedContentHash.get(cacheKey) === contentHash) {
        debugLog.sync(`Skipping cloud save for ${boardId}: content unchanged`);
        return { status: CLOUD_SAVE_RESULT_OK, skipped: true, contentHash };
    }

    const metadata = getRawBoardsList().find((board) => board.id === boardId) || { id: boardId };

    debugLog.sync(`Saving board ${boardId} to cloud...`);
    const savedAt = Date.now();

    if (
        incrementalPatch &&
        Array.isArray(incrementalPatch.ops) &&
        incrementalPatch.ops.length > 0
    ) {
        try {
            const patchResult = await persistBoardIncrementalPatch({
                userId,
                boardId,
                patch: {
                    ...incrementalPatch,
                    updatedAt: incrementalPatch.updatedAt || savedAt,
                    toClientRevision: toSafeClientRevision(incrementalPatch.toClientRevision || clientRevision),
                    contentHash
                }
            });

            if (patchResult?.applied) {
                lastSyncedContentHash.set(cacheKey, contentHash);
                onSyncSuccess();
                debugLog.sync(
                    `Board ${boardId} incremental patch saved (rev: ${toSafeClientRevision(incrementalPatch.toClientRevision || clientRevision)})`
                );
                return {
                    status: CLOUD_SAVE_RESULT_OK,
                    patched: true,
                    updatedAt: incrementalPatch.updatedAt || savedAt,
                    syncVersion: toSafeSyncVersion(boardContent?.syncVersion),
                    clientRevision: toSafeClientRevision(incrementalPatch.toClientRevision || clientRevision),
                    contentHash
                };
            }

            if (!patchResult?.fallbackToSnapshot) {
                return {
                    status: CLOUD_SAVE_RESULT_QUEUED_RETRY,
                    errorCode: patchResult?.reason || 'patch_failed',
                    contentHash
                };
            }

            debugLog.sync(`[SyncPatch] Fallback to snapshot write for board ${boardId}`, patchResult);
        } catch (patchError) {
            if (isRetryableSyncWriteError(patchError)) {
                return {
                    status: CLOUD_SAVE_RESULT_QUEUED_RETRY,
                    errorCode: patchError?.code || 'patch_retryable_error',
                    contentHash
                };
            }
            throw patchError;
        }
    }

    const cleanedContent = sanitizeBoardContentForCloud(boardContent);
    const encodedSnapshotPayload = encodeBoardSnapshotData(cleanedContent);
    const snapshotStoragePlan = buildCloudSnapshotStoragePlan(encodedSnapshotPayload);
    const documentSnapshotPayload = buildCloudSnapshotPayloadForDocument(snapshotStoragePlan);
    const boardRef = doc(db, 'users', userId, 'boards', boardId);

    if (snapshotStoragePlan.mode === 'chunked') {
        await persistChunkedSnapshotSet({
            userId,
            boardId,
            storagePlan: snapshotStoragePlan,
            syncVersion: toSafeSyncVersion(metadata.syncVersion),
            clientRevision
        });
    }

    const writeResult = await setBoardDocWithRetry(boardRef, (remoteBoard = {}, remoteExists = false) => {
        const remoteSnapshot = materializeCloudBoardSnapshot(remoteBoard);
        const localSnapshot = {
            ...cleanedContent,
            updatedAt: savedAt,
            syncVersion: toSafeSyncVersion(metadata.syncVersion),
            clientRevision,
            contentHash
        };
        const remoteHash = typeof remoteBoard.contentHash === 'string'
            ? remoteBoard.contentHash
            : buildBoardContentHash(remoteSnapshot);
        const remoteHasContent = remoteHash !== EMPTY_CLOUD_CONTENT_HASH;
        const localHash = contentHash;
        const localClearlyNewer = isSnapshotClearlyNewer(localSnapshot, remoteSnapshot);

        if (!remoteExists) {
            const payloadToWrite = buildCloudBoardDocument({
                ...metadata,
                ...boardContent,
                ...localSnapshot,
                id: metadata.id || boardId,
                updatedAt: savedAt,
                cardCount: getEffectiveBoardCardCount(cleanedContent.cards),
                clientRevision,
                syncVersion: toSafeSyncVersion(metadata.syncVersion) + 1,
                serverUpdatedAt: serverTimestamp(),
                contentHash: localHash,
                snapshotPayload: documentSnapshotPayload
            });
            payloadToWrite.patchSinceCheckpoint = 0;
            payloadToWrite.checkpointUpdatedAt = savedAt;
            payloadToWrite.checkpointClientRevision = clientRevision;
            payloadToWrite.patchHeadClientRevision = clientRevision;
            payloadToWrite.patchUpdatedAt = savedAt;
            payloadToWrite.patchOpCount = 0;

            return {
                skipWrite: false,
                payload: payloadToWrite,
                snapshot: {
                    ...localSnapshot,
                    syncVersion: toSafeSyncVersion(metadata.syncVersion) + 1
                },
                contentHash: localHash,
                snapshotStorage: documentSnapshotPayload.snapshotStorage,
                snapshotSetId: documentSnapshotPayload.snapshotSetId || '',
                reason: 'create_remote_board'
            };
        }

        if (remoteHash === localHash) {
            return {
                skipWrite: true,
                snapshot: remoteSnapshot,
                contentHash: remoteHash,
                remoteDocument: remoteBoard,
                reason: 'content_matches_remote'
            };
        }

        if (remoteHasContent && !localClearlyNewer) {
            return {
                skipWrite: true,
                snapshot: remoteSnapshot,
                contentHash: remoteHash,
                remoteDocument: remoteBoard,
                reason: 'remote_newer_or_equal'
            };
        }

        const baseSyncVersion = Math.max(
            toSafeSyncVersion(metadata.syncVersion),
            toSafeSyncVersion(remoteBoard.syncVersion)
        );

        const payloadToWrite = buildCloudBoardDocument({
            ...metadata,
            ...boardContent,
            ...localSnapshot,
            id: metadata.id || boardId,
            updatedAt: savedAt,
            cardCount: getEffectiveBoardCardCount(cleanedContent.cards),
            clientRevision,
            syncVersion: baseSyncVersion + 1,
            serverUpdatedAt: serverTimestamp(),
            contentHash: localHash,
            snapshotPayload: documentSnapshotPayload
        });
        payloadToWrite.patchSinceCheckpoint = 0;
        payloadToWrite.checkpointUpdatedAt = savedAt;
        payloadToWrite.checkpointClientRevision = clientRevision;
        payloadToWrite.patchHeadClientRevision = clientRevision;
        payloadToWrite.patchUpdatedAt = savedAt;
        payloadToWrite.patchOpCount = 0;

        return {
            skipWrite: false,
            payload: payloadToWrite,
            snapshot: {
                ...localSnapshot,
                syncVersion: baseSyncVersion + 1
            },
            contentHash: localHash,
            snapshotStorage: documentSnapshotPayload.snapshotStorage,
            snapshotSetId: documentSnapshotPayload.snapshotSetId || '',
            reason: 'local_ahead_write'
        };
    }, boardId);

    const finalSnapshot = writeResult?.snapshot;
    const finalContentHash = writeResult?.contentHash || contentHash;

    if (writeResult?.skipWrite) {
        let snapshotForLocalRefresh = finalSnapshot;
        const allowLocalRefreshOnSkipWrite = writeResult?.reason === 'content_matches_remote';
        const shouldHydrateChunkedRemote = (
            writeResult?.remoteDocument?.snapshotStorage === 'chunked' &&
            (!snapshotForLocalRefresh || buildBoardContentHash(snapshotForLocalRefresh) === EMPTY_CLOUD_CONTENT_HASH)
        );

        if (shouldHydrateChunkedRemote) {
            try {
                const hydratedRemoteBoard = await hydrateCloudBoardSnapshotFromChunks({
                    userId,
                    boardId,
                    boardData: writeResult.remoteDocument
                });
                snapshotForLocalRefresh = materializeCloudBoardSnapshot(hydratedRemoteBoard);
            } catch (hydrateError) {
                debugLog.warn(
                    `[Sync] Cloud save skipped and remote chunk hydration failed for board ${boardId}`,
                    hydrateError
                );
            }
        }

        const canRefreshFromSnapshot = (
            allowLocalRefreshOnSkipWrite &&
            snapshotForLocalRefresh &&
            buildBoardContentHash(snapshotForLocalRefresh) !== EMPTY_CLOUD_CONTENT_HASH
        );

        try {
            if (canRefreshFromSnapshot) {
                const localRefreshSnapshot = {
                    ...snapshotForLocalRefresh,
                    updatedAt: snapshotForLocalRefresh?.updatedAt || savedAt,
                    clientRevision: snapshotForLocalRefresh?.clientRevision || clientRevision
                };
                await saveBoard(boardId, localRefreshSnapshot);
                logPersistenceTrace('cloud-save:skip-write-refresh-local', {
                    boardId,
                    reason: writeResult.reason,
                    cursor: buildBoardCursorTrace(localRefreshSnapshot)
                });
            } else {
                logPersistenceTrace('cloud-save:skip-write-refresh-local-skipped', {
                    boardId,
                    reason: writeResult.reason,
                    refreshAllowed: allowLocalRefreshOnSkipWrite,
                    hasSnapshot: Boolean(snapshotForLocalRefresh),
                    remoteStorage: writeResult?.remoteDocument?.snapshotStorage || 'inline'
                });
            }
        } catch (localSaveError) {
            debugLog.warn(
                `[Sync] Cloud save skipped but local refresh failed for board ${boardId}`,
                localSaveError
            );
        }

        lastSyncedContentHash.set(cacheKey, finalContentHash);
        onSyncSuccess();
        return {
            status: CLOUD_SAVE_RESULT_OK,
            skipped: true,
            updatedAt: snapshotForLocalRefresh?.updatedAt || savedAt,
            syncVersion: snapshotForLocalRefresh?.syncVersion || 0,
            clientRevision: snapshotForLocalRefresh?.clientRevision || clientRevision,
            contentHash: finalContentHash
        };
    }

    try {
        const { snapshot: persistedSnapshot, source: persistedSource } = await loadPersistedBoardSnapshotForSync(boardId);
        const persistedHash = persistedSnapshot ? buildBoardContentHash(persistedSnapshot) : null;
        const shouldRefreshLocalSnapshot = !persistedSnapshot || persistedHash === contentHash;

        if (shouldRefreshLocalSnapshot) {
            const snapshotToRefresh = persistedSnapshot || boardContent;
            const refreshedSnapshot = {
                ...snapshotToRefresh,
                updatedAt: savedAt,
                syncVersion: finalSnapshot?.syncVersion || 0,
                clientRevision: Math.max(
                    toSafeClientRevision(snapshotToRefresh?.clientRevision),
                    clientRevision
                )
            };

            await saveBoard(boardId, refreshedSnapshot);
            logPersistenceTrace('cloud-save:refresh-local', {
                boardId,
                persistedSource: persistedSnapshot ? persistedSource : 'payload',
                syncVersion: finalSnapshot?.syncVersion || 0,
                clientRevision,
                cursor: buildBoardCursorTrace(refreshedSnapshot)
            });
        } else {
            logPersistenceTrace('cloud-save:skip-local-refresh', {
                boardId,
                persistedSource,
                syncVersion: finalSnapshot?.syncVersion || 0,
                clientRevision,
                persistedCursor: buildBoardCursorTrace(persistedSnapshot),
                payloadCursor: buildBoardCursorTrace({
                    ...boardContent,
                    updatedAt: savedAt,
                    syncVersion: finalSnapshot?.syncVersion || 0,
                    clientRevision
                })
            });
        }
    } catch (localSaveError) {
        debugLog.warn(
            `[Sync] Cloud save succeeded but local syncVersion refresh failed for board ${boardId}`,
            localSaveError
        );
    }

    if (snapshotStoragePlan.mode === 'chunked') {
        void cleanupStaleChunkedSnapshotSets({
            userId,
            boardId,
            keepSetId: writeResult?.snapshotSetId || snapshotStoragePlan.setId
        }).catch((cleanupError) => {
            debugLog.warn(`[Sync] Chunked snapshot cleanup failed for board ${boardId}`, cleanupError);
        });
    } else {
        void cleanupStaleChunkedSnapshotSets({
            userId,
            boardId,
            keepSetId: ''
        }).catch((cleanupError) => {
            debugLog.warn(`[Sync] Inline snapshot cleanup failed for board ${boardId}`, cleanupError);
        });
    }

    void cleanupBoardPatchesHistory({
        userId,
        boardId,
        keepCount: 40
    }).catch((cleanupError) => {
        debugLog.warn(`[Sync] Patch history cleanup failed for board ${boardId}`, cleanupError);
    });

    lastSyncedContentHash.set(cacheKey, finalContentHash);
    onSyncSuccess();
    debugLog.sync(`Board ${boardId} cloud save successful (syncVersion: ${finalSnapshot?.syncVersion || 0})`);

    return {
        status: CLOUD_SAVE_RESULT_OK,
        updatedAt: savedAt,
        syncVersion: finalSnapshot?.syncVersion || 0,
        clientRevision,
        contentHash: finalContentHash
    };
};

const scheduleCloudQueueRetry = (cacheKey, boardId, reason = 'retryable_error') => {
    if (cloudSaveRetryTimers.has(cacheKey)) return;
    const delayMs = getCloudQueueRetryDelay(cacheKey);
    debugLog.warn(`[SyncQueue] Retry scheduled for board ${boardId} in ${delayMs}ms (${reason})`);

    const timer = setTimeout(() => {
        cloudSaveRetryTimers.delete(cacheKey);
        if (pendingCloudSavePayloads.has(cacheKey) && !inFlightCloudSaveTasks.has(cacheKey)) {
            startCloudSaveRunner(cacheKey);
        }
    }, delayMs);

    cloudSaveRetryTimers.set(cacheKey, timer);
};

const startCloudSaveRunner = (cacheKey) => {
    const runner = (async () => {
        let lastResult = { status: CLOUD_SAVE_RESULT_OK };

        while (pendingCloudSavePayloads.has(cacheKey)) {
            const payload = pendingCloudSavePayloads.get(cacheKey);
            pendingCloudSavePayloads.delete(cacheKey);
            if (!payload) continue;

            const boardId = payload.boardId || cacheKey.split(':').slice(1).join(':');

            try {
                const result = await persistBoardToCloudOnce(payload);
                if (result?.status === CLOUD_SAVE_RESULT_DEFERRED_OFFLINE) {
                    lastResult = result;
                    pendingCloudSavePayloads.set(cacheKey, payload);
                    scheduleCloudQueueRetry(cacheKey, boardId, CLOUD_SAVE_RESULT_DEFERRED_OFFLINE);
                    break;
                }

                lastResult = result || { status: CLOUD_SAVE_RESULT_OK };
                clearCloudQueueRetryState(cacheKey);
            } catch (error) {
                if (isRetryableSyncWriteError(error)) {
                    lastResult = {
                        status: CLOUD_SAVE_RESULT_QUEUED_RETRY,
                        errorCode: error?.code || 'retryable_error'
                    };
                    pendingCloudSavePayloads.set(cacheKey, payload);
                    scheduleCloudQueueRetry(cacheKey, boardId, error?.code || 'retryable_error');
                    break;
                }

                clearCloudQueueRetryState(cacheKey);
                handleSyncError(`Cloud save failed for board ${boardId}`, error);
                throw error;
            }
        }

        return lastResult;
    })().finally(() => {
        inFlightCloudSaveTasks.delete(cacheKey);
        if (pendingCloudSavePayloads.has(cacheKey) && !cloudSaveRetryTimers.has(cacheKey)) {
            startCloudSaveRunner(cacheKey);
        }
    });

    inFlightCloudSaveTasks.set(cacheKey, runner);
    return runner;
};

export const saveBoardToCloud = async (userId, boardId, boardContent, options = {}) => {
    if (!db || !userId) return null;

    const cacheKey = `${userId}:${boardId}`;
    const contentHash = buildBoardContentHash(boardContent);
    const incrementalPatch = options?.incrementalPatch || null;
    logPersistenceTrace('cloud-save:queue', {
        boardId,
        cursor: buildBoardCursorTrace(boardContent)
    });

    pendingCloudSavePayloads.set(cacheKey, {
        userId,
        boardId,
        boardContent,
        cacheKey,
        contentHash,
        incrementalPatch
    });

    const retryTimer = cloudSaveRetryTimers.get(cacheKey);
    if (retryTimer) {
        clearTimeout(retryTimer);
        cloudSaveRetryTimers.delete(cacheKey);
        cloudSaveRetryAttempts.delete(cacheKey);
    }

    if (inFlightCloudSaveTasks.has(cacheKey)) {
        return inFlightCloudSaveTasks.get(cacheKey);
    }

    return startCloudSaveRunner(cacheKey);
};

export const updateBoardMetadataInCloud = async (userId, boardId, metadata) => {
    if (!db || !userId || isOfflineMode()) return;

    try {
        debugLog.sync(`Updating cloud metadata for board ${boardId}`, metadata);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await setDoc(boardRef, metadata, { merge: true });
    } catch (error) {
        handleSyncError(`Cloud metadata update failed for board ${boardId}`, error);
    }
};

export const deleteBoardFromCloud = async (userId, boardId) => {
    if (!db || !userId) return;

    try {
        debugLog.sync(`Deleting board ${boardId} from cloud`);
        const boardRef = doc(db, 'users', userId, 'boards', boardId);
        await deleteDoc(boardRef);
    } catch (error) {
        debugLog.error(`Cloud delete failed for board ${boardId}`, error);
    }
};
