import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
    emergencyLocalSave,
    saveBoard,
    saveViewportState
} from '../services/storage';
import { debugLog } from '../utils/debugLogger';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../services/customInstructionsService';
import {
    buildBoardRecoverySnapshot,
    clearBoardShadowSnapshot,
    persistBoardShadowSnapshot
} from '../services/boardPersistence/localBoardShadow';

const SHADOW_SAVE_DELAY_MS = 450;
const SHADOW_SAVE_MAX_WAIT_MS = 1500;
const LOCAL_SAVE_DELAY_MS = 1000;
const LOCAL_SAVE_MAX_WAIT_MS = 4000;
const VIEWPORT_SAVE_DELAY_MS = 220;
const VIEWPORT_MOVE_THRESHOLD = 24;
const VIEWPORT_SCALE_THRESHOLD = 0.015;
const SHADOW_RESCHEDULE_COALESCE_MS = 120;
const LOCAL_RESCHEDULE_COALESCE_MS = 120;
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

const resolveDebouncedSaveDelay = (windowStartedAt, now, debounceMs, maxWaitMs) => {
    const effectiveWindowStartedAt = windowStartedAt || now;
    const elapsed = Math.max(0, now - effectiveWindowStartedAt);
    const remainingMaxWait = Math.max(0, maxWaitMs - elapsed);

    return {
        windowStartedAt: effectiveWindowStartedAt,
        delayMs: Math.min(debounceMs, remainingMaxWait)
    };
};

const hasViewportMeaningfulChange = (previousViewport, nextViewport) => {
    if (!previousViewport) return true;

    return (
        Math.abs((previousViewport.offset?.x || 0) - (nextViewport.offset?.x || 0)) >= VIEWPORT_MOVE_THRESHOLD ||
        Math.abs((previousViewport.offset?.y || 0) - (nextViewport.offset?.y || 0)) >= VIEWPORT_MOVE_THRESHOLD ||
        Math.abs((previousViewport.scale || 1) - (nextViewport.scale || 1)) >= VIEWPORT_SCALE_THRESHOLD
    );
};

const createSaveTracker = (boardId) => ({
    boardId,
    revision: 0,
    shadowSavedRevision: 0,
    localSavedRevision: 0,
    isPrimed: false
});

const createActivePersistenceCursor = () => ({
    updatedAt: 0,
    clientRevision: 0,
    dirty: false
});

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
        updatedAt: Number.isFinite(Number(options.updatedAt ?? data?.updatedAt))
            ? Number(options.updatedAt ?? data?.updatedAt)
            : 0,
        clientRevision
    };
};

const applySaveStatus = (setSaveStatus, status) => {
    if (typeof setSaveStatus === 'function') {
        setSaveStatus(status);
    }
};

export function useBoardPersistence({
    boardId,
    cards,
    connections,
    groups,
    boardPrompts,
    boardInstructionSettings,
    offset,
    scale,
    isBoardLoading,
    isReadOnly,
    hasGeneratingCards = false,
    setSaveStatus,
    setLastSavedAt,
    setActiveBoardPersistence,
    toast
}) {
    const trackerRef = useRef(createSaveTracker(boardId));
    const activePersistenceCursorRef = useRef(createActivePersistenceCursor());
    const latestBoardDataRef = useRef({
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings
    });
    const isBoardLoadingRef = useRef(isBoardLoading);
    const wasGeneratingRef = useRef(Boolean(hasGeneratingCards));
    const shadowSaveTimerRef = useRef(null);
    const localSaveTimerRef = useRef(null);
    const viewportSaveTimerRef = useRef(null);
    const queuedShadowRevisionRef = useRef(0);
    const queuedLocalRevisionRef = useRef(0);
    const lastShadowScheduleAtRef = useRef(0);
    const lastLocalScheduleAtRef = useRef(0);
    const shadowSaveWindowStartedAtRef = useRef(0);
    const localSaveWindowStartedAtRef = useRef(0);
    const pendingViewportRef = useRef(null);
    const lastSavedViewportRef = useRef(null);

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

    const updateActivePersistenceCursor = useCallback((cursor = {}) => {
        if (typeof setActiveBoardPersistence !== 'function') return;

        const nextCursor = {
            ...activePersistenceCursorRef.current,
            ...cursor
        };
        activePersistenceCursorRef.current = nextCursor;
        setActiveBoardPersistence(nextCursor);
    }, [setActiveBoardPersistence]);

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
    }, []);

    const persistRecoverySnapshot = useCallback((data, options = {}) => {
        if (!boardId) return false;

        const revision = toSafeRevision(options.revision ?? trackerRef.current.revision);
        const payload = buildBoardRecoverySnapshot(buildBoardPayload(data, {
            clientRevision: revision,
            updatedAt: Date.now()
        }), {
            updatedAt: Date.now(),
            clientRevision: revision
        });

        const scopes = Array.isArray(options.scopes) ? options.scopes : ['session'];
        const didPersist = scopes.reduce((saved, scope) => (
            persistBoardShadowSnapshot(boardId, payload, { scope }) || saved
        ), false);

        if (didPersist && typeof options.revision === 'number') {
            trackerRef.current.shadowSavedRevision = Math.max(
                trackerRef.current.shadowSavedRevision,
                options.revision
            );
        }

        return didPersist;
    }, [boardId]);

    const performLocalSave = useCallback(async (data, options = {}) => {
        if (!boardId) return;

        const revision = toSafeRevision(options.revision ?? trackerRef.current.revision);
        const now = Date.now();

        applySaveStatus(setSaveStatus, 'saving');
        updateActivePersistenceCursor({
            clientRevision: revision,
            dirty: true
        });

        try {
            const payload = buildBoardPayload(data, {
                clientRevision: revision,
                updatedAt: now
            });

            await saveBoard(boardId, payload);

            if (typeof setLastSavedAt === 'function') {
                setLastSavedAt(now);
            }

            trackerRef.current.localSavedRevision = Math.max(
                trackerRef.current.localSavedRevision,
                revision
            );

            if (trackerRef.current.localSavedRevision >= trackerRef.current.shadowSavedRevision) {
                clearBoardShadowSnapshot(boardId);
            }

            applySaveStatus(setSaveStatus, 'saved');
            updateActivePersistenceCursor({
                updatedAt: now,
                clientRevision: revision,
                dirty: false
            });
        } catch (error) {
            console.error('[BoardPersistence] Local save failed:', error);
            applySaveStatus(setSaveStatus, 'error');
            updateActivePersistenceCursor({
                clientRevision: revision,
                dirty: true
            });
            if (!options.silent) {
                toast?.error?.('本地保存失败，请检查存储空间');
            }
        }
    }, [boardId, saveBoard, setActiveBoardPersistence, setLastSavedAt, setSaveStatus, toast, updateActivePersistenceCursor]);

    const performEmergencyLocalSave = useCallback((data, options = {}) => {
        if (!boardId) return false;

        return emergencyLocalSave(boardId, buildBoardPayload(data, {
            clientRevision: toSafeRevision(options.revision ?? trackerRef.current.revision),
            updatedAt: Date.now()
        }));
    }, [boardId]);

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

    const flushPendingPersistence = useCallback((reason, options = {}) => {
        if (!boardId || isBoardLoadingRef.current) return;

        const tracker = trackerRef.current;
        if (!tracker.isPrimed) return;

        const revision = tracker.revision;
        if (revision <= tracker.localSavedRevision) return;

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

        if (localSaveTimerRef.current) {
            clearTimeout(localSaveTimerRef.current);
            localSaveTimerRef.current = null;
        }
        localSaveWindowStartedAtRef.current = 0;

        void performLocalSave(latestBoardDataRef.current, {
            revision,
            reason,
            silent: options.silent !== false
        });
    }, [boardId, performEmergencyLocalSave, performLocalSave, persistRecoverySnapshot]);

    useEffect(() => {
        if (!boardId || isBoardLoading || isReadOnly) {
            clearContentSaveTimers();
            applySaveStatus(setSaveStatus, 'idle');
            return;
        }

        const tracker = trackerRef.current;
        if (tracker.boardId !== boardId) {
            trackerRef.current = createSaveTracker(boardId);
            return;
        }

        const normalizedSettings = normalizeBoardInstructionSettings(
            boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        );

        if (!tracker.isPrimed) {
            const baselineSnapshot = {
                cards,
                connections,
                groups,
                boardPrompts,
                boardInstructionSettings: normalizedSettings,
                clientRevision: 0
            };

            latestBoardDataRef.current = baselineSnapshot;
            tracker.isPrimed = true;
            applySaveStatus(setSaveStatus, 'saved');
            updateActivePersistenceCursor({
                updatedAt: Date.now(),
                clientRevision: 0,
                dirty: false
            });
            return;
        }

        tracker.revision += 1;
        const revision = tracker.revision;
        latestBoardDataRef.current = {
            cards,
            connections,
            groups,
            boardPrompts,
            boardInstructionSettings: normalizedSettings,
            clientRevision: revision
        };

        applySaveStatus(setSaveStatus, 'local_dirty');
        updateActivePersistenceCursor({
            updatedAt: Date.now(),
            clientRevision: revision,
            dirty: true
        });

        scheduleShadowSave(revision);
        scheduleLocalSave(revision);
    }, [
        boardId,
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings,
        isBoardLoading,
        isReadOnly,
        clearContentSaveTimers,
        scheduleLocalSave,
        scheduleShadowSave,
        setSaveStatus,
        updateActivePersistenceCursor
    ]);

    useEffect(() => {
        trackerRef.current = createSaveTracker(boardId);
        activePersistenceCursorRef.current = createActivePersistenceCursor();
        clearContentSaveTimers();
        queuedShadowRevisionRef.current = 0;
        queuedLocalRevisionRef.current = 0;
        lastShadowScheduleAtRef.current = 0;
        lastLocalScheduleAtRef.current = 0;
        shadowSaveWindowStartedAtRef.current = 0;
        localSaveWindowStartedAtRef.current = 0;
        pendingViewportRef.current = null;
        lastSavedViewportRef.current = null;

        if (viewportSaveTimerRef.current) {
            clearTimeout(viewportSaveTimerRef.current);
            viewportSaveTimerRef.current = null;
        }

        applySaveStatus(setSaveStatus, boardId && !isReadOnly ? 'idle' : 'saved');
        updateActivePersistenceCursor({
            updatedAt: 0,
            clientRevision: 0,
            dirty: false
        });
    }, [boardId, clearContentSaveTimers, isReadOnly, setSaveStatus, updateActivePersistenceCursor]);

    useEffect(() => {
        const isGeneratingNow = Boolean(hasGeneratingCards);
        const wasGenerating = wasGeneratingRef.current;
        wasGeneratingRef.current = isGeneratingNow;

        if (wasGenerating && !isGeneratingNow) {
            flushPendingPersistence('generation_complete_flush', {
                silent: true
            });
        }
    }, [flushPendingPersistence, hasGeneratingCards]);

    useEffect(() => {
        if (!boardId) return undefined;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                flushPendingPersistence('visibility_hidden_flush', { silent: true });
            }
        };
        const handlePageHide = () => {
            flushPendingPersistence('pagehide_flush', { silent: true });
        };
        const handleBeforeUnload = () => {
            flushPendingPersistence('beforeunload_flush', { silent: true });
        };
        const handleFreeze = () => {
            flushPendingPersistence('freeze_flush', { silent: true });
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

            if (!boardId) {
                return;
            }

            flushPendingPersistence('unmount_flush', { silent: true });
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
    }, [boardId, isBoardLoading, offset, scale]);
}
