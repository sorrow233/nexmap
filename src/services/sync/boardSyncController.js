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
import {
    normalizeSyncLane,
    SYNC_LANES
} from './protocol/syncLane';
import { mergeSkeletonSnapshot } from './skeleton/skeletonSync';
import { mergeBodySnapshot } from './body/bodySync';

const buildStoreOriginForLane = (lane) => {
    switch (normalizeSyncLane(lane)) {
    case SYNC_LANES.SKELETON:
        return FIREBASE_SYNC_ORIGINS.storeSkeleton;
    case SYNC_LANES.BODY:
        return FIREBASE_SYNC_ORIGINS.storeBody;
    case SYNC_LANES.FULL:
    default:
        return FIREBASE_SYNC_ORIGINS.storeFull;
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
        this.lastVersionKey = '';
        this.started = false;
        this.lastAppliedLocalLaneRevisions = {
            [SYNC_LANES.SKELETON]: 0,
            [SYNC_LANES.BODY]: 0,
            [SYNC_LANES.FULL]: 0
        };
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
            if (
                origin === FIREBASE_SYNC_ORIGINS.storeFull
                || origin === FIREBASE_SYNC_ORIGINS.storeSkeleton
                || origin === FIREBASE_SYNC_ORIGINS.storeBody
                || origin === FIREBASE_SYNC_ORIGINS.firestore
                || origin === FIREBASE_SYNC_ORIGINS.indexeddb
                || origin === FIREBASE_SYNC_ORIGINS.forceOverride
            ) {
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
            onRemoteApplied: (payload = {}) => {
                logPersistenceTrace('sync:controller-remote-applied', {
                    boardId: this.boardId,
                    safeMode: FIREBASE_SYNC_SAFE_MODE,
                    lane: payload.lane || SYNC_LANES.FULL,
                    reason: payload.reason || '',
                    cursor: buildBoardCursorTrace(readBoardSnapshotFromDoc(this.doc))
                });
                this.emitCurrentSnapshot(payload);
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
            await this.fireSync.syncSnapshotToRemote(normalizedLocal, {
                reason: 'initial_local_seed',
                includeCheckpoint: true
            });
        } else if (skippedRemoteApplyReason) {
            await this.fireSync.syncSnapshotToRemote(repairCandidateSnapshot, {
                reason: skippedRemoteApplyReason,
                includeCheckpoint: true
            });
        }

        this.started = true;
        this.emitCurrentSnapshot();
        this.emitState('ready');
    }

    emitCurrentSnapshot(meta = {}) {
        const snapshot = meta?.mergedSnapshot
            ? normalizeBoardSnapshot(meta.mergedSnapshot)
            : readBoardSnapshotFromDoc(this.doc);
        const versionKey = buildPersistenceVersionKey(snapshot);
        const bypassVersionDedup = Boolean(meta && (meta.partialSnapshot || meta.reason || meta.lane));
        if (!bypassVersionDedup && versionKey === this.lastVersionKey) return;
        this.lastVersionKey = versionKey;
        this.onSnapshot?.(snapshot, meta);
    }

    readCurrentSnapshot() {
        return readBoardSnapshotFromDoc(this.doc);
    }

    rememberAppliedLocalLaneRevision(lane, revision) {
        const normalizedLane = normalizeSyncLane(lane);
        const safeRevision = Number(revision) || 0;
        if (safeRevision <= 0) return;

        if (normalizedLane === SYNC_LANES.FULL) {
            this.lastAppliedLocalLaneRevisions[SYNC_LANES.FULL] = Math.max(
                this.lastAppliedLocalLaneRevisions[SYNC_LANES.FULL],
                safeRevision
            );
            this.lastAppliedLocalLaneRevisions[SYNC_LANES.SKELETON] = Math.max(
                this.lastAppliedLocalLaneRevisions[SYNC_LANES.SKELETON],
                safeRevision
            );
            this.lastAppliedLocalLaneRevisions[SYNC_LANES.BODY] = Math.max(
                this.lastAppliedLocalLaneRevisions[SYNC_LANES.BODY],
                safeRevision
            );
            return;
        }

        this.lastAppliedLocalLaneRevisions[normalizedLane] = Math.max(
            this.lastAppliedLocalLaneRevisions[normalizedLane],
            safeRevision
        );
    }

    applyLocalSkeletonSnapshot(nextSnapshot = {}) {
        this.applyLocalSnapshot(nextSnapshot, { lane: SYNC_LANES.SKELETON });
    }

    applyLocalBodySnapshot(nextSnapshot = {}, options = {}) {
        this.applyLocalSnapshot(nextSnapshot, {
            lane: SYNC_LANES.BODY,
            ...options
        });
    }

    applyLocalSnapshot(nextSnapshot = {}, options = {}) {
        if (!this.started) return;
        const lane = normalizeSyncLane(options.lane || SYNC_LANES.FULL);
        const currentDocSnapshot = readBoardSnapshotFromDoc(this.doc);
        const incomingSnapshot = normalizeBoardSnapshot(nextSnapshot);
        const incomingRevision = Number(incomingSnapshot.clientRevision) || 0;

        if (
            lane !== SYNC_LANES.FULL
            && incomingRevision > 0
            && incomingRevision <= (this.lastAppliedLocalLaneRevisions[lane] || 0)
        ) {
            return;
        }

        const mergedSnapshot = lane === SYNC_LANES.SKELETON
            ? mergeSkeletonSnapshot(currentDocSnapshot, incomingSnapshot)
            : (lane === SYNC_LANES.BODY
                ? mergeBodySnapshot(currentDocSnapshot, incomingSnapshot)
                : incomingSnapshot);
        const resolution = resolveLocalSnapshotForDoc({
            currentSnapshot: currentDocSnapshot,
            incomingSnapshot: mergedSnapshot
        });
        const normalized = normalizeBoardSnapshot(resolution.snapshot);
        const nextVersionKey = buildPersistenceVersionKey(normalized);
        if (nextVersionKey === this.lastVersionKey || resolution.action !== 'apply') return;

        logPersistenceTrace('sync:controller-apply-local', {
            boardId: this.boardId,
            safeMode: FIREBASE_SYNC_SAFE_MODE,
            lane,
            reason: resolution.reason,
            cursor: buildBoardCursorTrace(normalized)
        });

        if (lane === SYNC_LANES.BODY && Array.isArray(options.bodyJobs) && options.bodyJobs.length > 0) {
            this.fireSync?.queueCardBodyJobs?.(options.bodyJobs);
        }

        this.doc.transact(() => {
            syncBoardSnapshotToDoc(this.doc, normalized);
        }, buildStoreOriginForLane(lane));

        this.lastVersionKey = buildPersistenceVersionKey(readBoardSnapshotFromDoc(this.doc));
        this.rememberAppliedLocalLaneRevision(lane, incomingRevision || normalized.clientRevision);
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
        const synced = await this.fireSync.syncSnapshotToRemote(normalized, {
            reason: 'manual_force_override',
            includeCheckpoint: true
        });
        this.emitCurrentSnapshot();
        return Boolean(synced);
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
