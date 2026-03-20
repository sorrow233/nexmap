import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
    saveBoard,
    saveBoardToCloud,
    saveViewportState,
    emergencyLocalSave,
    CLOUD_SAVE_RESULT_OK,
    CLOUD_SAVE_RESULT_DEFERRED_OFFLINE,
    CLOUD_SAVE_RESULT_QUEUED_RETRY
} from '../services/storage';
import { getRawBoardsList } from '../services/boardService';
import { debugLog } from '../utils/debugLogger';
import { buildBoardCursorTrace, logPersistenceTrace } from '../utils/persistenceTrace';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../services/customInstructionsService';
import {
    buildBoardRecoverySnapshot,
    clearBoardShadowSnapshot,
    persistBoardShadowSnapshot
} from '../services/boardPersistence/localBoardShadow';
import {
    clearPendingCloudSync,
    hasPendingCloudSync,
    markPendingCloudSync
} from '../services/pendingCloudSync';
import { buildBoardContentHash } from '../services/boardPersistence/boardContentHash';
import { buildIncrementalPatchCandidate } from '../services/sync/boardIncrementalPatch';

const SHADOW_SAVE_DELAY_MS = 450;
const SHADOW_SAVE_MAX_WAIT_MS = 1500;
const LOCAL_SAVE_DELAY_MS = 1000;
const LOCAL_SAVE_MAX_WAIT_MS = 4000;
const CLOUD_SAVE_DELAY_MS = 8000;
const CLOUD_SAVE_MAX_WAIT_MS = 20000;
const VIEWPORT_SAVE_DELAY_MS = 220;
const VIEWPORT_MOVE_THRESHOLD = 24;
const VIEWPORT_SCALE_THRESHOLD = 0.015;
const SHADOW_RESCHEDULE_COALESCE_MS = 120;
const LOCAL_RESCHEDULE_COALESCE_MS = 120;
const CLOUD_RESCHEDULE_COALESCE_MS = 1000;
const CRITICAL_LOCAL_FALLBACK_REASONS = new Set([
    'pagehide_flush',
    'beforeunload_flush',
    'freeze_flush',
    'unmount_flush'
]);

const toSafeRevision = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const createSaveTracker = (boardId) => ({
    boardId,
    revision: 0,
    shadowSavedRevision: 0,
    localSavedRevision: 0,
    cloudSavedRevision: 0,
    isPrimed: false,
    hasAttemptedPendingCloudResume: false
});

const hasViewportMeaningfulChange = (previousViewport, nextViewport) => {
    if (!previousViewport) return true;

    return (
        Math.abs((previousViewport.offset?.x || 0) - (nextViewport.offset?.x || 0)) >= VIEWPORT_MOVE_THRESHOLD ||
        Math.abs((previousViewport.offset?.y || 0) - (nextViewport.offset?.y || 0)) >= VIEWPORT_MOVE_THRESHOLD ||
        Math.abs((previousViewport.scale || 1) - (nextViewport.scale || 1)) >= VIEWPORT_SCALE_THRESHOLD
    );
};

const buildBoardPayload = (data, options = {}) => {
    const clientRevision = toSafeRevision(options.clientRevision ?? data?.clientRevision);
    return {
        cards: data.cards || [],
        connections: data.connections || [],
        groups: data.groups || [],
        boardPrompts: data.boardPrompts || [],
        boardInstructionSettings: normalizeBoardInstructionSettings(
            data.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        ),
        clientRevision
    };
};

const resolveDebouncedSaveDelay = (windowStartedAt, now, debounceMs, maxWaitMs) => {
    const effectiveWindowStartedAt = windowStartedAt || now;
    const elapsed = Math.max(0, now - effectiveWindowStartedAt);
    const remainingMaxWait = Math.max(0, maxWaitMs - elapsed);

    return {
        windowStartedAt: effectiveWindowStartedAt,
        delayMs: Math.min(debounceMs, remainingMaxWait)
    };
};

export function useBoardPersistence({
    boardId,
    user,
    cards,
    connections,
    groups,
    boardPrompts,
    boardInstructionSettings,
    offset,
    scale,
    isBoardLoading,
    isHydratingFromCloud,
    isReadOnly,
    setCloudSyncStatus,
    setLastSavedAt,
    setActiveBoardPersistence,
    toast
}) {
    const trackerRef = useRef(createSaveTracker(boardId));
    const latestBoardDataRef = useRef({
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings
    });
    const isBoardLoadingRef = useRef(isBoardLoading);
    const shadowSaveTimerRef = useRef(null);
    const localSaveTimerRef = useRef(null);
    const cloudSaveTimerRef = useRef(null);
    const viewportSaveTimerRef = useRef(null);
    const queuedShadowRevisionRef = useRef(0);
    const queuedLocalRevisionRef = useRef(0);
    const queuedCloudRevisionRef = useRef(0);
    const lastShadowScheduleAtRef = useRef(0);
    const lastLocalScheduleAtRef = useRef(0);
    const lastCloudScheduleAtRef = useRef(0);
    const shadowSaveWindowStartedAtRef = useRef(0);
    const localSaveWindowStartedAtRef = useRef(0);
    const cloudSaveWindowStartedAtRef = useRef(0);
    const dirtyFlagsRef = useRef({ local: false, cloud: false });
    const pendingViewportRef = useRef(null);
    const lastSavedViewportRef = useRef(null);
    const lastBlockedReasonRef = useRef('');
    const lastLoggedStructureSignatureRef = useRef('');
    const lastCloudAckedSnapshotRef = useRef(null);

    useLayoutEffect(() => {
        latestBoardDataRef.current = {
            cards,
            connections,
            groups,
            boardPrompts,
            boardInstructionSettings
        };
    }, [cards, connections, groups, boardPrompts, boardInstructionSettings]);

    useEffect(() => {
        isBoardLoadingRef.current = isBoardLoading;
    }, [isBoardLoading]);

    const logBlockedState = useCallback((reason) => {
        if (!boardId) return;
        if (lastBlockedReasonRef.current === reason) return;
        lastBlockedReasonRef.current = reason;
        logPersistenceTrace('autosave:blocked-state', {
            boardId,
            reason
        });
    }, [boardId]);

    const clearBlockedState = useCallback(() => {
        if (!boardId) return;
        if (!lastBlockedReasonRef.current) return;
        logPersistenceTrace('autosave:blocked-state-cleared', {
            boardId,
            previousReason: lastBlockedReasonRef.current
        });
        lastBlockedReasonRef.current = '';
    }, [boardId]);

    const getLastKnownSyncVersion = useCallback(() => {
        if (!boardId) return 0;

        const boardMeta = getRawBoardsList().find((board) => board.id === boardId);
        const numeric = Number(boardMeta?.syncVersion);
        return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    }, [boardId]);

    const updateActivePersistenceCursor = useCallback((cursor = {}) => {
        if (typeof setActiveBoardPersistence !== 'function') return;
        setActiveBoardPersistence(cursor);
    }, [setActiveBoardPersistence]);

    const persistRecoverySnapshot = useCallback((data, options = {}) => {
        const {
            revision = null,
            reason = 'autosave',
            scopes = ['session']
        } = options;

        if (!boardId) return false;

        const clientRevision = toSafeRevision(revision ?? trackerRef.current.revision);
        const payload = buildBoardRecoverySnapshot(buildBoardPayload(data, { clientRevision }), {
            updatedAt: Date.now(),
            syncVersion: getLastKnownSyncVersion(),
            clientRevision
        });

        const persistScopes = Array.isArray(scopes) ? scopes : [scopes];
        const didPersist = persistScopes.reduce((saved, scope) => (
            persistBoardShadowSnapshot(boardId, payload, { scope }) || saved
        ), false);

        if (didPersist) {
            const tracker = trackerRef.current;
            if (tracker.boardId === boardId && typeof revision === 'number') {
                tracker.shadowSavedRevision = Math.max(tracker.shadowSavedRevision, revision);
            }
            debugLog.storage(`[BoardPersistence] Recovery snapshot updated for board: ${boardId} (${reason})`, {
                scopes: persistScopes,
                updatedAt: payload.updatedAt
            });
            logPersistenceTrace('recovery-snapshot:write', {
                boardId,
                revision,
                reason,
                scopes: persistScopes,
                cursor: buildBoardCursorTrace(payload)
            });
        }

        return didPersist;
    }, [boardId, getLastKnownSyncVersion]);

    const performLocalSave = useCallback(async (data, options = {}) => {
        const { revision = null, reason = 'autosave', silent = false } = options;
        if (!boardId) return;

        try {
            const now = Date.now();
            const clientRevision = toSafeRevision(revision ?? trackerRef.current.revision);
            const payload = buildBoardPayload(data, { clientRevision });
            await saveBoard(boardId, payload);

            if (typeof setLastSavedAt === 'function') {
                setLastSavedAt(now);
            }

            const tracker = trackerRef.current;
            if (tracker.boardId === boardId && typeof revision === 'number') {
                tracker.localSavedRevision = Math.max(tracker.localSavedRevision, revision);
                if (tracker.localSavedRevision >= tracker.shadowSavedRevision) {
                    clearBoardShadowSnapshot(boardId);
                }
            }
            dirtyFlagsRef.current.local = false;
            updateActivePersistenceCursor({
                updatedAt: now,
                syncVersion: getLastKnownSyncVersion(),
                clientRevision,
                dirty: Boolean(user?.uid) && !isReadOnly
            });

            debugLog.storage(`[BoardPersistence] Local save complete for board: ${boardId} (${reason})`, { timestamp: now });
            logPersistenceTrace('local-save:success', {
                boardId,
                revision,
                reason,
                cursor: buildBoardCursorTrace({
                    ...payload,
                    updatedAt: now,
                    syncVersion: getLastKnownSyncVersion()
                })
            });
        } catch (error) {
            console.error('[BoardPersistence] Save failed', error);
            logPersistenceTrace('local-save:failed', {
                boardId,
                revision,
                reason,
                error
            });
            if (!silent) {
                toast?.error?.('保存失败，请检查存储空间');
            }
        }
    }, [boardId, getLastKnownSyncVersion, isReadOnly, setLastSavedAt, toast, updateActivePersistenceCursor, user?.uid]);

    const performEmergencyLocalSave = useCallback((data, options = {}) => {
        const { revision = null, reason = 'emergency_local_flush' } = options;
        if (!boardId) return false;

        const clientRevision = toSafeRevision(revision ?? trackerRef.current.revision);
        const payload = buildBoardPayload(data, {
            clientRevision
        });
        const didSave = emergencyLocalSave(boardId, {
            ...payload,
            syncVersion: getLastKnownSyncVersion(),
            clientRevision
        });

        if (didSave) {
            logPersistenceTrace('local-save:emergency-fallback', {
                boardId,
                revision: clientRevision,
                reason,
                cursor: buildBoardCursorTrace({
                    ...payload,
                    syncVersion: getLastKnownSyncVersion(),
                    clientRevision,
                    updatedAt: Date.now()
                })
            });
        }

        return didSave;
    }, [boardId, emergencyLocalSave, getLastKnownSyncVersion]);

    const flushCloudSave = useCallback(async (revision, options = {}) => {
        const { force = false, reason = 'autosave', silent = false } = options;
        if (!user?.uid || !boardId || isReadOnly) return null;

        const tracker = trackerRef.current;
        const hasPendingFlag = hasPendingCloudSync(boardId);
        if (!force && revision <= tracker.cloudSavedRevision && !hasPendingFlag) {
            return null;
        }

        setCloudSyncStatus('syncing');

        try {
            const clientRevision = toSafeRevision(revision ?? tracker.revision);
            const cloudPayload = buildBoardPayload(latestBoardDataRef.current, { clientRevision });
            const baselineForPatch = buildBoardPayload(
                lastCloudAckedSnapshotRef.current || cloudPayload,
                {
                    clientRevision: toSafeRevision(lastCloudAckedSnapshotRef.current?.clientRevision)
                }
            );
            const patchCandidate = buildIncrementalPatchCandidate({
                baseBoard: baselineForPatch,
                nextBoard: cloudPayload,
                fromClientRevision: baselineForPatch.clientRevision,
                toClientRevision: clientRevision,
                updatedAt: Date.now()
            });
            const result = await saveBoardToCloud(
                user.uid,
                boardId,
                cloudPayload,
                {
                    incrementalPatch: patchCandidate?.eligible ? patchCandidate.patch : null
                }
            );

            if (result?.status === CLOUD_SAVE_RESULT_OK) {
                clearPendingCloudSync(boardId);
                dirtyFlagsRef.current.cloud = false;
                setCloudSyncStatus('synced');

                const activeTracker = trackerRef.current;
                if (activeTracker.boardId === boardId && typeof revision === 'number') {
                    activeTracker.cloudSavedRevision = Math.max(activeTracker.cloudSavedRevision, revision);
                }

                const latestHash = buildBoardContentHash(
                    buildBoardPayload(latestBoardDataRef.current, {
                        clientRevision: trackerRef.current.revision
                    })
                );
                const cloudAcknowledgedCurrentRevision = latestHash === result?.contentHash;

                if (cloudAcknowledgedCurrentRevision) {
                    lastCloudAckedSnapshotRef.current = buildBoardPayload(
                        latestBoardDataRef.current,
                        {
                            clientRevision: trackerRef.current.revision
                        }
                    );
                    updateActivePersistenceCursor({
                        updatedAt: result?.updatedAt || Date.now(),
                        syncVersion: result?.syncVersion || getLastKnownSyncVersion(),
                        clientRevision,
                        dirty: false
                    });
                    logPersistenceTrace('cloud-save:ack-current-revision', {
                        boardId,
                        revision: clientRevision,
                        mode: result?.patched ? 'incremental_patch' : 'snapshot',
                        syncVersion: result?.syncVersion || 0,
                        updatedAt: result?.updatedAt || 0
                    });
                } else {
                    logPersistenceTrace('cloud-save:ack-stale-revision', {
                        boardId,
                        revision: clientRevision,
                        latestRevision: trackerRef.current.revision,
                        syncVersion: result?.syncVersion || 0,
                        updatedAt: result?.updatedAt || 0
                    });
                }

                debugLog.sync(`[BoardPersistence] Cloud save complete for board: ${boardId} (${reason})`);
                return result;
            }

            if (
                result?.status === CLOUD_SAVE_RESULT_DEFERRED_OFFLINE ||
                result?.status === CLOUD_SAVE_RESULT_QUEUED_RETRY
            ) {
                debugLog.sync(`[BoardPersistence] Cloud save deferred for board: ${boardId} (${reason})`, result);
                return result;
            }

            return result;
        } catch (error) {
            setCloudSyncStatus('error');
            console.error('[BoardPersistence] Cloud sync failed:', error);
            if (!silent) {
                toast?.error?.('云同步失败');
            }
            throw error;
        }
    }, [boardId, getLastKnownSyncVersion, isReadOnly, setCloudSyncStatus, toast, updateActivePersistenceCursor, user]);

    const clearContentSaveTimers = useCallback(() => {
        if (shadowSaveTimerRef.current) {
            clearTimeout(shadowSaveTimerRef.current);
            shadowSaveTimerRef.current = null;
        }
        shadowSaveWindowStartedAtRef.current = 0;
        if (localSaveTimerRef.current) {
            clearTimeout(localSaveTimerRef.current);
            localSaveTimerRef.current = null;
        }
        localSaveWindowStartedAtRef.current = 0;
        if (cloudSaveTimerRef.current) {
            clearTimeout(cloudSaveTimerRef.current);
            cloudSaveTimerRef.current = null;
        }
        cloudSaveWindowStartedAtRef.current = 0;
    }, []);

    const scheduleShadowSave = useCallback((revision) => {
        queuedShadowRevisionRef.current = revision;

        const now = Date.now();
        const delayConfig = resolveDebouncedSaveDelay(
            shadowSaveWindowStartedAtRef.current,
            now,
            SHADOW_SAVE_DELAY_MS,
            SHADOW_SAVE_MAX_WAIT_MS
        );
        shadowSaveWindowStartedAtRef.current = delayConfig.windowStartedAt;

        if (shadowSaveTimerRef.current && now - lastShadowScheduleAtRef.current < SHADOW_RESCHEDULE_COALESCE_MS) {
            return;
        }
        lastShadowScheduleAtRef.current = now;

        if (shadowSaveTimerRef.current) {
            clearTimeout(shadowSaveTimerRef.current);
        }

        shadowSaveTimerRef.current = setTimeout(() => {
            shadowSaveTimerRef.current = null;
            shadowSaveWindowStartedAtRef.current = 0;
            persistRecoverySnapshot(latestBoardDataRef.current, {
                revision: queuedShadowRevisionRef.current,
                reason: 'debounced_shadow',
                scopes: ['session']
            });
        }, delayConfig.delayMs);
    }, [persistRecoverySnapshot]);

    const scheduleLocalSave = useCallback((revision) => {
        queuedLocalRevisionRef.current = revision;
        dirtyFlagsRef.current.local = true;

        const now = Date.now();
        const delayConfig = resolveDebouncedSaveDelay(
            localSaveWindowStartedAtRef.current,
            now,
            LOCAL_SAVE_DELAY_MS,
            LOCAL_SAVE_MAX_WAIT_MS
        );
        localSaveWindowStartedAtRef.current = delayConfig.windowStartedAt;

        if (localSaveTimerRef.current && now - lastLocalScheduleAtRef.current < LOCAL_RESCHEDULE_COALESCE_MS) {
            return;
        }
        lastLocalScheduleAtRef.current = now;

        if (localSaveTimerRef.current) {
            clearTimeout(localSaveTimerRef.current);
        }

        localSaveTimerRef.current = setTimeout(() => {
            localSaveTimerRef.current = null;
            localSaveWindowStartedAtRef.current = 0;
            void performLocalSave(latestBoardDataRef.current, {
                revision: queuedLocalRevisionRef.current,
                reason: 'debounced_local'
            });
        }, delayConfig.delayMs);
    }, [performLocalSave]);

    const scheduleCloudSave = useCallback((revision) => {
        if (!user || !boardId) {
            if (cloudSaveTimerRef.current) {
                clearTimeout(cloudSaveTimerRef.current);
                cloudSaveTimerRef.current = null;
            }
            cloudSaveWindowStartedAtRef.current = 0;
            return;
        }

        queuedCloudRevisionRef.current = revision;
        dirtyFlagsRef.current.cloud = true;

        const now = Date.now();
        const delayConfig = resolveDebouncedSaveDelay(
            cloudSaveWindowStartedAtRef.current,
            now,
            CLOUD_SAVE_DELAY_MS,
            CLOUD_SAVE_MAX_WAIT_MS
        );
        cloudSaveWindowStartedAtRef.current = delayConfig.windowStartedAt;

        if (cloudSaveTimerRef.current && now - lastCloudScheduleAtRef.current < CLOUD_RESCHEDULE_COALESCE_MS) {
            return;
        }
        lastCloudScheduleAtRef.current = now;

        if (cloudSaveTimerRef.current) {
            clearTimeout(cloudSaveTimerRef.current);
        }

        cloudSaveTimerRef.current = setTimeout(async () => {
            cloudSaveTimerRef.current = null;
            cloudSaveWindowStartedAtRef.current = 0;
            try {
                await flushCloudSave(queuedCloudRevisionRef.current, { reason: 'debounced_cloud' });
            } catch {
                // 错误提示已在 flushCloudSave 内处理
            }
        }, delayConfig.delayMs);
    }, [boardId, flushCloudSave, user]);

    const flushPendingPersistence = useCallback((reason, options = {}) => {
        const { forceCloud = false, silent = true } = options;
        if (!boardId || isBoardLoadingRef.current) return;

        const tracker = trackerRef.current;
        if (!tracker.isPrimed) return;

        const revision = tracker.revision;
        const shouldFlushLocal = revision > tracker.localSavedRevision;
        const shouldFlushCloud =
            Boolean(user?.uid) &&
            !isReadOnly &&
            (
                forceCloud ||
                hasPendingCloudSync(boardId) ||
                revision > tracker.cloudSavedRevision
            );

        logPersistenceTrace('flush:begin', {
            boardId,
            revision,
            reason,
            shouldFlushLocal,
            shouldFlushCloud,
            forceCloud
        });

        if (shouldFlushLocal) {
            if (shadowSaveTimerRef.current) {
                clearTimeout(shadowSaveTimerRef.current);
                shadowSaveTimerRef.current = null;
            }
            shadowSaveWindowStartedAtRef.current = 0;
            persistRecoverySnapshot(latestBoardDataRef.current, {
                revision,
                reason,
                scopes: ['session', 'local']
            });

            if (CRITICAL_LOCAL_FALLBACK_REASONS.has(reason)) {
                performEmergencyLocalSave(latestBoardDataRef.current, {
                    revision,
                    reason
                });
            }
        }

        if (shouldFlushLocal) {
            if (localSaveTimerRef.current) {
                clearTimeout(localSaveTimerRef.current);
                localSaveTimerRef.current = null;
            }
            localSaveWindowStartedAtRef.current = 0;
            void performLocalSave(latestBoardDataRef.current, {
                revision,
                reason,
                silent
            });
        }

        if (shouldFlushCloud) {
            if (cloudSaveTimerRef.current) {
                clearTimeout(cloudSaveTimerRef.current);
                cloudSaveTimerRef.current = null;
            }
            cloudSaveWindowStartedAtRef.current = 0;
            void flushCloudSave(revision, {
                reason,
                force: forceCloud || hasPendingCloudSync(boardId),
                silent
            }).catch((error) => {
                console.error(`[BoardPersistence] Flush cloud save failed during ${reason} for board ${boardId}`, error);
            });
        }
    }, [boardId, flushCloudSave, isReadOnly, performEmergencyLocalSave, performLocalSave, persistRecoverySnapshot, user?.uid]);

    useEffect(() => {
        if (!boardId || isBoardLoading || isHydratingFromCloud || isReadOnly) {
            const reason = !boardId
                ? 'missing_board_id'
                : isBoardLoading
                    ? 'board_loading'
                    : isHydratingFromCloud
                        ? 'hydrating_from_cloud'
                        : 'read_only';
            logBlockedState(reason);
            clearContentSaveTimers();
            return;
        }

        clearBlockedState();

        const tracker = trackerRef.current;
        if (tracker.boardId !== boardId) {
            trackerRef.current = createSaveTracker(boardId);
            logPersistenceTrace('autosave:tracker-reset', { boardId });
            return;
        }

        if (!tracker.isPrimed) {
            const normalizedSettings = normalizeBoardInstructionSettings(
                boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
            );
            const baselineSnapshot = {
                cards,
                connections,
                groups,
                boardPrompts,
                boardInstructionSettings: normalizedSettings,
                clientRevision: toSafeRevision(tracker.revision)
            };
            const baselineCursor = buildBoardCursorTrace(baselineSnapshot);
            const baselineRevision = toSafeRevision(baselineSnapshot.clientRevision);

            latestBoardDataRef.current = baselineSnapshot;
            lastCloudAckedSnapshotRef.current = baselineSnapshot;
            tracker.isPrimed = true;
            tracker.revision = baselineRevision;
            tracker.shadowSavedRevision = baselineRevision;
            tracker.localSavedRevision = baselineRevision;
            tracker.cloudSavedRevision = hasPendingCloudSync(boardId) ? 0 : baselineRevision;
            lastLoggedStructureSignatureRef.current = [
                baselineCursor.cards,
                baselineCursor.totalMessages,
                baselineCursor.connections,
                baselineCursor.groups
            ].join(':');
            logPersistenceTrace('autosave:primed', {
                boardId,
                strategy: 'ready_state_baseline',
                pendingCloudSync: hasPendingCloudSync(boardId),
                cursor: baselineCursor
            });
            return;
        }

        const normalizedSettings = normalizeBoardInstructionSettings(
            boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        );

        tracker.revision += 1;
        const revision = tracker.revision;
        const updatedAt = Date.now();
        const snapshot = {
            cards,
            connections,
            groups,
            boardPrompts,
            boardInstructionSettings: normalizedSettings,
            clientRevision: revision
        };
        const snapshotCursor = buildBoardCursorTrace(snapshot);
        const structureSignature = [
            snapshotCursor.cards,
            snapshotCursor.totalMessages,
            snapshotCursor.connections,
            snapshotCursor.groups
        ].join(':');

        latestBoardDataRef.current = snapshot;
        updateActivePersistenceCursor({
            updatedAt,
            syncVersion: getLastKnownSyncVersion(),
            clientRevision: revision,
            dirty: Boolean(user?.uid) && !isReadOnly
        });
        if (lastLoggedStructureSignatureRef.current !== structureSignature) {
            lastLoggedStructureSignatureRef.current = structureSignature;
            logPersistenceTrace('autosave:change-detected', {
                boardId,
                revision,
                cursor: snapshotCursor,
                userLoggedIn: Boolean(user?.uid),
                readOnly: isReadOnly
            });
        }
        if (user?.uid) {
            markPendingCloudSync(boardId, { reason: 'board_content_changed' });
            setCloudSyncStatus('syncing');
        }
        scheduleShadowSave(revision);
        scheduleLocalSave(revision);
        scheduleCloudSave(revision);
    }, [
        boardId,
        user,
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings,
        isBoardLoading,
        isHydratingFromCloud,
        isReadOnly,
        clearContentSaveTimers,
        getLastKnownSyncVersion,
        scheduleCloudSave,
        scheduleLocalSave,
        scheduleShadowSave,
        updateActivePersistenceCursor,
        setCloudSyncStatus
    ]);

    useEffect(() => {
        trackerRef.current = createSaveTracker(boardId);
        clearContentSaveTimers();
        queuedShadowRevisionRef.current = 0;
        queuedLocalRevisionRef.current = 0;
        queuedCloudRevisionRef.current = 0;
        lastShadowScheduleAtRef.current = 0;
        lastLocalScheduleAtRef.current = 0;
        lastCloudScheduleAtRef.current = 0;
        shadowSaveWindowStartedAtRef.current = 0;
        localSaveWindowStartedAtRef.current = 0;
        cloudSaveWindowStartedAtRef.current = 0;
        dirtyFlagsRef.current = { local: false, cloud: false };
        if (viewportSaveTimerRef.current) {
            clearTimeout(viewportSaveTimerRef.current);
            viewportSaveTimerRef.current = null;
        }
        pendingViewportRef.current = null;
        lastSavedViewportRef.current = null;
        lastBlockedReasonRef.current = '';
        lastLoggedStructureSignatureRef.current = '';
        lastCloudAckedSnapshotRef.current = null;
        if (!boardId || !user?.uid || isReadOnly) {
            setCloudSyncStatus('idle');
            return;
        }
        setCloudSyncStatus(hasPendingCloudSync(boardId) ? 'syncing' : 'idle');
    }, [boardId, clearContentSaveTimers, isReadOnly, setCloudSyncStatus, user?.uid]);

    useEffect(() => {
        if (!boardId || !user?.uid || isBoardLoading || isHydratingFromCloud || isReadOnly) {
            return;
        }

        const tracker = trackerRef.current;
        if (!tracker.isPrimed || tracker.hasAttemptedPendingCloudResume) {
            return;
        }

        tracker.hasAttemptedPendingCloudResume = true;
        if (!hasPendingCloudSync(boardId)) {
            return;
        }

        setCloudSyncStatus('syncing');
        void flushCloudSave(tracker.revision, {
            force: true,
            reason: 'resume_pending_cloud_sync',
            silent: true
        }).catch((error) => {
            console.error(`[BoardPersistence] Resume pending cloud sync failed for board ${boardId}`, error);
        });
    }, [
        boardId,
        flushCloudSave,
        isBoardLoading,
        isHydratingFromCloud,
        isReadOnly,
        setCloudSyncStatus,
        user?.uid
    ]);

    useEffect(() => {
        if (!boardId) return undefined;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                flushPendingPersistence('visibility_hidden_flush', { forceCloud: hasPendingCloudSync(boardId) });
            }
        };
        const handlePageHide = () => {
            flushPendingPersistence('pagehide_flush', { forceCloud: hasPendingCloudSync(boardId) });
        };
        const handleBeforeUnload = () => {
            flushPendingPersistence('beforeunload_flush', { forceCloud: hasPendingCloudSync(boardId) });
        };
        const handleFreeze = () => {
            flushPendingPersistence('freeze_flush', { forceCloud: hasPendingCloudSync(boardId) });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('freeze', handleFreeze);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('freeze', handleFreeze);
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [boardId, flushPendingPersistence]);

    useEffect(() => {
        return () => {
            clearContentSaveTimers();
            if (viewportSaveTimerRef.current) {
                clearTimeout(viewportSaveTimerRef.current);
                viewportSaveTimerRef.current = null;
            }

            if (isBoardLoadingRef.current) {
                debugLog.storage('[BoardPersistence] Skip unmount save because board is still loading');
                return;
            }

            const tracker = trackerRef.current;
            if (!tracker.isPrimed || !boardId) {
                return;
            }

            flushPendingPersistence('unmount_flush', { forceCloud: hasPendingCloudSync(boardId) });
        };
    }, [boardId, clearContentSaveTimers, flushPendingPersistence]);

    useEffect(() => {
        if (isBoardLoading && viewportSaveTimerRef.current) {
            clearTimeout(viewportSaveTimerRef.current);
            viewportSaveTimerRef.current = null;
            pendingViewportRef.current = null;
        }
    }, [isBoardLoading]);

    useEffect(() => {
        if (!boardId || isBoardLoading) return;

        const nextViewport = { offset, scale };
        const comparisonViewport = pendingViewportRef.current || lastSavedViewportRef.current;

        if (!hasViewportMeaningfulChange(comparisonViewport, nextViewport)) {
            return;
        }

        pendingViewportRef.current = nextViewport;

        if (viewportSaveTimerRef.current) {
            return;
        }

        viewportSaveTimerRef.current = setTimeout(() => {
            viewportSaveTimerRef.current = null;
            const viewportToSave = pendingViewportRef.current;
            pendingViewportRef.current = null;

            if (!viewportToSave || !hasViewportMeaningfulChange(lastSavedViewportRef.current, viewportToSave)) {
                return;
            }

            saveViewportState(boardId, viewportToSave);
            lastSavedViewportRef.current = viewportToSave;
        }, VIEWPORT_SAVE_DELAY_MS);
    }, [boardId, offset, scale, isBoardLoading]);
}
