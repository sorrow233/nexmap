import { useCallback, useEffect, useRef } from 'react';
import { saveBoard, saveBoardToCloud, saveViewportState } from '../services/storage';
import { debugLog } from '../utils/debugLogger';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../services/customInstructionsService';

const createSaveTracker = (boardId) => ({
    boardId,
    revision: 0,
    savedRevision: 0,
    isPrimed: false,
    hasSeenLoading: false
});

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

    useEffect(() => {
        trackerRef.current = createSaveTracker(boardId);
    }, [boardId]);

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

    useEffect(() => {
        if (!boardId) return;
        if (isBoardLoading) return;
        if (isHydratingFromCloud) return;
        if (isReadOnly) return;

        const tracker = trackerRef.current;
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

        const saveTimeout = setTimeout(() => {
            void performSave(snapshot, { revision });
        }, 1000);

        let cloudTimeout = null;
        if (user) {
            cloudTimeout = setTimeout(async () => {
                setCloudSyncStatus('syncing');
                try {
                    await saveBoardToCloud(user.uid, boardId, buildBoardPayload(snapshot));
                    setCloudSyncStatus('synced');

                    const trackerForCloud = trackerRef.current;
                    if (trackerForCloud.boardId === boardId) {
                        trackerForCloud.savedRevision = Math.max(trackerForCloud.savedRevision, revision);
                    }

                    debugLog.sync(`Cloud autosave complete for board: ${boardId}`);
                } catch (error) {
                    setCloudSyncStatus('error');
                    console.error('[BoardPersistence] Cloud sync failed:', error);
                    toast?.error?.('云同步失败');
                }
            }, 30000);
        }

        return () => {
            clearTimeout(saveTimeout);
            if (cloudTimeout) clearTimeout(cloudTimeout);
        };
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
        performSave,
        setCloudSyncStatus,
        toast
    ]);

    useEffect(() => {
        return () => {
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
    }, [boardId, performSave]);

    useEffect(() => {
        if (!boardId || isBoardLoading) return;

        const timer = setTimeout(() => {
            saveViewportState(boardId, { offset, scale });
        }, 120);

        return () => clearTimeout(timer);
    }, [boardId, offset, scale, isBoardLoading]);
}
