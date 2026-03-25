import { IndexeddbPersistence } from 'y-indexeddb';
import {
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
    FIREBASE_SYNC_SAFE_MODE,
    FIREBASE_SYNC_ORIGINS,
    isSampleBoardId
} from './config';
import { getSyncDeviceId } from './deviceId';
import {
    buildPersistenceVersionKey,
    isPersistenceSnapshotNewer
} from '../boardPersistence/persistenceCursor';
import { buildBoardCursorTrace, logPersistenceTrace } from '../../utils/persistenceTrace';
import { resolveLocalSnapshotForDoc } from './protocol/syncResolver';

export class BoardSyncController {
    constructor({ boardId, user, onSnapshot, onSyncStateChange }) {
        this.boardId = boardId;
        this.user = user;
        this.onSnapshot = onSnapshot;
        this.onSyncStateChange = onSyncStateChange;
        this.doc = createBoardDoc();
        this.persistence = null;
        this.fireSync = null;
        this.lastVersionKey = '';
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

        this.lastVersionKey = buildPersistenceVersionKey(readBoardSnapshotFromDoc(this.doc));

        this.doc.on('update', (_update, origin) => {
            if (origin === FIREBASE_SYNC_ORIGINS.store || origin === FIREBASE_SYNC_ORIGINS.runtime) {
                return;
            }
            logPersistenceTrace('sync:controller-doc-update', {
                boardId: this.boardId,
                origin,
                safeMode: FIREBASE_SYNC_SAFE_MODE
            });
            this.emitCurrentSnapshot();
        });

        this.fireSync = new FirestoreBoardSync({
            boardId: this.boardId,
            userId: this.user.uid,
            deviceId: getSyncDeviceId(),
            doc: this.doc,
            onRemoteApplied: () => {
                logPersistenceTrace('sync:controller-remote-applied', {
                    boardId: this.boardId,
                    safeMode: FIREBASE_SYNC_SAFE_MODE,
                    cursor: buildBoardCursorTrace(readBoardSnapshotFromDoc(this.doc))
                });
                this.emitCurrentSnapshot();
            },
            onSyncStateChange: this.onSyncStateChange
        });

        const {
            remoteIsEmpty,
            skippedRemoteApplyReason
        } = await this.fireSync.connect({
            localSnapshot: repairCandidateSnapshot,
            expectedCardCount
        });
        if (remoteIsEmpty && !isMeaningfullyEmptyBoardSnapshot(normalizedLocal)) {
            await this.fireSync.saveSnapshot('initial_local_seed');
        } else if (skippedRemoteApplyReason) {
            await this.fireSync.saveSnapshot(skippedRemoteApplyReason);
        } else if (!FIREBASE_SYNC_SAFE_MODE) {
            this.fireSync.planDeferredRepair(repairCandidateSnapshot, { expectedCardCount });
        }

        this.started = true;
        this.emitCurrentSnapshot();
        this.emitState('ready');
    }

    emitCurrentSnapshot() {
        const snapshot = readBoardSnapshotFromDoc(this.doc);
        const versionKey = buildPersistenceVersionKey(snapshot);
        if (versionKey === this.lastVersionKey) return;
        this.lastVersionKey = versionKey;
        this.onSnapshot?.(snapshot);
    }

    readCurrentSnapshot() {
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

        const nextCommittedSnapshot = readBoardSnapshotFromDoc(this.doc);
        this.lastVersionKey = buildPersistenceVersionKey(nextCommittedSnapshot);
        return nextCommittedSnapshot;
    }

    applyLocalSnapshot(nextSnapshot = {}) {
        if (!this.started) return;
        const currentDocSnapshot = readBoardSnapshotFromDoc(this.doc);
        const resolution = resolveLocalSnapshotForDoc({
            currentSnapshot: currentDocSnapshot,
            incomingSnapshot: nextSnapshot
        });
        const normalized = normalizeBoardSnapshot(resolution.snapshot);
        const nextVersionKey = buildPersistenceVersionKey(normalized);
        if (nextVersionKey === this.lastVersionKey || resolution.action !== 'apply') return;

        logPersistenceTrace('sync:controller-apply-local', {
            boardId: this.boardId,
            safeMode: FIREBASE_SYNC_SAFE_MODE,
            reason: resolution.reason,
            cursor: buildBoardCursorTrace(normalized)
        });

        this.doc.transact(() => {
            syncBoardSnapshotToDoc(this.doc, normalized);
        }, FIREBASE_SYNC_ORIGINS.store);

        this.lastVersionKey = buildPersistenceVersionKey(readBoardSnapshotFromDoc(this.doc));
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

        this.lastVersionKey = buildPersistenceVersionKey(readBoardSnapshotFromDoc(this.doc));
        const checkpoint = await this.fireSync.saveSnapshot('manual_force_override');
        this.emitCurrentSnapshot();
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
