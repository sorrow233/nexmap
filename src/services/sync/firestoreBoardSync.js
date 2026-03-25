import {
    getDoc,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    FIREBASE_SYNC_SAFE_MODE,
    FIREBASE_SYNC_SAFE_MODE_UPLOAD_DEBOUNCE_MS,
    FIREBASE_SYNC_ORIGINS
} from './config';
import {
    encodeCompactBoardSnapshotUpdate,
    syncBoardSnapshotToDoc,
    isBoardDocEmpty,
    readBoardSnapshotFromDoc
} from './boardYDoc';
import { isMeaningfullyEmptyBoardSnapshot, normalizeBoardSnapshot } from './boardSnapshot';
import { bytesToBase64 } from './base64';
import {
    hasRemoteCheckpoint,
    loadBoardCheckpoint,
    saveBoardCheckpoint,
    toFirestoreMillis
} from './firestoreCheckpointStore';
import { readCheckpointPayloadSnapshot } from './checkpointCompatibility';
import { createBoardRootRef } from './firestoreSyncPaths';
import { migrateLegacyRootSnapshotToCheckpoint } from './legacyCloudBoardMigration';
import { pickBoardSyncMetadata } from './boardSyncMetadata';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import { resolveCheckpointSnapshotForDoc } from './protocol/syncResolver';
import {
    resolveSafeModeDebounceByLane,
    SYNC_LANES
} from './protocol/syncLane';

const CHECKPOINT_ONLY_MAX_PENDING_BYTES = 256 * 1024;
const SNAPSHOT_CLEANUP_SAVE_INTERVAL = 8;

const parseCheckpointReason = (reason = '') => {
    const normalizedReason = String(reason || '');
    if (!normalizedReason.includes(':')) {
        return {
            reason: normalizedReason,
            lane: SYNC_LANES.FULL
        };
    }

    const [baseReason, lane] = normalizedReason.split(':');
    return {
        reason: baseReason || normalizedReason,
        lane: lane || SYNC_LANES.FULL
    };
};

const buildRootCheckpointKey = (rootData = {}) => {
    if (!rootData || typeof rootData !== 'object') return '';

    const storage = typeof rootData.checkpointStorage === 'string'
        ? rootData.checkpointStorage
        : '';
    const savedAtMs = toFirestoreMillis(rootData.checkpointSavedAtMs);

    if (storage === 'chunked') {
        const checkpointSetId = typeof rootData.checkpointSetId === 'string'
            ? rootData.checkpointSetId
            : '';
        const partCount = Number(rootData.checkpointPartCount) || 0;
        return `chunked:${checkpointSetId}:${savedAtMs}:${partCount}`;
    }

    const base64Length = typeof rootData.checkpointBase64 === 'string'
        ? rootData.checkpointBase64.length
        : 0;
    return `inline:${savedAtMs}:${base64Length}`;
};

export class FirestoreBoardSync {
    constructor({ boardId, userId, deviceId, doc: ydoc, onRemoteApplied, onSyncStateChange }) {
        this.boardId = boardId;
        this.userId = userId;
        this.deviceId = deviceId;
        this.doc = ydoc;
        this.onRemoteApplied = onRemoteApplied;
        this.onSyncStateChange = onSyncStateChange;
        this.unsubscribe = null;
        this.pendingBytes = 0;
        this.flushTimer = null;
        this.remoteIsEmpty = true;
        this.latestCheckpointSavedAtMs = 0;
        this.latestCheckpointServerSavedAt = null;
        this.latestCheckpointSignature = '';
        this.latestCheckpointRootKey = '';
        this.latestRootSyncTouchedAtMs = 0;
        this.connected = false;
        this.rootUnsubscribe = null;
        this.hasUnsnapshottedChanges = false;
        this.flushPromise = null;
        this.flushQueuedReason = '';
        this.snapshotSavePromise = null;
        this.snapshotSaveQueuedReason = '';
        this.snapshotSaveCount = 0;
        this.localUpdateSequence = 0;
        this.remoteMetadata = {
            hasCheckpoint: false,
            updatedAt: 0,
            clientRevision: 0,
            cardCount: 0
        };
        this.lastFlushCompletedAt = 0;
        this.pendingSyncLane = SYNC_LANES.NONE;

        this.handleDocUpdate = this.handleDocUpdate.bind(this);
        this.doc.on('update', this.handleDocUpdate);

        this.immediateFlushHandler = () => {
            if (this.hasUnsnapshottedChanges || this.flushQueuedReason) {
                this.flushPendingUpdates('pagehide_immediate').catch(() => {});
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('pagehide', this.immediateFlushHandler);
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.immediateFlushHandler();
                }
            });
        }
    }

    emitState(status, extra = {}) {
        this.onSyncStateChange?.({
            status,
            boardId: this.boardId,
            ...extra
        });
    }

    hasQueuedLocalWrites() {
        return Boolean(
            this.pendingBytes > 0
            || this.pendingSyncLane !== SYNC_LANES.NONE
            || this.flushTimer
            || this.flushPromise
        );
    }

    async connect(options = {}) {
        void options;
        if (!db) {
            this.emitState('disabled');
            return { remoteIsEmpty: true };
        }

        this.emitState('connecting');
        const loadResult = await this.loadRemoteCheckpoint();

        this.subscribeToRootCheckpoint();
        this.connected = true;
        this.emitState('connected', {
            remoteIsEmpty: this.remoteIsEmpty,
            mode: FIREBASE_SYNC_SAFE_MODE ? 'safe_checkpoint_lane' : 'checkpoint_lane'
        });
        return {
            remoteIsEmpty: this.remoteIsEmpty,
            skippedRemoteApplyReason: loadResult?.skippedApplyReason || ''
        };
    }

    updateRemoteMetadataFromRoot(rootData = null) {
        this.remoteMetadata = {
            hasCheckpoint: hasRemoteCheckpoint(rootData),
            updatedAt: toFirestoreMillis(rootData?.updatedAt),
            clientRevision: Number(rootData?.clientRevision) || 0,
            cardCount: Number(rootData?.cardCount) || 0
        };
    }

    async applyLoadedCheckpoint(checkpoint, rootData) {
        const decodedCheckpoint = readCheckpointPayloadSnapshot({
            updateBase64: checkpoint.updateBase64,
            rootData
        });
        const currentSnapshot = readBoardSnapshotFromDoc(this.doc);
        const resolution = resolveCheckpointSnapshotForDoc({
            currentSnapshot,
            incomingSnapshot: decodedCheckpoint.snapshot
        });

        if (decodedCheckpoint.recovered) {
            console.warn(`[FirebaseSync] Recovered incompatible checkpoint for board ${this.boardId} via ${decodedCheckpoint.format}`);
            this.emitState('warning', {
                message: `Recovered ${decodedCheckpoint.format} checkpoint for ${this.boardId}, keeping compatibility mode until next local save`
            });
        }

        if (resolution.action === 'apply') {
            this.doc.transact(() => {
                syncBoardSnapshotToDoc(this.doc, resolution.snapshot);
            }, FIREBASE_SYNC_ORIGINS.firestore);
        }

        return {
            format: decodedCheckpoint.format,
            recovered: decodedCheckpoint.recovered,
            applied: resolution.action === 'apply',
            reason: resolution.reason,
            shouldRepairRemote: resolution.shouldRepairRemote
        };
    }

    async loadRemoteCheckpoint(rootData = null) {
        const rootRef = createBoardRootRef(this.userId, this.boardId);
        let effectiveRootData = rootData || (await getDoc(rootRef)).data();
        this.latestRootSyncTouchedAtMs = toFirestoreMillis(effectiveRootData?.syncTouchedAtMs);

        if (!hasRemoteCheckpoint(effectiveRootData)) {
            const migratedCheckpoint = await migrateLegacyRootSnapshotToCheckpoint({
                userId: this.userId,
                boardId: this.boardId,
                deviceId: this.deviceId,
                rootData: effectiveRootData
            });

            if (migratedCheckpoint) {
                effectiveRootData = (await getDoc(rootRef)).data();
            }
        }

        if (!hasRemoteCheckpoint(effectiveRootData)) {
            this.remoteIsEmpty = true;
            this.latestCheckpointServerSavedAt = null;
            this.updateRemoteMetadataFromRoot(effectiveRootData);
            return;
        }

        const checkpoint = await loadBoardCheckpoint({
            userId: this.userId,
            boardId: this.boardId,
            rootData: effectiveRootData
        });

        if (!checkpoint?.updateBase64) {
            this.remoteIsEmpty = true;
            return;
        }

        this.remoteIsEmpty = false;
        this.updateRemoteMetadataFromRoot(effectiveRootData);
        this.latestCheckpointSavedAtMs = checkpoint.savedAtMs || 0;
        this.latestCheckpointServerSavedAt = effectiveRootData?.checkpointServerSavedAt || null;
        this.latestCheckpointSignature = checkpoint.signature || '';
        this.latestCheckpointRootKey = buildRootCheckpointKey(effectiveRootData);
        if (!this.hasQueuedLocalWrites()) {
            this.hasUnsnapshottedChanges = false;
        }

        try {
            await this.applyLoadedCheckpoint(checkpoint, effectiveRootData);
        } catch (error) {
            if (!isBoardDocEmpty(this.doc)) {
                console.error(`[FirebaseSync] Failed to decode remote checkpoint for board ${this.boardId}, keeping local snapshot:`, error);
                this.emitState('warning', {
                    message: `Remote checkpoint decode failed for ${this.boardId}, kept local snapshot`
                });
                return;
            }

            throw error;
        }
    }

    subscribeToRootCheckpoint() {
        const rootRef = createBoardRootRef(this.userId, this.boardId);
        this.rootUnsubscribe = onSnapshot(rootRef, async (rootDoc) => {
            const data = rootDoc.data();
            if (!data || !hasRemoteCheckpoint(data)) {
                return;
            }

            this.updateRemoteMetadataFromRoot(data);
            const remoteSyncTouchedAtMs = toFirestoreMillis(data.syncTouchedAtMs);

            const remoteSavedAtMs = toFirestoreMillis(data.checkpointSavedAtMs);
            const nextRootCheckpointKey = buildRootCheckpointKey(data);
            if (
                nextRootCheckpointKey &&
                nextRootCheckpointKey === this.latestCheckpointRootKey &&
                remoteSavedAtMs <= this.latestCheckpointSavedAtMs
            ) {
                this.latestRootSyncTouchedAtMs = Math.max(
                    this.latestRootSyncTouchedAtMs,
                    remoteSyncTouchedAtMs
                );
                return;
            }

            if (remoteSavedAtMs < this.latestCheckpointSavedAtMs) {
                return;
            }

            const checkpoint = await loadBoardCheckpoint({
                userId: this.userId,
                boardId: this.boardId,
                rootData: data
            });

            if (!checkpoint?.updateBase64 || checkpoint.signature === this.latestCheckpointSignature) {
                return;
            }

            this.latestCheckpointSavedAtMs = checkpoint.savedAtMs || remoteSavedAtMs || 0;
            this.latestCheckpointServerSavedAt = data.checkpointServerSavedAt || this.latestCheckpointServerSavedAt;
            this.latestCheckpointSignature = checkpoint.signature || '';
            this.latestCheckpointRootKey = nextRootCheckpointKey || this.latestCheckpointRootKey;
            this.latestRootSyncTouchedAtMs = remoteSyncTouchedAtMs;
            if (!this.hasQueuedLocalWrites()) {
                this.hasUnsnapshottedChanges = false;
            }

            try {
                const applyResult = await this.applyLoadedCheckpoint(checkpoint, data);
                if (applyResult.applied) {
                    this.remoteIsEmpty = false;
                    this.onRemoteApplied?.();
                }
            } catch (error) {
                if (!isBoardDocEmpty(this.doc)) {
                    console.error(`[FirebaseSync] Failed to decode remote checkpoint update for board ${this.boardId}, keeping current snapshot:`, error);
                    this.emitState('warning', {
                        message: `Remote checkpoint update decode failed for ${this.boardId}, kept current snapshot`
                    });
                    return;
                }

                throw error;
            }
        }, (error) => {
            this.emitState('warning', {
                message: error?.message || 'Checkpoint listener failed'
            });
        });
    }

    handleDocUpdate(update, origin) {
        if (
            origin === FIREBASE_SYNC_ORIGINS.firestore
            || origin === FIREBASE_SYNC_ORIGINS.indexeddb
            || origin === FIREBASE_SYNC_ORIGINS.forceOverride
        ) {
            return;
        }

        this.pendingBytes += update.byteLength || update.length || 0;
        this.hasUnsnapshottedChanges = true;
        this.localUpdateSequence += 1;
        const updateLane = origin === FIREBASE_SYNC_ORIGINS.storeSkeleton
            ? SYNC_LANES.SKELETON
            : (origin === FIREBASE_SYNC_ORIGINS.storeBody
                ? SYNC_LANES.BODY
                : SYNC_LANES.FULL);
        if (updateLane === SYNC_LANES.FULL || this.pendingSyncLane === SYNC_LANES.NONE) {
            this.pendingSyncLane = updateLane;
        } else if (this.pendingSyncLane !== updateLane) {
            this.pendingSyncLane = SYNC_LANES.FULL;
        }
        this.scheduleFlush();
    }

    scheduleFlush() {
        const maxPendingBytes = CHECKPOINT_ONLY_MAX_PENDING_BYTES;
        const debounceMs = FIREBASE_SYNC_SAFE_MODE
            ? resolveSafeModeDebounceByLane(
                this.pendingSyncLane,
                FIREBASE_SYNC_SAFE_MODE_UPLOAD_DEBOUNCE_MS
            )
            : 12000;

        if (this.pendingBytes >= maxPendingBytes) {
            void this.flushPendingUpdates('size_limit');
            return;
        }

        if (this.flushTimer) {
            // Throttle instead of infinite debounce: let the existing timer fire
            return;
        }

        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flushPendingUpdates('debounced');
        }, debounceMs);
    }

    async waitForPendingWrites() {
        if (this.flushPromise) {
            try {
                await this.flushPromise;
            } catch (error) {
                console.warn(`[FirebaseSync] Pending update flush failed before force override for board ${this.boardId}:`, error);
            }
        }
    }

    clearPendingLocalQueue() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        this.pendingBytes = 0;
        this.pendingSyncLane = SYNC_LANES.NONE;
        this.flushQueuedReason = '';
        this.hasUnsnapshottedChanges = false;
    }

    async flushPendingUpdates(reason = 'manual') {
        if (!db) return;
        if (this.flushPromise) {
            this.flushQueuedReason = reason;
            return this.flushPromise;
        }

        const runFlushStep = async () => {
            let nextReason = reason;

            const timeSinceLastFlush = Date.now() - this.lastFlushCompletedAt;
            const throttleMs = FIREBASE_SYNC_SAFE_MODE ? 1800 : 2500;
            if (timeSinceLastFlush < throttleMs && this.lastFlushCompletedAt > 0) {
                await new Promise(resolve => setTimeout(resolve, throttleMs - timeSinceLastFlush));
            }
            this.flushQueuedReason = '';

            if (!this.hasUnsnapshottedChanges) {
                this.pendingBytes = 0;
                this.pendingSyncLane = SYNC_LANES.NONE;
                return;
            }

            const currentReason = nextReason || 'debounced';
            const currentSyncLane = this.pendingSyncLane;
            this.pendingBytes = 0;
            this.pendingSyncLane = SYNC_LANES.NONE;
            await this.saveSnapshot(`checkpoint_lane_flush:${currentSyncLane || SYNC_LANES.FULL}`);
        };

        this.flushPromise = runFlushStep().finally(() => {
            this.lastFlushCompletedAt = Date.now();
            this.flushPromise = null;
            if (this.hasUnsnapshottedChanges || this.flushQueuedReason) {
                this.scheduleFlush();
            }
        });

        return this.flushPromise;
    }

    async saveSnapshot(reason = 'manual_snapshot') {
        if (!db) return;
        if (this.snapshotSavePromise) {
            this.snapshotSaveQueuedReason = reason;
            return this.snapshotSavePromise;
        }

        const runSnapshotLoop = async () => {
            let nextReason = reason;
            let latestCheckpoint = null;

            while (nextReason) {
                const currentReason = nextReason;
                nextReason = '';
                this.snapshotSaveQueuedReason = '';

                try {
                    this.snapshotSaveCount += 1;
                    const checkpointReason = parseCheckpointReason(currentReason);
                    const checkpointSequence = this.localUpdateSequence;
                    const shouldCleanupStaleCheckpoints = (
                        checkpointReason.reason === 'controller_stop'
                        || checkpointReason.reason === 'periodic_compaction'
                        || (this.snapshotSaveCount % SNAPSHOT_CLEANUP_SAVE_INTERVAL) === 0
                    );

                    const liveSnapshot = readBoardSnapshotFromDoc(this.doc);
                    const update = encodeCompactBoardSnapshotUpdate(liveSnapshot);
                    const checkpoint = await saveBoardCheckpoint({
                        userId: this.userId,
                        boardId: this.boardId,
                        deviceId: this.deviceId,
                        updateBase64: bytesToBase64(update),
                        reason: checkpointReason.reason,
                        cleanupStale: shouldCleanupStaleCheckpoints,
                        snapshotMetadata: pickBoardSyncMetadata(liveSnapshot)
                    });

                    if (checkpoint) {
                        this.latestCheckpointSavedAtMs = checkpoint.savedAtMs || this.latestCheckpointSavedAtMs;
                        this.latestCheckpointSignature = checkpoint.signature || this.latestCheckpointSignature;
                        this.remoteIsEmpty = false;
                        this.hasUnsnapshottedChanges = this.localUpdateSequence > checkpointSequence;
                        logPersistenceTrace('sync:firestore-checkpoint-saved', {
                            boardId: this.boardId,
                            reason: checkpointReason.reason,
                            lane: checkpointReason.lane,
                            safeMode: FIREBASE_SYNC_SAFE_MODE,
                            cursor: buildBoardCursorTrace(liveSnapshot)
                        });
                    }

                    latestCheckpoint = checkpoint;
                } catch (error) {
                    console.error(`[FirebaseSync] Failed to save checkpoint for board ${this.boardId}:`, error);
                    this.emitState('warning', {
                        message: error?.message || 'Checkpoint save failed'
                    });
                    return null;
                }

                if (this.snapshotSaveQueuedReason) {
                    nextReason = this.snapshotSaveQueuedReason;
                }
            }

            return latestCheckpoint;
        };

        this.snapshotSavePromise = runSnapshotLoop().finally(() => {
            this.snapshotSavePromise = null;
            this.snapshotSaveQueuedReason = '';
        });

        return this.snapshotSavePromise;
    }

    async stop() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        if (this.hasUnsnapshottedChanges) {
            try {
                await this.flushPendingUpdates('controller_stop');
            } catch (error) {
                console.error(`[FirebaseSync] Failed to flush pending updates during stop for board ${this.boardId}:`, error);
                this.emitState('warning', {
                    message: error?.message || 'Final update flush failed'
                });
            }
        }

        if (this.connected && this.hasUnsnapshottedChanges) {
            await this.saveSnapshot('controller_stop');
        }

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        if (this.rootUnsubscribe) {
            this.rootUnsubscribe();
            this.rootUnsubscribe = null;
        }

        this.doc.off('update', this.handleDocUpdate);
        
        if (typeof window !== 'undefined' && this.immediateFlushHandler) {
            window.removeEventListener('pagehide', this.immediateFlushHandler);
            // document visibilitychange can't be removed easily exactly, but it's safe to just leave it dead or we can ignore since it binds to inline arrow. 
            // It's better to just set immediateFlushHandler to a no-op if stopped.
            this.immediateFlushHandler = () => {};
        }

        this.connected = false;
    }
}

export const seedLocalBoardSnapshotIfRemoteEmpty = async ({
    userId,
    boardId,
    snapshot,
    deviceId
}) => {
    if (!db || !userId || !boardId) return false;

    const normalizedSnapshot = normalizeBoardSnapshot(snapshot);
    if (isMeaningfullyEmptyBoardSnapshot(normalizedSnapshot)) {
        return false;
    }

    const existingRootDoc = await getDoc(createBoardRootRef(userId, boardId));
    const existingRootData = existingRootDoc.data();

    if (hasRemoteCheckpoint(existingRootData)) {
        return false;
    }

    const migratedCheckpoint = await migrateLegacyRootSnapshotToCheckpoint({
        userId,
        boardId,
        deviceId,
        rootData: existingRootData
    });

    if (migratedCheckpoint) {
        return false;
    }

    let checkpoint = null;
    try {
        checkpoint = await saveBoardCheckpoint({
            userId,
            boardId,
            deviceId,
            updateBase64: bytesToBase64(encodeCompactBoardSnapshotUpdate(normalizedSnapshot)),
            reason: 'local_seed',
            snapshotMetadata: pickBoardSyncMetadata(normalizedSnapshot)
        });
    } catch (error) {
        console.error(`[FirebaseSync] Failed to seed local board ${boardId}:`, error);
    }
    return Boolean(checkpoint);
};
