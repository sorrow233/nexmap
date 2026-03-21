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
    syncBoardCardsToDoc,
    syncBoardSnapshotToDoc
} from './boardYDoc';
import { FirestoreBoardSync } from './firestoreBoardSync';
import {
    FIREBASE_SYNC_ENABLED,
    FIREBASE_SYNC_ORIGINS,
    isSampleBoardId
} from './config';
import { getSyncDeviceId } from './deviceId';
import { isPersistenceSnapshotNewer } from '../boardPersistence/persistenceCursor';

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

    async start(initialLocalSnapshot = {}, { expectedCardCount = 0 } = {}) {
        if (!FIREBASE_SYNC_ENABLED || !this.user?.uid || !this.boardId || isSampleBoardId(this.boardId)) {
            this.emitState('disabled');
            return;
        }

        this.emitState('booting');

        this.persistence = new IndexeddbPersistence(`mixboard-sync:${this.boardId}`, this.doc);
        await this.persistence.whenSynced;

        const normalizedLocal = normalizeBoardSnapshot(initialLocalSnapshot);
        const persistedDocSnapshot = readBoardSnapshotFromDoc(this.doc);
        const repairCandidateSnapshot = (
            isMeaningfullyEmptyBoardSnapshot(persistedDocSnapshot)
                ? normalizedLocal
                : (
                    isMeaningfullyEmptyBoardSnapshot(normalizedLocal)
                    || !isPersistenceSnapshotNewer(normalizedLocal, persistedDocSnapshot)
                )
                    ? persistedDocSnapshot
                    : normalizedLocal
        );
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
            deviceId: getSyncDeviceId(),
            doc: this.doc,
            onRemoteApplied: () => {
                this.emitCurrentSnapshot();
            },
            onSyncStateChange: this.onSyncStateChange
        });

        const { remoteIsEmpty } = await this.fireSync.connect();
        if (remoteIsEmpty && !isMeaningfullyEmptyBoardSnapshot(normalizedLocal)) {
            await this.fireSync.saveSnapshot('initial_local_seed');
        } else {
            this.fireSync.planDeferredRepair(repairCandidateSnapshot, { expectedCardCount });
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
        const currentDocSnapshot = readBoardSnapshotFromDoc(this.doc);
        const nextFingerprint = createBoardSnapshotFingerprint(normalized);
        if (nextFingerprint === this.lastFingerprint) return;

        const currentDocIsEmpty = isMeaningfullyEmptyBoardSnapshot(currentDocSnapshot);
        const nextSnapshotIsEmpty = isMeaningfullyEmptyBoardSnapshot(normalized);
        if (!currentDocIsEmpty && nextSnapshotIsEmpty) {
            return;
        }

        if (
            !currentDocIsEmpty &&
            !isPersistenceSnapshotNewer(normalized, currentDocSnapshot)
        ) {
            const nextHasCards = Array.isArray(normalized.cards) && normalized.cards.length > 0;
            if (!nextHasCards) {
                return;
            }

            this.doc.transact(() => {
                syncBoardCardsToDoc(this.doc, normalized.cards);
            }, FIREBASE_SYNC_ORIGINS.store);

            this.lastFingerprint = createBoardSnapshotFingerprint(readBoardSnapshotFromDoc(this.doc));
            return;
        }

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
