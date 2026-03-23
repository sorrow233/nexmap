import * as Y from 'yjs';
import {
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    FIREBASE_SYNC_LIMITS,
    FIREBASE_SYNC_ORIGINS
} from './config';
import { uuid } from '../../utils/uuid';
import {
    encodeCompactBoardSnapshotUpdate,
    isBoardDocEmpty,
    readBoardSnapshotFromDoc
} from './boardYDoc';
import { isMeaningfullyEmptyBoardSnapshot, normalizeBoardSnapshot } from './boardSnapshot';
import { base64ToBytes, bytesToBase64 } from './base64';
import {
    hasRemoteCheckpoint,
    loadBoardCheckpoint,
    saveBoardCheckpoint,
    toFirestoreMillis
} from './firestoreCheckpointStore';
import { applyCheckpointPayloadToDoc } from './checkpointCompatibility';
import { createBoardRootRef, createUpdatesCollectionRef } from './firestoreSyncPaths';
import { buildAuthoritativeRootPayload } from './firestoreRootDocument';
import { migrateLegacyRootSnapshotToCheckpoint } from './legacyCloudBoardMigration';
import { planDeferredRemoteCheckpointRepair } from './remoteCheckpointRepairPlanner';
import { pickBoardSyncMetadata } from './boardSyncMetadata';

const CHECKPOINT_ONLY_UPLOAD_DEBOUNCE_MS = 12000;
const CHECKPOINT_ONLY_MAX_PENDING_BYTES = 256 * 1024;
const SNAPSHOT_CLEANUP_SAVE_INTERVAL = 8;

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
        this.pendingUpdates = [];
        this.pendingBytes = 0;
        this.flushTimer = null;
        this.flushCount = 0;
        this.appliedRemoteIds = new Set();
        this.ignoredEchoIds = new Set();
        this.remoteIsEmpty = true;
        this.latestCheckpointSavedAtMs = 0;
        this.latestCheckpointServerSavedAt = null;
        this.latestCheckpointSignature = '';
        this.latestCheckpointRootKey = '';
        this.latestRootSyncTouchedAtMs = 0;
        this.connected = false;
        this.rootUnsubscribe = null;
        this.updateLogEnabled = Boolean(FIREBASE_SYNC_LIMITS.enableDeltaUpdateLog);
        this.hasUnsnapshottedChanges = false;
        this.flushPromise = null;
        this.flushQueuedReason = '';
        this.snapshotSavePromise = null;
        this.snapshotSaveQueuedReason = '';
        this.snapshotSaveCount = 0;
        this.repairedCheckpointSignatures = new Set();
        this.deferredCheckpointRepairReason = '';
        this.remoteCheckpointRecoveredFromCompatibility = false;
        this.remoteMetadata = {
            hasCheckpoint: false,
            updatedAt: 0,
            clientRevision: 0,
            cardCount: 0
        };
        this.lastFlushCompletedAt = 0;

        this.handleDocUpdate = this.handleDocUpdate.bind(this);
        this.doc.on('update', this.handleDocUpdate);

        this.immediateFlushHandler = () => {
            if (this.pendingUpdates.length > 0 || this.hasUnsnapshottedChanges || this.flushQueuedReason) {
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

    buildTailUpdatesQuery(updatesRef) {
        if (this.latestCheckpointServerSavedAt) {
            return query(
                updatesRef,
                where('createdAt', '>=', this.latestCheckpointServerSavedAt),
                orderBy('createdAt', 'asc')
            );
        }

        if (this.latestCheckpointSavedAtMs > 0) {
            return query(
                updatesRef,
                where('createdAtMs', '>', this.latestCheckpointSavedAtMs),
                orderBy('createdAtMs', 'asc')
            );
        }

        return query(updatesRef, orderBy('createdAt', 'asc'));
    }

    shouldDeferRemoteApply({ localSnapshot, expectedCardCount = 0 } = {}) {
        const plan = planDeferredRemoteCheckpointRepair({
            localSnapshot,
            expectedCardCount,
            remoteMetadata: {
                ...this.remoteMetadata,
                recoveredFromCompatibility: this.remoteCheckpointRecoveredFromCompatibility
            }
        });

        if (!plan.shouldRepair) {
            return null;
        }

        if (
            plan.reason === 'local_snapshot_repair'
            || plan.reason === 'local_snapshot_cardcount_repair'
        ) {
            this.queueDeferredCheckpointRepair(plan.reason);
            return plan;
        }

        return null;
    }

    async connect(options = {}) {
        if (!db) {
            this.emitState('disabled');
            return { remoteIsEmpty: true };
        }

        this.emitState('connecting');
        const loadResult = await this.loadRemoteCheckpoint(null, options);

        if (this.updateLogEnabled) {
            try {
                await this.loadTailUpdates();
                this.subscribeToTailUpdates();
            } catch (error) {
                this.updateLogEnabled = false;
                this.emitState('warning', {
                    message: error?.message || 'Firestore updates unavailable, fallback to checkpoint mode'
                });
            }
        }

        this.subscribeToRootCheckpoint();
        this.connected = true;
        this.emitState('connected', {
            remoteIsEmpty: this.remoteIsEmpty,
            mode: this.updateLogEnabled ? 'delta' : 'checkpoint_only'
        });
        return {
            remoteIsEmpty: this.remoteIsEmpty,
            skippedRemoteApplyReason: loadResult?.skippedApplyReason || ''
        };
    }

    queueRecoveredCheckpointRepair(signature = '', format = 'unknown') {
        if (!signature || this.repairedCheckpointSignatures.has(signature)) {
            return;
        }

        this.repairedCheckpointSignatures.add(signature);
        this.remoteCheckpointRecoveredFromCompatibility = true;
        this.queueDeferredCheckpointRepair('checkpoint_decode_repair');
        this.emitState('warning', {
            message: `Recovered ${format} checkpoint for ${this.boardId}, will rewrite on next save`
        });
    }

    queueDeferredCheckpointRepair(reason = 'local_snapshot_repair') {
        if (!reason) return;
        if (this.deferredCheckpointRepairReason === 'checkpoint_decode_repair') {
            return;
        }
        this.deferredCheckpointRepairReason = reason;
    }

    updateRemoteMetadataFromRoot(rootData = null) {
        this.remoteMetadata = {
            hasCheckpoint: hasRemoteCheckpoint(rootData),
            updatedAt: toFirestoreMillis(rootData?.updatedAt),
            clientRevision: Number(rootData?.clientRevision) || 0,
            cardCount: Number(rootData?.cardCount) || 0
        };
    }

    planDeferredRepair(localSnapshot, { expectedCardCount = 0 } = {}) {
        const plan = planDeferredRemoteCheckpointRepair({
            localSnapshot,
            expectedCardCount,
            remoteMetadata: {
                ...this.remoteMetadata,
                recoveredFromCompatibility: this.remoteCheckpointRecoveredFromCompatibility
            }
        });

        if (plan.shouldRepair) {
            this.queueDeferredCheckpointRepair(plan.reason);
        }

        return plan;
    }

    applyLoadedCheckpoint(checkpoint, rootData) {
        const result = applyCheckpointPayloadToDoc({
            doc: this.doc,
            updateBase64: checkpoint.updateBase64,
            rootData,
            origin: FIREBASE_SYNC_ORIGINS.firestore
        });

        if (result.recovered) {
            console.warn(`[FirebaseSync] Recovered incompatible checkpoint for board ${this.boardId} via ${result.format}`);
            this.queueRecoveredCheckpointRepair(checkpoint.signature, result.format);
        }

        return result;
    }

    async loadRemoteCheckpoint(rootData = null, options = {}) {
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
        this.hasUnsnapshottedChanges = false;

        const deferredPlan = this.shouldDeferRemoteApply({
            localSnapshot: options.localSnapshot,
            expectedCardCount: options.expectedCardCount
        });
        if (deferredPlan) {
            this.emitState('warning', {
                message: `Skipped stale remote checkpoint for ${this.boardId}, local snapshot will repair remote`
            });
            return {
                skippedApplyReason: deferredPlan.reason
            };
        }

        try {
            this.applyLoadedCheckpoint(checkpoint, effectiveRootData);
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

    async loadTailUpdates() {
        const updatesRef = createUpdatesCollectionRef(this.userId, this.boardId);
        const tailQuery = this.buildTailUpdatesQuery(updatesRef);

        const updateDocs = await getDocs(tailQuery);
        if (!updateDocs.empty) {
            this.remoteIsEmpty = false;
        }

        updateDocs.docs.forEach((updateDoc) => {
            this.applyRemoteUpdateDoc(updateDoc.id, updateDoc.data());
        });
    }

    subscribeToTailUpdates() {
        const updatesRef = createUpdatesCollectionRef(this.userId, this.boardId);
        const liveQuery = this.buildTailUpdatesQuery(updatesRef);

        this.unsubscribe = onSnapshot(liveQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type !== 'added') return;
                this.applyRemoteUpdateDoc(change.doc.id, change.doc.data());
            });
        }, (error) => {
            this.updateLogEnabled = false;
            this.emitState('warning', {
                message: error?.message || 'Firestore listener failed'
            });
        });
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
                if (
                    this.updateLogEnabled &&
                    remoteSyncTouchedAtMs > this.latestRootSyncTouchedAtMs
                ) {
                    this.latestRootSyncTouchedAtMs = remoteSyncTouchedAtMs;
                    try {
                        await this.loadTailUpdates();
                    } catch (error) {
                        this.emitState('warning', {
                            message: error?.message || 'Tail update catch-up failed'
                        });
                    }
                }
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
            this.hasUnsnapshottedChanges = false;

            const deferredPlan = this.shouldDeferRemoteApply({
                localSnapshot: readBoardSnapshotFromDoc(this.doc),
                expectedCardCount: this.remoteMetadata.cardCount
            });
            if (deferredPlan) {
                return;
            }

            try {
                this.applyLoadedCheckpoint(checkpoint, data);
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
            this.remoteIsEmpty = false;
            this.onRemoteApplied?.();
        }, (error) => {
            this.emitState('warning', {
                message: error?.message || 'Checkpoint listener failed'
            });
        });
    }

    applyRemoteUpdateDoc(updateId, data = {}) {
        if (!data?.updateBase64) return;
        if (this.appliedRemoteIds.has(updateId)) return;
        this.appliedRemoteIds.add(updateId);

        if (this.ignoredEchoIds.has(updateId)) {
            this.ignoredEchoIds.delete(updateId);
            return;
        }

        const update = base64ToBytes(data.updateBase64);
        Y.applyUpdate(this.doc, update, FIREBASE_SYNC_ORIGINS.firestore);
        this.remoteIsEmpty = false;
        this.onRemoteApplied?.();
    }

    handleDocUpdate(update, origin) {
        if (
            origin === FIREBASE_SYNC_ORIGINS.firestore
            || origin === FIREBASE_SYNC_ORIGINS.indexeddb
            || origin === FIREBASE_SYNC_ORIGINS.forceOverride
        ) {
            return;
        }

        this.pendingUpdates.push(update);
        this.pendingBytes += update.byteLength || update.length || 0;
        this.hasUnsnapshottedChanges = true;
        this.scheduleFlush();
    }

    scheduleFlush() {
        const maxPendingBytes = this.updateLogEnabled
            ? FIREBASE_SYNC_LIMITS.maxPendingUpdateBytes
            : CHECKPOINT_ONLY_MAX_PENDING_BYTES;
        const debounceMs = this.updateLogEnabled
            ? FIREBASE_SYNC_LIMITS.uploadDebounceMs
            : CHECKPOINT_ONLY_UPLOAD_DEBOUNCE_MS;

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

        this.pendingUpdates = [];
        this.pendingBytes = 0;
        this.flushQueuedReason = '';
    }

    async flushPendingUpdates(reason = 'manual') {
        if (!db) return;
        if (this.flushPromise) {
            this.flushQueuedReason = reason;
            return this.flushPromise;
        }

        const runFlushStep = async () => {
            let nextReason = reason;

            // Enforce a hard throttle to protect Firestore's 1 write/sec single-document limit
            // even if `size_limit` forces early flushes.
            const timeSinceLastFlush = Date.now() - this.lastFlushCompletedAt;
            const throttleMs = this.updateLogEnabled ? 1200 : 2500;
            if (timeSinceLastFlush < throttleMs && this.lastFlushCompletedAt > 0) {
                await new Promise(resolve => setTimeout(resolve, throttleMs - timeSinceLastFlush));
            }

            // Instead of looping continuously without delay, we just do ONE flush pass.
            // If new updates arrive while we are flushing, they will be captured
            // and processed in the NEXT debounced flush.
            
            this.flushQueuedReason = '';
            
            if (this.pendingUpdates.length === 0) {
                return;
            }

            const currentReason = nextReason || 'debounced';
            
            const merged = Y.mergeUpdates(this.pendingUpdates);
            this.pendingUpdates = [];
            this.pendingBytes = 0;

            if (this.updateLogEnabled) {
                const updatesRef = createUpdatesCollectionRef(this.userId, this.boardId);
                const updateId = `${this.deviceId}_${Date.now()}_${uuid()}`;
                this.ignoredEchoIds.add(updateId);

                try {
                    await setDoc(doc(updatesRef, updateId), {
                        updateBase64: bytesToBase64(merged),
                        byteLength: merged.byteLength || merged.length || 0,
                        deviceId: this.deviceId,
                        reason: currentReason,
                        createdAtMs: Date.now(),
                        createdAt: serverTimestamp()
                    });
                } catch (error) {
                    this.updateLogEnabled = false;
                    this.emitState('warning', {
                        message: error?.message || 'Update write failed, fallback to checkpoint mode'
                    });
                    await this.saveSnapshot('updates_fallback');
                    return;
                }

                try {
                    const liveSnapshot = readBoardSnapshotFromDoc(this.doc);
                    await setDoc(createBoardRootRef(this.userId, this.boardId), {
                        ...buildAuthoritativeRootPayload({
                            id: this.boardId,
                            ...pickBoardSyncMetadata(liveSnapshot),
                            syncTouchedAtMs: Date.now(),
                            serverUpdatedAt: serverTimestamp(),
                            lastDeviceId: this.deviceId
                        })
                    }, { merge: true });
                } catch (error) {
                    this.emitState('warning', {
                        message: error?.message || 'Root sync touch write failed'
                    });
                }

                this.flushCount += 1;
                if (this.flushCount >= FIREBASE_SYNC_LIMITS.snapshotAfterFlushes) {
                    this.flushCount = 0;
                    await this.saveSnapshot('periodic_compaction');
                }
            } else {
                await this.saveSnapshot('checkpoint_only_flush');
            }
        };

        this.flushPromise = runFlushStep().finally(() => {
            this.lastFlushCompletedAt = Date.now();
            this.flushPromise = null;
            // If there are still pending updates (accumulated while we were flushing)
            // or if a flush was actively queued, schedule the next flush via debounce 
            // to respect Firestore rate limits.
            if (this.pendingUpdates.length > 0 || this.flushQueuedReason) {
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
                    const shouldCleanupStaleCheckpoints = (
                        currentReason === 'controller_stop'
                        || currentReason === 'periodic_compaction'
                        || (this.snapshotSaveCount % SNAPSHOT_CLEANUP_SAVE_INTERVAL) === 0
                    );

                    const liveSnapshot = readBoardSnapshotFromDoc(this.doc);
                    const update = encodeCompactBoardSnapshotUpdate(liveSnapshot);
                    const checkpoint = await saveBoardCheckpoint({
                        userId: this.userId,
                        boardId: this.boardId,
                        deviceId: this.deviceId,
                        updateBase64: bytesToBase64(update),
                        reason: currentReason,
                        cleanupStale: shouldCleanupStaleCheckpoints,
                        snapshotMetadata: pickBoardSyncMetadata(liveSnapshot)
                    });

                    if (checkpoint) {
                        this.latestCheckpointSavedAtMs = checkpoint.savedAtMs || this.latestCheckpointSavedAtMs;
                        this.latestCheckpointSignature = checkpoint.signature || this.latestCheckpointSignature;
                        this.remoteIsEmpty = false;
                        this.hasUnsnapshottedChanges = false;
                        this.deferredCheckpointRepairReason = '';
                        this.remoteCheckpointRecoveredFromCompatibility = false;
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

        if (this.pendingUpdates.length) {
            try {
                await this.flushPendingUpdates('controller_stop');
            } catch (error) {
                console.error(`[FirebaseSync] Failed to flush pending updates during stop for board ${this.boardId}:`, error);
                this.emitState('warning', {
                    message: error?.message || 'Final update flush failed'
                });
            }
        }

        if (this.connected && (this.hasUnsnapshottedChanges || this.deferredCheckpointRepairReason)) {
            await this.saveSnapshot(this.deferredCheckpointRepairReason || 'controller_stop');
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
