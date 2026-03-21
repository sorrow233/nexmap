import { IndexeddbPersistence } from 'y-indexeddb';
import {
    createBoardSnapshotFingerprint,
    isMeaningfullyEmptyBoardSnapshot,
    normalizeBoardSnapshot
} from './boardSnapshot';
import {
    createBoardDoc,
    isBoardDocEmpty,
    readBoardSnapshotFromDoc,
    syncBoardSnapshotToDoc
} from './boardYDoc';
import { FirestoreBoardSync } from './firestoreBoardSync';
import {
    FIREBASE_SYNC_ENABLED,
    FIREBASE_SYNC_ORIGINS,
    isSampleBoardId
} from './config';
import { uuid } from '../../utils/uuid';
import { isPersistenceSnapshotNewer } from '../boardPersistence/persistenceCursor';

const DEVICE_ID_KEY = 'mixboard_sync_device_id';

const getDeviceId = () => {
    try {
        const existing = localStorage.getItem(DEVICE_ID_KEY);
        if (existing) return existing;
        const next = uuid();
        localStorage.setItem(DEVICE_ID_KEY, next);
        return next;
    } catch {
        return uuid();
    }
};

export class BoardSyncController {
    constructor({ boardId, user, onSnapshot, onSyncStateChange }) {
        this.boardId = boardId;
        this.user = user;
        this.onSnapshot = onSnapshot;
        this.onSyncStateChange = onSyncStateChange;
        this.doc = createBoardDoc();
        this.persistence = null;
        this.fireSync = null;
        this.lastFingerprint = '';
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
                isPersistenceSnapshotNewer(normalizedLocal, persistedDocSnapshot)
            )
        );

        if (shouldApplyLocalSnapshot) {
            syncBoardSnapshotToDoc(this.doc, normalizedLocal);
        }

        this.lastFingerprint = createBoardSnapshotFingerprint(readBoardSnapshotFromDoc(this.doc));

        this.doc.on('update', (_update, origin) => {
            if (origin === FIREBASE_SYNC_ORIGINS.store) {
                return;
            }
            this.emitCurrentSnapshot();
        });

        this.fireSync = new FirestoreBoardSync({
            boardId: this.boardId,
            userId: this.user.uid,
            deviceId: getDeviceId(),
            doc: this.doc,
            onRemoteApplied: () => {
                this.emitCurrentSnapshot();
            },
            onSyncStateChange: this.onSyncStateChange
        });

        const { remoteIsEmpty } = await this.fireSync.connect();
        if (remoteIsEmpty && !isMeaningfullyEmptyBoardSnapshot(normalizedLocal)) {
            await this.fireSync.saveSnapshot('initial_local_seed');
        }

        this.started = true;
        this.emitCurrentSnapshot();
        this.emitState('ready');
    }

    emitCurrentSnapshot() {
        const snapshot = readBoardSnapshotFromDoc(this.doc);
        const fingerprint = createBoardSnapshotFingerprint(snapshot);
        if (fingerprint === this.lastFingerprint) return;
        this.lastFingerprint = fingerprint;
        this.onSnapshot?.(snapshot);
    }

    applyLocalSnapshot(nextSnapshot = {}) {
        if (!this.started) return;
        const normalized = normalizeBoardSnapshot(nextSnapshot);
        const nextFingerprint = createBoardSnapshotFingerprint(normalized);
        if (nextFingerprint === this.lastFingerprint) return;

        this.doc.transact(() => {
            syncBoardSnapshotToDoc(this.doc, normalized);
        }, FIREBASE_SYNC_ORIGINS.store);

        this.lastFingerprint = createBoardSnapshotFingerprint(readBoardSnapshotFromDoc(this.doc));
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
