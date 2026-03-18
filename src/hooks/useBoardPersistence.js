import { useCallback, useEffect, useRef } from 'react';
import { saveBoard, saveBoardToCloud, saveViewportState } from '../services/storage';
import { debugLog } from '../utils/debugLogger';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../services/customInstructionsService';

const LOCAL_SAVE_DELAY_MS = 1000;
const CLOUD_SAVE_DELAY_MS = 8000;
const VIEWPORT_SAVE_DELAY_MS = 220;
const VIEWPORT_MOVE_THRESHOLD = 24;
const VIEWPORT_SCALE_THRESHOLD = 0.015;
const LOCAL_RESCHEDULE_COALESCE_MS = 120;
const CLOUD_RESCHEDULE_COALESCE_MS = 1000;

const createSaveTracker = (boardId) => ({
    boardId,
    revision: 0,
    savedRevision: 0,
    isPrimed: false,
    hasSeenLoading: false
});

const hasViewportMeaningfulChange = (previousViewport, nextViewport) => {
    if (!previousViewport) return true;

    return (
        Math.abs((previousViewport.offset?.x || 0) - (nextViewport.offset?.x || 0)) >= VIEWPORT_MOVE_THRESHOLD ||
        Math.abs((previousViewport.offset?.y || 0) - (nextViewport.offset?.y || 0)) >= VIEWPORT_MOVE_THRESHOLD ||
        Math.abs((previousViewport.scale || 1) - (nextViewport.scale || 1)) >= VIEWPORT_SCALE_THRESHOLD
    );
};

const buildBoardPayload = (data) => ({
    cards: data.cards || [],
    connections: data.connections || [],
    groups: data.groups || [],
    boardPrompts: data.boardPrompts || [],
    boardInstructionSettings: normalizeBoardInstructionSettings(
        data.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
    )
});

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
    const localSaveTimerRef = useRef(null);
    const cloudSaveTimerRef = useRef(null);
    const viewportSaveTimerRef = useRef(null);
    const queuedLocalRevisionRef = useRef(0);
    const queuedCloudRevisionRef = useRef(0);
    const lastLocalScheduleAtRef = useRef(0);
    const lastCloudScheduleAtRef = useRef(0);
    const dirtyFlagsRef = useRef({ local: false, cloud: false });
    const pendingViewportRef = useRef(null);
    const lastSavedViewportRef = useRef(null);

    useEffect(() => {
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
        if (isBoardLoading) {
            trackerRef.current.hasSeenLoading = true;
        }
    }, [isBoardLoading]);

    const performSave = useCallback(async (data, options = {}) => {
        const { isUnmount = false, revision = null } = options;
        if (!boardId) return;

        try {
            const now = Date.now();
            const payload = buildBoardPayload(data);
            await saveBoard(boardId, payload);

            if (typeof setLastSavedAt === 'function') {
                setLastSavedAt(now);
            }

            const tracker = trackerRef.current;
            if (tracker.boardId === boardId && typeof revision === 'number') {
                tracker.savedRevision = Math.max(tracker.savedRevision, revision);
            }
            dirtyFlagsRef.current.local = false;

            if (!isUnmount) {
                debugLog.storage(`Local autosave complete for board: ${boardId}`, { timestamp: now });
            } else {
                debugLog.storage(`Unmount save complete for board: ${boardId}`);
            }
        } catch (error) {
            console.error('[BoardPersistence] Save failed', error);
            if (!isUnmount) {
                toast?.error?.('保存失败，请检查存储空间');
            }
        }
    }, [boardId, setLastSavedAt, toast]);

    const clearContentSaveTimers = useCallback(() => {
        if (localSaveTimerRef.current) {
            clearTimeout(localSaveTimerRef.current);
            localSaveTimerRef.current = null;
        }
        if (cloudSaveTimerRef.current) {
            clearTimeout(cloudSaveTimerRef.current);
            cloudSaveTimerRef.current = null;
        }
    }, []);

    const scheduleLocalSave = useCallback((revision) => {
        queuedLocalRevisionRef.current = revision;
        dirtyFlagsRef.current.local = true;

        const now = Date.now();
        if (localSaveTimerRef.current && now - lastLocalScheduleAtRef.current < LOCAL_RESCHEDULE_COALESCE_MS) {
            return;
        }
        lastLocalScheduleAtRef.current = now;

        if (localSaveTimerRef.current) {
            clearTimeout(localSaveTimerRef.current);
        }

        localSaveTimerRef.current = setTimeout(() => {
            localSaveTimerRef.current = null;
            void performSave(latestBoardDataRef.current, {
                revision: queuedLocalRevisionRef.current
            });
        }, LOCAL_SAVE_DELAY_MS);
    }, [performSave]);

    const scheduleCloudSave = useCallback((revision) => {
        if (!user || !boardId) {
            if (cloudSaveTimerRef.current) {
                clearTimeout(cloudSaveTimerRef.current);
                cloudSaveTimerRef.current = null;
            }
            return;
        }

        queuedCloudRevisionRef.current = revision;
        dirtyFlagsRef.current.cloud = true;

        const now = Date.now();
        if (cloudSaveTimerRef.current && now - lastCloudScheduleAtRef.current < CLOUD_RESCHEDULE_COALESCE_MS) {
            return;
        }
        lastCloudScheduleAtRef.current = now;

        if (cloudSaveTimerRef.current) {
            clearTimeout(cloudSaveTimerRef.current);
        }

        cloudSaveTimerRef.current = setTimeout(async () => {
            cloudSaveTimerRef.current = null;
            setCloudSyncStatus('syncing');

            try {
                await saveBoardToCloud(user.uid, boardId, buildBoardPayload(latestBoardDataRef.current));
                setCloudSyncStatus('synced');

                const tracker = trackerRef.current;
                if (tracker.boardId === boardId) {
                    tracker.savedRevision = Math.max(tracker.savedRevision, queuedCloudRevisionRef.current);
                }
                dirtyFlagsRef.current.cloud = false;

                debugLog.sync(`Cloud autosave complete for board: ${boardId}`);
            } catch (error) {
                setCloudSyncStatus('error');
                console.error('[BoardPersistence] Cloud sync failed:', error);
                toast?.error?.('云同步失败');
            }
        }, CLOUD_SAVE_DELAY_MS);
    }, [boardId, setCloudSyncStatus, toast, user]);

    useEffect(() => {
        if (!boardId || isBoardLoading || isHydratingFromCloud || isReadOnly) {
            clearContentSaveTimers();
            return;
        }

        const tracker = trackerRef.current;
        if (tracker.boardId !== boardId) {
            trackerRef.current = createSaveTracker(boardId);
            return;
        }

        if (!tracker.isPrimed) {
            if (!tracker.hasSeenLoading) return;
            tracker.isPrimed = true;
            tracker.savedRevision = tracker.revision;
            return;
        }

        const normalizedSettings = normalizeBoardInstructionSettings(
            boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
        );

        tracker.revision += 1;
        const revision = tracker.revision;
        const snapshot = {
            cards,
            connections,
            groups,
            boardPrompts,
            boardInstructionSettings: normalizedSettings
        };

        latestBoardDataRef.current = snapshot;
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
        scheduleCloudSave,
        scheduleLocalSave
    ]);

    useEffect(() => {
        trackerRef.current = createSaveTracker(boardId);
        clearContentSaveTimers();
        queuedLocalRevisionRef.current = 0;
        queuedCloudRevisionRef.current = 0;
        lastLocalScheduleAtRef.current = 0;
        lastCloudScheduleAtRef.current = 0;
        dirtyFlagsRef.current = { local: false, cloud: false };
        if (viewportSaveTimerRef.current) {
            clearTimeout(viewportSaveTimerRef.current);
            viewportSaveTimerRef.current = null;
        }
        pendingViewportRef.current = null;
        lastSavedViewportRef.current = null;
    }, [boardId, clearContentSaveTimers]);

    useEffect(() => {
        const handleEmergencySave = () => {
            const tracker = trackerRef.current;
            // 只有当存在有效更改且处于尚未保存状态时才执行抢救
            if (boardId && tracker.isPrimed && tracker.revision > tracker.savedRevision && !isBoardLoadingRef.current) {
                clearContentSaveTimers();
                
                // 本地同步执行
                void performSave(latestBoardDataRef.current, {
                    isUnmount: true, // 使用 isUnmount 标志区分
                    revision: tracker.revision
                });
                
                // 云端触发（不等待完成）
                if (user) {
                    saveBoardToCloud(user.uid, boardId, buildBoardPayload(latestBoardDataRef.current)).catch(e => {
                        console.error('Emergency cloud save failed', e);
                    });
                }
            }
        };

        window.addEventListener('pagehide', handleEmergencySave);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                handleEmergencySave();
            }
        });

        return () => {
            window.removeEventListener('pagehide', handleEmergencySave);
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
            if (!tracker.isPrimed || tracker.revision <= tracker.savedRevision || !boardId) {
                return;
            }

            void performSave(latestBoardDataRef.current, {
                isUnmount: true,
                revision: tracker.revision
            });
        };
    }, [boardId, user, clearContentSaveTimers, performSave]);

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
