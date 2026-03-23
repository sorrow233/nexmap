import { IndexeddbPersistence } from 'y-indexeddb';
import {
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from './boardSnapshot';
import {
    createBoardDoc,
    isBoardDocEmpty,
    readBoardFieldFromDoc,
    readBoardSnapshotFromDoc,
    syncBoardRuntimePatchToDoc,
    syncBoardSnapshotToDoc
} from './boardYDoc';
import { FirestoreBoardSync } from './firestoreBoardSync';
import {
    FIREBASE_SYNC_ENABLED,
    FIREBASE_SYNC_ORIGINS,
    isSampleBoardId
} from './config';
import { getSyncDeviceId } from './deviceId';

const isSnapshotUpdatedAtNewer = (nextSnapshot = {}, prevSnapshot = {}) => (
    (Number(nextSnapshot?.updatedAt) || 0) > (Number(prevSnapshot?.updatedAt) || 0)
);

export class BoardSyncController {
    constructor({ boardId, user, onSyncStateChange }) {
        this.boardId = boardId;
        this.user = user;
        this.onSyncStateChange = onSyncStateChange;
        this.doc = createBoardDoc();
        this.persistence = null;
        this.fireSync = null;
        this.started = false;
    }

    emitState(status, extra = {}) {
        this.onSyncStateChange?.({
            status,
            boardId: this.boardId,
            ...extra
        });
    }

    async start(initialLocalSnapshot = {}) {
        if (!FIREBASE_SYNC_ENABLED || !this.user?.uid || !this.boardId || isSampleBoardId(this.boardId)) {
            this.emitState('disabled');
            return;
        }

        this.emitState('booting');

        this.persistence = new IndexeddbPersistence(`mixboard-sync:${this.boardId}`, this.doc);
        await this.persistence.whenSynced;

        const normalizedLocal = normalizeBoardSnapshot(initialLocalSnapshot);
        const persistedDocSnapshot = readBoardSnapshotFromDoc(this.doc);
        const shouldApplyLocalSnapshot = (
            !isMeaningfullyEmptyBoardSnapshot(normalizedLocal) &&
            (
                isBoardDocEmpty(this.doc) ||
                isSnapshotUpdatedAtNewer(normalizedLocal, persistedDocSnapshot)
            )
        );

        if (shouldApplyLocalSnapshot) {
            syncBoardSnapshotToDoc(this.doc, normalizedLocal);
        }

        this.fireSync = new FirestoreBoardSync({
            boardId: this.boardId,
            userId: this.user.uid,
            deviceId: getSyncDeviceId(),
            doc: this.doc,
            onSyncStateChange: this.onSyncStateChange
        });

        const {
            remoteIsEmpty
        } = await this.fireSync.connect();
        if (remoteIsEmpty && !isMeaningfullyEmptyBoardSnapshot(normalizedLocal)) {
            await this.fireSync.saveSnapshot('initial_local_seed');
        }

        this.started = true;
        this.emitState('ready');
    }

    readCurrentSnapshot() {
        return readBoardSnapshotFromDoc(this.doc);
    }

    setFirestoreUploadPaused(paused, reason = '') {
        this.fireSync?.setUploadPaused?.(paused, reason);
    }

    commitAuthoritativeLocalPatch(partial = {}) {
        if (!this.started) {
            return normalizeBoardSnapshot(partial);
        }

        const nextUpdatedAt = Math.max(
            Date.now(),
            Number(readBoardFieldFromDoc(this.doc, 'updatedAt')) || 0
        );
        const nextClientRevision = (Number(readBoardFieldFromDoc(this.doc, 'clientRevision')) || 0) + 1;

        this.doc.transact(() => {
            syncBoardRuntimePatchToDoc(this.doc, partial, {
                updatedAt: nextUpdatedAt,
                clientRevision: nextClientRevision
            });
        }, FIREBASE_SYNC_ORIGINS.runtime);

        return readBoardSnapshotFromDoc(this.doc);
    }

    commitAuthoritativeLocalSnapshot(nextSnapshot = {}) {
        if (!this.started) {
            return normalizeBoardSnapshot(nextSnapshot);
        }

        const currentSnapshot = readBoardSnapshotFromDoc(this.doc);
        const normalizedIncoming = normalizeBoardSnapshot(nextSnapshot);
        const committedSnapshot = normalizeBoardSnapshot({
            ...currentSnapshot,
            ...normalizedIncoming,
            clientRevision: Math.max(
                Number(currentSnapshot.clientRevision) || 0,
                Number(normalizedIncoming.clientRevision) || 0
            ) + 1,
            updatedAt: Math.max(
                Date.now(),
                Number(currentSnapshot.updatedAt) || 0
            )
        });

        this.doc.transact(() => {
            syncBoardSnapshotToDoc(this.doc, committedSnapshot);
        }, FIREBASE_SYNC_ORIGINS.runtime);

        return readBoardSnapshotFromDoc(this.doc);
    }

    async forceOverwriteFromSnapshot(nextSnapshot = {}) {
        if (!this.started || !this.fireSync) return false;

        const normalized = normalizeBoardSnapshot(nextSnapshot);
        if (isMeaningfullyEmptyBoardSnapshot(normalized)) {
            return false;
        }

        await this.fireSync.waitForPendingWrites();
        this.fireSync.clearPendingLocalQueue();

        this.doc.transact(() => {
            syncBoardSnapshotToDoc(this.doc, normalized);
        }, FIREBASE_SYNC_ORIGINS.forceOverride);

        const checkpoint = await this.fireSync.saveSnapshot('manual_force_override');
        return Boolean(checkpoint);
    }

    async stop() {
        if (this.fireSync) {
            try {
                await this.fireSync.stop();
            } catch (error) {
                console.error(`[BoardSyncController] Failed to stop Firestore sync for board ${this.boardId}:`, error);
            }
            this.fireSync = null;
        }

        if (this.persistence) {
            this.persistence.destroy();
            this.persistence = null;
        }

        this.doc.destroy();
        this.started = false;
    }
}
