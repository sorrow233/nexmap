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
import { createBoardDoc, syncBoardSnapshotToDoc } from './boardYDoc';
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
        this.connected = false;
        this.rootUnsubscribe = null;
        this.updateLogEnabled = true;

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

        try {
            await this.loadTailUpdates();
            this.subscribeToTailUpdates();
        } catch (error) {
            this.updateLogEnabled = false;
            this.emitState('warning', {
                message: error?.message || 'Firestore updates unavailable, fallback to checkpoint mode'
            });
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
        this.scheduleFlush();
    }

    scheduleFlush() {
        if (this.pendingBytes >= FIREBASE_SYNC_LIMITS.maxPendingUpdateBytes) {
            void this.flushPendingUpdates('size_limit');
            return;
        }

        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }

        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flushPendingUpdates('debounced');
        }, FIREBASE_SYNC_LIMITS.uploadDebounceMs);
    }

    async flushPendingUpdates(reason = 'manual') {
        if (!this.pendingUpdates.length || !db) return;
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
                    reason,
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
        } else {
            await this.saveSnapshot('checkpoint_only_flush');
            return;
        }

        await setDoc(createBoardRootRef(this.userId, this.boardId), {
            ...buildAuthoritativeRootPayload({
            id: this.boardId,
            syncTouchedAtMs: Date.now(),
            serverUpdatedAt: serverTimestamp(),
            lastDeviceId: this.deviceId
            })
        }, { merge: true });

        this.flushCount += 1;
        if (this.flushCount >= FIREBASE_SYNC_LIMITS.snapshotAfterFlushes) {
            this.flushCount = 0;
            await this.saveSnapshot('periodic_compaction');
        }
    }

    async saveSnapshot(reason = 'manual_snapshot') {
        if (!db) return;
        const update = Y.encodeStateAsUpdate(this.doc);
        const checkpoint = await saveBoardCheckpoint({
            userId: this.userId,
            boardId: this.boardId,
            deviceId: this.deviceId,
            updateBase64: bytesToBase64(update),
            reason
        });

        if (checkpoint) {
            this.latestCheckpointSavedAtMs = checkpoint.savedAtMs || this.latestCheckpointSavedAtMs;
            this.latestCheckpointSignature = checkpoint.signature || this.latestCheckpointSignature;
            this.remoteIsEmpty = false;
        }
    }

    async stop() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        if (this.pendingUpdates.length) {
            await this.flushPendingUpdates('controller_stop');
        }

        if (this.connected) {
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

    const tempDoc = createBoardDoc();
    syncBoardSnapshotToDoc(tempDoc, normalizedSnapshot);
    const checkpoint = await saveBoardCheckpoint({
        userId,
        boardId,
        deviceId,
        updateBase64: bytesToBase64(Y.encodeStateAsUpdate(tempDoc)),
        reason: 'local_seed'
    });

    tempDoc.destroy();
    return Boolean(checkpoint);
};
