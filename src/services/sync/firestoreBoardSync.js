import * as Y from 'yjs';
import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    FIREBASE_SYNC_COLLECTIONS,
    FIREBASE_SYNC_LIMITS,
    FIREBASE_SYNC_ORIGINS
} from './config';
import { uuid } from '../../utils/uuid';
import { createBoardDoc, syncBoardSnapshotToDoc } from './boardYDoc';
import { isMeaningfullyEmptyBoardSnapshot, normalizeBoardSnapshot } from './boardSnapshot';

const bytesToBase64 = (bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToBytes = (encoded = '') => {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const createBoardRootRef = (userId, boardId) => doc(
    db,
    FIREBASE_SYNC_COLLECTIONS.users,
    userId,
    FIREBASE_SYNC_COLLECTIONS.boards,
    boardId
);

const createUpdatesCollectionRef = (userId, boardId) => collection(
    createBoardRootRef(userId, boardId),
    FIREBASE_SYNC_COLLECTIONS.updates
);

const createSnapshotsCollectionRef = (userId, boardId) => collection(
    createBoardRootRef(userId, boardId),
    FIREBASE_SYNC_COLLECTIONS.snapshots
);

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
        this.latestSnapshotCreatedAt = null;
        this.connected = false;

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

    async connect() {
        if (!db) {
            this.emitState('disabled');
            return { remoteIsEmpty: true };
        }

        this.emitState('connecting');
        await this.ensureBoardRoot();
        await this.loadLatestSnapshot();
        await this.loadTailUpdates();
        this.subscribeToTailUpdates();
        this.connected = true;
        this.emitState('connected', {
            remoteIsEmpty: this.remoteIsEmpty
        });
        return { remoteIsEmpty: this.remoteIsEmpty };
    }

    async ensureBoardRoot() {
        const rootRef = createBoardRootRef(this.userId, this.boardId);
        await setDoc(rootRef, {
            id: this.boardId,
            updatedAt: serverTimestamp(),
            syncVersion: 1
        }, { merge: true });
    }

    async loadLatestSnapshot() {
        const snapshotsRef = createSnapshotsCollectionRef(this.userId, this.boardId);
        const snapshotQuery = query(snapshotsRef, orderBy('createdAt', 'desc'), limit(1));
        const snapshotDocs = await getDocs(snapshotQuery);
        if (snapshotDocs.empty) {
            this.remoteIsEmpty = true;
            return;
        }

        const latestSnapshot = snapshotDocs.docs[0];
        const data = latestSnapshot.data();
        if (!data?.updateBase64) {
            this.remoteIsEmpty = true;
            return;
        }

        this.remoteIsEmpty = false;
        this.latestSnapshotCreatedAt = data.createdAt || null;
        const update = base64ToBytes(data.updateBase64);
        Y.applyUpdate(this.doc, update, FIREBASE_SYNC_ORIGINS.firestore);
    }

    async loadTailUpdates() {
        const updatesRef = createUpdatesCollectionRef(this.userId, this.boardId);
        const tailQuery = this.latestSnapshotCreatedAt
            ? query(
                updatesRef,
                where('createdAt', '>', this.latestSnapshotCreatedAt),
                orderBy('createdAt', 'asc')
            )
            : query(updatesRef, orderBy('createdAt', 'asc'));

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
        const liveQuery = this.latestSnapshotCreatedAt
            ? query(
                updatesRef,
                where('createdAt', '>', this.latestSnapshotCreatedAt),
                orderBy('createdAt', 'asc')
            )
            : query(updatesRef, orderBy('createdAt', 'asc'));

        this.unsubscribe = onSnapshot(liveQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type !== 'added') return;
                this.applyRemoteUpdateDoc(change.doc.id, change.doc.data());
            });
        }, (error) => {
            this.emitState('error', {
                message: error?.message || 'Firestore listener failed'
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

        const updatesRef = createUpdatesCollectionRef(this.userId, this.boardId);
        const updateId = `${this.deviceId}_${Date.now()}_${uuid()}`;
        this.ignoredEchoIds.add(updateId);

        await setDoc(doc(updatesRef, updateId), {
            updateBase64: bytesToBase64(merged),
            byteLength: merged.byteLength || merged.length || 0,
            deviceId: this.deviceId,
            reason,
            createdAt: serverTimestamp()
        });

        await setDoc(createBoardRootRef(this.userId, this.boardId), {
            updatedAt: serverTimestamp(),
            lastDeviceId: this.deviceId
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
        const snapshotsRef = createSnapshotsCollectionRef(this.userId, this.boardId);
        const snapshotId = `${this.deviceId}_${Date.now()}`;

        await setDoc(doc(snapshotsRef, snapshotId), {
            updateBase64: bytesToBase64(update),
            byteLength: update.byteLength || update.length || 0,
            reason,
            deviceId: this.deviceId,
            createdAt: serverTimestamp()
        });

        await setDoc(createBoardRootRef(this.userId, this.boardId), {
            latestSnapshotId: snapshotId,
            updatedAt: serverTimestamp()
        }, { merge: true });
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

    const snapshotsRef = createSnapshotsCollectionRef(userId, boardId);
    const existingSnapshot = await getDocs(query(snapshotsRef, orderBy('createdAt', 'desc'), limit(1)));
    if (!existingSnapshot.empty) {
        return false;
    }

    const tempDoc = createBoardDoc();
    syncBoardSnapshotToDoc(tempDoc, normalizedSnapshot);
    const update = Y.encodeStateAsUpdate(tempDoc);
    const snapshotId = `${deviceId}_${Date.now()}_seed`;

    await setDoc(createBoardRootRef(userId, boardId), {
        id: boardId,
        updatedAt: serverTimestamp(),
        latestSnapshotId: snapshotId,
        syncVersion: 1
    }, { merge: true });

    await setDoc(doc(snapshotsRef, snapshotId), {
        updateBase64: bytesToBase64(update),
        byteLength: update.byteLength || update.length || 0,
        deviceId,
        reason: 'local_seed',
        createdAt: serverTimestamp()
    });

    tempDoc.destroy();
    return true;
};
