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
    encodeCompactBoardSnapshotUpdate
} from './boardYDoc';
import { isMeaningfullyEmptyBoardSnapshot, normalizeBoardSnapshot } from './boardSnapshot';
import { base64ToBytes, bytesToBase64 } from './base64';
import {
    hasRemoteCheckpoint,
    loadBoardCheckpoint,
    saveBoardCheckpoint,
    toFirestoreMillis
} from './firestoreCheckpointStore';
import { createBoardRootRef, createUpdatesCollectionRef } from './firestoreSyncPaths';
import { buildAuthoritativeRootPayload } from './firestoreRootDocument';
import { migrateLegacyRootSnapshotToCheckpoint } from './legacyCloudBoardMigration';

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
        this.connected = false;
        this.rootUnsubscribe = null;
        this.updateLogEnabled = false;
        this.hasUnsnapshottedChanges = false;
        this.flushPromise = null;
        this.flushQueuedReason = '';
        this.snapshotSavePromise = null;
        this.snapshotSaveQueuedReason = '';
        this.snapshotSaveCount = 0;

        this.handleDocUpdate = this.handleDocUpdate.bind(this);
        this.doc.on('update', this.handleDocUpdate);
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

    async connect() {
        if (!db) {
            this.emitState('disabled');
            return { remoteIsEmpty: true };
        }

        this.emitState('connecting');
        await this.loadRemoteCheckpoint();

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
        return { remoteIsEmpty: this.remoteIsEmpty };
    }

    async loadRemoteCheckpoint(rootData = null) {
        const rootRef = createBoardRootRef(this.userId, this.boardId);
        let effectiveRootData = rootData || (await getDoc(rootRef)).data();

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
        this.latestCheckpointSavedAtMs = checkpoint.savedAtMs || 0;
        this.latestCheckpointServerSavedAt = effectiveRootData?.checkpointServerSavedAt || null;
        this.latestCheckpointSignature = checkpoint.signature || '';
        this.latestCheckpointRootKey = buildRootCheckpointKey(effectiveRootData);
        this.hasUnsnapshottedChanges = false;
        const update = base64ToBytes(checkpoint.updateBase64);
        Y.applyUpdate(this.doc, update, FIREBASE_SYNC_ORIGINS.firestore);
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

            const remoteSavedAtMs = toFirestoreMillis(data.checkpointSavedAtMs);
            const nextRootCheckpointKey = buildRootCheckpointKey(data);
            if (
                nextRootCheckpointKey &&
                nextRootCheckpointKey === this.latestCheckpointRootKey &&
                remoteSavedAtMs <= this.latestCheckpointSavedAtMs
            ) {
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
            this.hasUnsnapshottedChanges = false;
            Y.applyUpdate(this.doc, base64ToBytes(checkpoint.updateBase64), FIREBASE_SYNC_ORIGINS.firestore);
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
        if (origin === FIREBASE_SYNC_ORIGINS.firestore || origin === FIREBASE_SYNC_ORIGINS.indexeddb) {
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
            clearTimeout(this.flushTimer);
        }

        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flushPendingUpdates('debounced');
        }, debounceMs);
    }

    async flushPendingUpdates(reason = 'manual') {
        if (!db) return;
        if (this.flushPromise) {
            this.flushQueuedReason = reason;
            return this.flushPromise;
        }

        const runFlushLoop = async () => {
            let nextReason = reason;

            while (this.pendingUpdates.length > 0) {
                const currentReason = nextReason;
                nextReason = '';
                this.flushQueuedReason = '';

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
                        continue;
                    }

                    try {
                        await setDoc(createBoardRootRef(this.userId, this.boardId), {
                            ...buildAuthoritativeRootPayload({
                                id: this.boardId,
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

                if (this.pendingUpdates.length > 0) {
                    nextReason = this.flushQueuedReason || 'followup';
                }
            }
        };

        this.flushPromise = runFlushLoop().finally(() => {
            this.flushPromise = null;
            this.flushQueuedReason = '';
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

                    // Encode a fresh doc built from the visible snapshot so
                    // streaming edit history does not bloat remote checkpoints.
                    const update = encodeCompactBoardSnapshotUpdate(this.doc);
                    const checkpoint = await saveBoardCheckpoint({
                        userId: this.userId,
                        boardId: this.boardId,
                        deviceId: this.deviceId,
                        updateBase64: bytesToBase64(update),
                        reason: currentReason,
                        cleanupStale: shouldCleanupStaleCheckpoints
                    });

                    if (checkpoint) {
                        this.latestCheckpointSavedAtMs = checkpoint.savedAtMs || this.latestCheckpointSavedAtMs;
                        this.latestCheckpointSignature = checkpoint.signature || this.latestCheckpointSignature;
                        this.remoteIsEmpty = false;
                        this.hasUnsnapshottedChanges = false;
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
            reason: 'local_seed'
        });
    } catch (error) {
        console.error(`[FirebaseSync] Failed to seed local board ${boardId}:`, error);
    }
    return Boolean(checkpoint);
};
