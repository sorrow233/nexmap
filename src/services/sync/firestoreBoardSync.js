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
    hasCardBodySyncJobs,
    normalizeCardBodySyncJobs,
    resolveSafeModeDebounceByLane,
    SYNC_LANES
} from './protocol/syncLane';
import {
    buildBodySyncSnapshotFromEntries,
    buildCardBodySyncEntries,
    buildCompleteCardBodySyncEntries,
    mergeCardBodyEntriesIntoSnapshot,
    normalizeCardBodySyncEntry
} from './body/cardBodySyncProtocol';
import {
    loadCardBodyEntries,
    saveCardBodyEntries,
    subscribeToCardBodyEntries
} from './body/firestoreCardBodyStore';
import { shouldPreferCheckpointBodyFallback } from './body/cardBodyCompression';
import {
    hasRemoteBoardSkeleton,
    loadBoardSkeletonFromRoot,
    saveBoardSkeleton
} from './skeleton/firestoreSkeletonStore';
import { buildPersistenceVersionKey } from '../boardPersistence/persistenceCursor';
import { buildSkeletonSyncSnapshot, mergeSkeletonSnapshot } from './skeleton/skeletonSync';

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

const buildSkeletonVersionKey = (snapshot = {}) => (
    buildPersistenceVersionKey(buildSkeletonSyncSnapshot(snapshot))
);

const buildMissingRemoteBodyEntries = (localSnapshot = {}, remoteEntries = []) => {
    const normalizedLocalSnapshot = normalizeBoardSnapshot(localSnapshot);
    const localEntries = buildCardBodySyncEntries(normalizedLocalSnapshot.cards, {
        clientRevision: normalizedLocalSnapshot.clientRevision,
        updatedAt: normalizedLocalSnapshot.updatedAt
    });

    if (localEntries.length === 0) {
        return [];
    }

    const remoteCardIds = new Set(
        (Array.isArray(remoteEntries) ? remoteEntries : [])
            .map((entry) => normalizeCardBodySyncEntry(entry)?.cardId)
            .filter(Boolean)
    );

    return localEntries.filter((entry) => !remoteCardIds.has(entry.cardId));
};

const partitionMissingRemoteBodyEntries = (entries = []) => {
    const inlineEntries = [];
    const checkpointFallbackEntries = [];

    normalizeCardBodySyncJobs(entries).forEach((entry) => {
        if (shouldPreferCheckpointBodyFallback(entry)) {
            checkpointFallbackEntries.push(entry);
            return;
        }

        inlineEntries.push(entry);
    });

    return {
        inlineEntries,
        checkpointFallbackEntries
    };
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
        this.lastProtectedRepairSourceKey = '';
        this.remoteMetadata = {
            hasCheckpoint: false,
            updatedAt: 0,
            clientRevision: 0,
            cardCount: 0
        };
        this.lastFlushCompletedAt = 0;
        this.pendingSyncLane = SYNC_LANES.NONE;
        this.pendingBodyJobs = new Map();
        this.bodyUnsubscribe = null;
        this.latestSkeletonVersionKey = '';
        this.latestBodyVersionKeys = new Map();
        this.pendingRemoteBodyEntries = new Map();
        this.checkpointRecoveryDirty = false;

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

    emitRemoteApplied(payload = {}) {
        if (typeof this.onRemoteApplied !== 'function') {
            return;
        }

        const mergedSnapshot = normalizeBoardSnapshot(
            payload.mergedSnapshot || readBoardSnapshotFromDoc(this.doc)
        );
        const partialSnapshot = normalizeBoardSnapshot(
            payload.partialSnapshot || mergedSnapshot
        );

        this.onRemoteApplied({
            lane: payload.lane || SYNC_LANES.FULL,
            source: payload.source || 'remote_sync',
            reason: payload.reason || '',
            partialSnapshot,
            mergedSnapshot
        });
    }

    async saveNonDestructiveRepair(reason = 'non_destructive_remote_repair', sourceKey = '') {
        const nextSourceKey = String(sourceKey || '');
        if (nextSourceKey && this.lastProtectedRepairSourceKey === nextSourceKey) {
            return null;
        }

        if (nextSourceKey) {
            this.lastProtectedRepairSourceKey = nextSourceKey;
        }

        this.emitState('warning', {
            message: `Detected conservative sync repair for ${this.boardId}, uploading protected layered snapshot`
        });

        try {
            return await this.syncSnapshotToRemote(readBoardSnapshotFromDoc(this.doc), {
                reason,
                includeCheckpoint: true
            });
        } catch (error) {
            if (nextSourceKey && this.lastProtectedRepairSourceKey === nextSourceKey) {
                this.lastProtectedRepairSourceKey = '';
            }
            throw error;
        }
    }

    queueCardBodyJobs(entries = []) {
        normalizeCardBodySyncJobs(entries).forEach((entry) => {
            const normalizedEntry = normalizeCardBodySyncEntry(entry);
            if (!normalizedEntry) return;
            this.pendingBodyJobs.set(normalizedEntry.cardId, normalizedEntry);
        });
    }

    applyRemoteSkeletonSnapshot(rootData = {}) {
        if (!hasRemoteBoardSkeleton(rootData)) {
            return null;
        }

        const skeletonSnapshot = loadBoardSkeletonFromRoot(rootData);
        const nextVersionKey = buildSkeletonVersionKey(skeletonSnapshot);
        if (!nextVersionKey || nextVersionKey === this.latestSkeletonVersionKey) {
            return null;
        }

        const currentSnapshot = readBoardSnapshotFromDoc(this.doc);
        const currentVersionKey = buildSkeletonVersionKey(currentSnapshot);
        if (
            currentVersionKey
            && (Number(skeletonSnapshot.clientRevision) || 0) < (Number(currentSnapshot.clientRevision) || 0)
        ) {
            return null;
        }

        const mergedSnapshot = mergeSkeletonSnapshot(currentSnapshot, skeletonSnapshot);
        this.doc.transact(() => {
            syncBoardSnapshotToDoc(this.doc, mergedSnapshot);
        }, FIREBASE_SYNC_ORIGINS.firestore);
        this.latestSkeletonVersionKey = nextVersionKey;

        const appliedPayload = {
            lane: SYNC_LANES.SKELETON,
            source: 'remote_skeleton',
            reason: 'remote_skeleton_applied',
            partialSnapshot: skeletonSnapshot,
            mergedSnapshot: readBoardSnapshotFromDoc(this.doc)
        };

        let flushedBodyPayload = null;
        if (this.pendingRemoteBodyEntries.size > 0) {
            flushedBodyPayload = this.applyRemoteCardBodyEntries(Array.from(this.pendingRemoteBodyEntries.values()));
        }

        return {
            ...appliedPayload,
            flushedBodyPayload
        };
    }

    applyRemoteCardBodyEntries(entries = []) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return null;
        }

        const currentSnapshot = readBoardSnapshotFromDoc(this.doc);
        const currentCardIds = new Set(
            currentSnapshot.cards.map((card) => card?.id).filter(Boolean)
        );

        const normalizedEntries = entries
            .map((entry) => normalizeCardBodySyncEntry(entry))
            .filter(Boolean)
            .filter((entry) => {
                const nextVersionKey = `${entry.bodyRevision}:${entry.bodyUpdatedAt}:${entry.bodyHash}`;
                if (this.latestBodyVersionKeys.get(entry.cardId) === nextVersionKey) {
                    return false;
                }
                return true;
            });

        if (normalizedEntries.length === 0) {
            return null;
        }

        const applicableEntries = [];
        normalizedEntries.forEach((entry) => {
            if (!currentCardIds.has(entry.cardId)) {
                this.pendingRemoteBodyEntries.set(entry.cardId, entry);
                return;
            }

            this.pendingRemoteBodyEntries.delete(entry.cardId);
            applicableEntries.push(entry);
        });

        if (applicableEntries.length === 0) {
            return null;
        }

        const mergedSnapshot = mergeCardBodyEntriesIntoSnapshot(currentSnapshot, applicableEntries);
        this.doc.transact(() => {
            syncBoardSnapshotToDoc(this.doc, mergedSnapshot);
        }, FIREBASE_SYNC_ORIGINS.firestore);

        applicableEntries.forEach((entry) => {
            this.latestBodyVersionKeys.set(
                entry.cardId,
                `${entry.bodyRevision}:${entry.bodyUpdatedAt}:${entry.bodyHash}`
            );
        });

        return {
            lane: SYNC_LANES.BODY,
            source: 'remote_body',
            reason: 'remote_body_applied',
            partialSnapshot: buildBodySyncSnapshotFromEntries(applicableEntries),
            mergedSnapshot: readBoardSnapshotFromDoc(this.doc)
        };
    }

    async saveSkeletonRootSnapshot(reason = 'skeleton_sync', sourceSnapshot = null) {
        const liveSnapshot = sourceSnapshot
            ? normalizeBoardSnapshot(sourceSnapshot)
            : readBoardSnapshotFromDoc(this.doc);
        const skeletonSnapshot = buildSkeletonSyncSnapshot(liveSnapshot);
        const result = await saveBoardSkeleton({
            userId: this.userId,
            boardId: this.boardId,
            deviceId: this.deviceId,
            snapshot: skeletonSnapshot,
            reason
        });

        if (result?.skeletonSnapshot) {
            this.latestSkeletonVersionKey = buildSkeletonVersionKey(result.skeletonSnapshot);
            logPersistenceTrace('sync:firestore-skeleton-saved', {
                boardId: this.boardId,
                reason,
                safeMode: FIREBASE_SYNC_SAFE_MODE,
                cursor: buildBoardCursorTrace(result.skeletonSnapshot)
            });
        }

        return result;
    }

    async saveQueuedCardBodyJobs(entries = [], reason = 'body_sync') {
        if (!hasCardBodySyncJobs(entries)) {
            return [];
        }

        const committedCardIds = await saveCardBodyEntries({
            userId: this.userId,
            boardId: this.boardId,
            deviceId: this.deviceId,
            entries
        });

        committedCardIds.forEach((cardId) => {
            const entry = entries.find((job) => job.cardId === cardId);
            if (!entry) return;
            this.latestBodyVersionKeys.set(
                cardId,
                `${entry.bodyRevision}:${entry.bodyUpdatedAt}:${entry.bodyHash}`
            );
        });

        logPersistenceTrace('sync:firestore-card-bodies-saved', {
            boardId: this.boardId,
            reason,
            cardCount: committedCardIds.length,
            safeMode: FIREBASE_SYNC_SAFE_MODE
        });

        return committedCardIds;
    }

    async saveQueuedCardBodyJobsBestEffort(entries = [], reason = 'body_sync') {
        if (!hasCardBodySyncJobs(entries)) {
            return {
                committedCardIds: [],
                failedCardIds: []
            };
        }

        const normalizedEntries = normalizeCardBodySyncJobs(entries);
        const committedCardIds = [];
        const failedCardIds = [];

        for (const entry of normalizedEntries) {
            try {
                const committed = await this.saveQueuedCardBodyJobs([entry], reason);
                committedCardIds.push(...committed);
            } catch (error) {
                const cardId = entry?.cardId || 'unknown';
                failedCardIds.push(cardId);
                console.warn(`[FirebaseSync] Skipped card body backfill for ${cardId} on board ${this.boardId}:`, error);
                this.emitState('warning', {
                    message: `Card body backfill skipped for ${cardId}: ${error?.message || 'unknown error'}`
                });
            }
        }

        return {
            committedCardIds,
            failedCardIds
        };
    }

    async applyCheckpointBodyFallback(rootData = {}, entries = []) {
        const targetCardIds = Array.from(new Set(
            normalizeCardBodySyncJobs(entries)
                .map((entry) => entry?.cardId)
                .filter(Boolean)
        ));

        if (targetCardIds.length === 0 || !hasRemoteCheckpoint(rootData)) {
            return {
                appliedCardIds: [],
                missingCardIds: targetCardIds
            };
        }

        const checkpoint = await loadBoardCheckpoint({
            userId: this.userId,
            boardId: this.boardId,
            rootData
        });

        if (!checkpoint?.updateBase64) {
            return {
                appliedCardIds: [],
                missingCardIds: targetCardIds
            };
        }

        const decodedCheckpoint = readCheckpointPayloadSnapshot({
            updateBase64: checkpoint.updateBase64,
            rootData
        });

        const fallbackEntries = buildCardBodySyncEntries(
            decodedCheckpoint.snapshot.cards.filter((card) => targetCardIds.includes(card?.id)),
            {
                clientRevision: decodedCheckpoint.snapshot.clientRevision,
                updatedAt: decodedCheckpoint.snapshot.updatedAt
            }
        );

        const applyResult = this.applyRemoteCardBodyEntries(fallbackEntries);
        if (applyResult) {
            this.emitRemoteApplied({
                ...applyResult,
                source: 'checkpoint_body_fallback',
                reason: 'checkpoint_body_fallback_applied'
            });
        }

        const appliedCardIds = fallbackEntries.map((entry) => entry.cardId);
        const missingCardIds = targetCardIds.filter((cardId) => !appliedCardIds.includes(cardId));

        if (appliedCardIds.length > 0) {
            console.warn(
                `[FirebaseSync] Applied checkpoint body fallback for ${appliedCardIds.length} oversized card bodies on board ${this.boardId}`
            );
        }

        return {
            appliedCardIds,
            missingCardIds
        };
    }

    async syncSnapshotToRemote(snapshot = {}, options = {}) {
        const normalizedSnapshot = normalizeBoardSnapshot(snapshot);
        await this.saveSkeletonRootSnapshot(options.reason || 'manual_sync', normalizedSnapshot);

        const bodyJobs = Array.isArray(options.bodyJobs) && options.bodyJobs.length > 0
            ? normalizeCardBodySyncJobs(options.bodyJobs)
            : buildCompleteCardBodySyncEntries(normalizedSnapshot.cards, {
                clientRevision: normalizedSnapshot.clientRevision,
                updatedAt: normalizedSnapshot.updatedAt
            });

        if (bodyJobs.length > 0) {
            await this.saveQueuedCardBodyJobs(
                bodyJobs,
                options.reason || 'manual_sync'
            );
        }

        if (options.includeCheckpoint === true) {
            await this.saveSnapshot(options.reason || 'manual_sync');
        }

        return true;
    }

    hasQueuedLocalWrites() {
        return Boolean(
            this.pendingBytes > 0
            || this.pendingBodyJobs.size > 0
            || this.pendingSyncLane !== SYNC_LANES.NONE
            || this.flushTimer
            || this.flushPromise
        );
    }

    async connect(options = {}) {
        if (!db) {
            this.emitState('disabled');
            return { remoteIsEmpty: true };
        }

        this.emitState('connecting');
        const rootRef = createBoardRootRef(this.userId, this.boardId);
        let rootData = (await getDoc(rootRef)).data() || {};
        this.latestRootSyncTouchedAtMs = toFirestoreMillis(rootData?.syncTouchedAtMs);
        this.updateRemoteMetadataFromRoot(rootData);

        const skeletonApplyResult = this.applyRemoteSkeletonSnapshot(rootData);
        if (skeletonApplyResult) {
            this.emitRemoteApplied(skeletonApplyResult);
            if (skeletonApplyResult.flushedBodyPayload) {
                this.emitRemoteApplied(skeletonApplyResult.flushedBodyPayload);
            }
        }
        const bodyEntries = await this.loadRemoteCardBodies();
        const shouldRecoverFromCheckpoint = bodyEntries.length === 0 && hasRemoteCheckpoint(rootData);
        const loadResult = shouldRecoverFromCheckpoint
            ? await this.loadRemoteCheckpoint(rootData, { recoveryOnly: true })
            : null;

        if (!shouldRecoverFromCheckpoint) {
            const missingRemoteBodyEntries = buildMissingRemoteBodyEntries(
                options.localSnapshot,
                bodyEntries
            );
            const {
                inlineEntries,
                checkpointFallbackEntries
            } = partitionMissingRemoteBodyEntries(missingRemoteBodyEntries);

            if (inlineEntries.length > 0) {
                await this.saveQueuedCardBodyJobsBestEffort(
                    inlineEntries,
                    'connect_missing_remote_bodies_backfill'
                );
            }

            if (checkpointFallbackEntries.length > 0) {
                try {
                    const fallbackResult = await this.applyCheckpointBodyFallback(
                        rootData,
                        checkpointFallbackEntries
                    );

                    if (fallbackResult.appliedCardIds.length > 0) {
                        this.emitState('warning', {
                            message: `Oversized card bodies restored from checkpoint for ${fallbackResult.appliedCardIds.length} cards`
                        });
                    }

                    if (fallbackResult.missingCardIds.length > 0) {
                        console.warn(
                            `[FirebaseSync] ${fallbackResult.missingCardIds.length} oversized card bodies still missing on board ${this.boardId}; checkpoint fallback unavailable`
                        );
                    }
                } catch (error) {
                    console.warn(
                        `[FirebaseSync] Failed to apply checkpoint body fallback on board ${this.boardId}:`,
                        error
                    );
                    this.emitState('warning', {
                        message: `Checkpoint body fallback failed: ${error?.message || 'unknown error'}`
                    });
                }
            }
        }

        this.subscribeToRootCheckpoint();
        this.subscribeToCardBodies();
        this.connected = true;
        this.remoteIsEmpty = !hasRemoteBoardSkeleton(rootData) && !hasRemoteCheckpoint(rootData) && bodyEntries.length === 0;
        this.emitState('connected', {
            remoteIsEmpty: this.remoteIsEmpty,
            mode: FIREBASE_SYNC_SAFE_MODE ? 'safe_layered_sync' : 'layered_sync'
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

    async loadRemoteCardBodies() {
        const entries = await loadCardBodyEntries({
            userId: this.userId,
            boardId: this.boardId
        });

        const applyResult = this.applyRemoteCardBodyEntries(entries);
        if (applyResult) {
            this.emitRemoteApplied(applyResult);
        }

        return entries;
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

        if (decodedCheckpoint.recovered || resolution.shouldRepairRemote) {
            await this.saveNonDestructiveRepair(
                decodedCheckpoint.recovered ? 'checkpoint_decode_repair' : resolution.reason,
                checkpoint.signature || buildRootCheckpointKey(rootData)
            );
        }

        return {
            format: decodedCheckpoint.format,
            recovered: decodedCheckpoint.recovered,
            applied: resolution.action === 'apply',
            reason: resolution.reason,
            shouldRepairRemote: resolution.shouldRepairRemote,
            snapshot: resolution.snapshot
        };
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
            this.remoteIsEmpty = !hasRemoteBoardSkeleton(effectiveRootData);
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
            this.remoteIsEmpty = !hasRemoteBoardSkeleton(effectiveRootData);
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
            const applyResult = await this.applyLoadedCheckpoint(checkpoint, effectiveRootData);
            if (applyResult?.applied) {
                this.emitRemoteApplied({
                    lane: SYNC_LANES.FULL,
                    source: options.recoveryOnly ? 'checkpoint_recovery' : 'remote_checkpoint',
                    reason: options.recoveryOnly ? 'checkpoint_recovery_applied' : applyResult.reason,
                    partialSnapshot: applyResult.snapshot,
                    mergedSnapshot: readBoardSnapshotFromDoc(this.doc)
                });
            }
            if (options.recoveryOnly && applyResult?.snapshot) {
                await this.saveNonDestructiveRepair(
                    'checkpoint_recovery_layered_backfill',
                    checkpoint.signature || buildRootCheckpointKey(effectiveRootData)
                );
            }
            return {
                ...applyResult,
                skippedApplyReason: ''
            };
        } catch (error) {
            if (!isBoardDocEmpty(this.doc)) {
                console.error(`[FirebaseSync] Failed to decode remote checkpoint for board ${this.boardId}, keeping local snapshot:`, error);
                this.emitState('warning', {
                    message: `Remote checkpoint decode failed for ${this.boardId}, kept local snapshot`
                });
                return {
                    skippedApplyReason: ''
                };
            }

            throw error;
        }
    }

    subscribeToRootCheckpoint() {
        const rootRef = createBoardRootRef(this.userId, this.boardId);
        this.rootUnsubscribe = onSnapshot(rootRef, async (rootDoc) => {
            const data = rootDoc.data();
            if (!data) {
                return;
            }

            this.updateRemoteMetadataFromRoot(data);
            const remoteSyncTouchedAtMs = toFirestoreMillis(data.syncTouchedAtMs);
            const appliedSkeleton = this.applyRemoteSkeletonSnapshot(data);

            if (appliedSkeleton) {
                this.remoteIsEmpty = false;
                this.latestRootSyncTouchedAtMs = Math.max(
                    this.latestRootSyncTouchedAtMs,
                    remoteSyncTouchedAtMs
                );
                this.emitRemoteApplied(appliedSkeleton);
                if (appliedSkeleton.flushedBodyPayload) {
                    this.emitRemoteApplied(appliedSkeleton.flushedBodyPayload);
                }
            }

            this.latestRootSyncTouchedAtMs = remoteSyncTouchedAtMs;
        }, (error) => {
            this.emitState('warning', {
                message: error?.message || 'Checkpoint listener failed'
            });
        });
    }

    subscribeToCardBodies() {
        this.bodyUnsubscribe = subscribeToCardBodyEntries({
            userId: this.userId,
            boardId: this.boardId,
            onEntries: (entries) => {
                const applyResult = this.applyRemoteCardBodyEntries(entries);
                if (applyResult) {
                    this.remoteIsEmpty = false;
                    this.emitRemoteApplied(applyResult);
                }
            },
            onError: (error) => {
                this.emitState('warning', {
                    message: error?.message || 'Card body listener failed'
                });
            }
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
        this.checkpointRecoveryDirty = true;
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
            void this.flushPendingUpdates('size_limit').catch(() => {});
            return;
        }

        if (this.flushTimer) {
            // Throttle instead of infinite debounce: let the existing timer fire
            return;
        }

        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flushPendingUpdates('debounced').catch(() => {});
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
        this.pendingBodyJobs.clear();
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

            const currentBodyJobs = Array.from(this.pendingBodyJobs.values());
            if (!this.hasUnsnapshottedChanges && currentBodyJobs.length === 0) {
                this.pendingBytes = 0;
                this.pendingSyncLane = SYNC_LANES.NONE;
                return;
            }

            const currentReason = nextReason || 'debounced';
            const currentSyncLane = this.pendingSyncLane;
            const flushSequence = this.localUpdateSequence;
            this.pendingBytes = 0;
            this.pendingSyncLane = SYNC_LANES.NONE;
            this.pendingBodyJobs.clear();

            try {
                if (currentSyncLane === SYNC_LANES.SKELETON || currentSyncLane === SYNC_LANES.FULL) {
                    await this.saveSkeletonRootSnapshot(`skeleton_lane_flush:${currentReason}`);
                }

                if (currentBodyJobs.length > 0) {
                    await this.saveQueuedCardBodyJobs(currentBodyJobs, `body_lane_flush:${currentReason}`);
                }

                this.hasUnsnapshottedChanges = this.localUpdateSequence > flushSequence;
            } catch (error) {
                currentBodyJobs.forEach((entry) => {
                    this.pendingBodyJobs.set(entry.cardId, entry);
                });
                this.pendingSyncLane = currentSyncLane;
                this.hasUnsnapshottedChanges = true;
                this.emitState('warning', {
                    message: error?.message || 'Layered sync flush failed'
                });
                throw error;
            }
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
                        this.checkpointRecoveryDirty = this.localUpdateSequence > checkpointSequence;
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

        if (this.connected && this.checkpointRecoveryDirty) {
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

        if (this.bodyUnsubscribe) {
            this.bodyUnsubscribe();
            this.bodyUnsubscribe = null;
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

    if (hasRemoteCheckpoint(existingRootData) || hasRemoteBoardSkeleton(existingRootData)) {
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

    try {
        await saveBoardSkeleton({
            userId,
            boardId,
            deviceId,
            snapshot: buildSkeletonSyncSnapshot(normalizedSnapshot),
            reason: 'local_seed'
        });

        await saveCardBodyEntries({
            userId,
            boardId,
            deviceId,
            entries: buildCompleteCardBodySyncEntries(normalizedSnapshot.cards, {
                clientRevision: normalizedSnapshot.clientRevision,
                updatedAt: normalizedSnapshot.updatedAt
            })
        });

        const checkpoint = await saveBoardCheckpoint({
            userId,
            boardId,
            deviceId,
            updateBase64: bytesToBase64(encodeCompactBoardSnapshotUpdate(normalizedSnapshot)),
            reason: 'local_seed',
            snapshotMetadata: pickBoardSyncMetadata(normalizedSnapshot)
        });
        return Boolean(checkpoint);
    } catch (error) {
        console.error(`[FirebaseSync] Failed to seed local board ${boardId}:`, error);
        return false;
    }
};
