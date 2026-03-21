import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { aiManager } from '../services/ai/AIManager';
import {
    loadBoard,
    loadViewportState,
    setCurrentBoardId as storageSetCurrentBoardId
} from '../services/storage';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings,
    saveBoardInstructionSettingsCache
} from '../services/customInstructionsService';
import { BoardSyncController } from '../services/sync/boardSyncController';
import { isSampleBoardId } from '../services/sync/config';
import {
    createBoardSnapshotFingerprint,
    normalizeBoardSnapshot
} from '../services/sync/boardSnapshot';
import { buildBoardCursorTrace, logPersistenceTrace } from '../utils/persistenceTrace';
import { runtimeLog } from '../utils/runtimeLogging';

const STREAMING_SYNC_DEBOUNCE_MS = 700;

export function useBoardRuntimeSync({
    currentBoardId,
    user,
    cards,
    connections,
    groups,
    boardPrompts,
    boardInstructionSettings,
    activeBoardPersistence,
    generatingCardIds,
    isBoardLoading,
    setCards,
    setConnections,
    setGroups,
    setBoardPrompts,
    setBoardInstructionSettings,
    setActiveBoardPersistence
}) {
    const boardSyncControllerRef = useRef(null);
    const boardSyncDebounceTimerRef = useRef(null);

    const applyBoardSnapshotToStore = useCallback((snapshot, options = {}) => {
        const normalized = normalizeBoardSnapshot(snapshot);
        const patch = {
            cards: normalized.cards,
            connections: normalized.connections,
            groups: normalized.groups,
            boardPrompts: normalized.boardPrompts,
            boardInstructionSettings: normalizeBoardInstructionSettings(
                normalized.boardInstructionSettings
            ),
            lastSavedAt: normalized.updatedAt || 0,
            activeBoardPersistence: {
                updatedAt: normalized.updatedAt || 0,
                clientRevision: normalized.clientRevision || 0,
                dirty: false
            }
        };

        if (options.source === 'remote_sync' && options.boardId) {
            const token = (useStore.getState().lastExternalSyncMarker?.token || 0) + 1;
            patch.lastExternalSyncMarker = {
                token,
                boardId: options.boardId,
                fingerprint: createBoardSnapshotFingerprint(normalized),
                updatedAt: normalized.updatedAt || 0,
                clientRevision: normalized.clientRevision || 0
            };
        }

        useStore.setState(patch);
        useStore.getState().rebuildCardLookup?.(normalized.cards);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const load = async () => {
            if (!currentBoardId) return;

            if (boardSyncControllerRef.current) {
                await boardSyncControllerRef.current.stop();
                boardSyncControllerRef.current = null;
            }
            if (boardSyncDebounceTimerRef.current) {
                clearTimeout(boardSyncDebounceTimerRef.current);
                boardSyncDebounceTimerRef.current = null;
            }

            const storeState = useStore.getState();
            const activeCardIds = (storeState.cards || []).map((card) => card?.id).filter(Boolean);
            activeCardIds.forEach((cardId) => {
                aiManager.cancelByTags([`card:${cardId}`]);
            });

            storeState.clearStreamingState?.();
            storeState.setGeneratingCardIds?.(new Set());
            storeState.setIsBoardLoading(true);
            setCards([]);
            setConnections([]);
            setGroups([]);
            setBoardPrompts([]);
            setBoardInstructionSettings(normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS));
            setActiveBoardPersistence({ updatedAt: 0, clientRevision: 0, dirty: false });

            try {
                const data = await loadBoard(currentBoardId);
                logPersistenceTrace('app:load-board-finished', {
                    boardId: currentBoardId,
                    cursor: buildBoardCursorTrace(data)
                });

                if (isCancelled) {
                    runtimeLog(`[Board] Load cancelled: user navigated away from ${currentBoardId}`);
                    return;
                }

                applyBoardSnapshotToStore(data, {
                    source: 'local_load',
                    boardId: currentBoardId
                });
                saveBoardInstructionSettingsCache(
                    currentBoardId,
                    normalizeBoardInstructionSettings(data.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS)
                );
                storageSetCurrentBoardId(currentBoardId);

                const viewport = loadViewportState(currentBoardId);
                useStore.getState().restoreViewport(viewport);

                if (user?.uid && !isSampleBoardId(currentBoardId)) {
                    const syncController = new BoardSyncController({
                        boardId: currentBoardId,
                        user,
                        onSnapshot: (nextSnapshot) => {
                            if (isCancelled) return;
                            applyBoardSnapshotToStore(nextSnapshot, {
                                source: 'remote_sync',
                                boardId: currentBoardId
                            });
                        },
                        onSyncStateChange: () => { }
                    });

                    boardSyncControllerRef.current = syncController;
                    await syncController.start(data);
                }
            } catch (error) {
                console.error(`[Board] Failed to load board ${currentBoardId}:`, error);
            } finally {
                if (!isCancelled) {
                    useStore.getState().setIsBoardLoading(false);
                }
            }
        };

        void load();

        return () => {
            isCancelled = true;
            if (boardSyncControllerRef.current && boardSyncControllerRef.current.boardId === currentBoardId) {
                void boardSyncControllerRef.current.stop();
                boardSyncControllerRef.current = null;
            }
            if (boardSyncDebounceTimerRef.current) {
                clearTimeout(boardSyncDebounceTimerRef.current);
                boardSyncDebounceTimerRef.current = null;
            }
        };
    }, [
        applyBoardSnapshotToStore,
        currentBoardId,
        setActiveBoardPersistence,
        setBoardInstructionSettings,
        setBoardPrompts,
        setCards,
        setConnections,
        setGroups,
        user
    ]);

    const currentBoardSnapshot = useMemo(() => normalizeBoardSnapshot({
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings,
        updatedAt: activeBoardPersistence?.updatedAt || 0,
        clientRevision: activeBoardPersistence?.clientRevision || 0
    }), [
        activeBoardPersistence?.clientRevision,
        activeBoardPersistence?.updatedAt,
        boardInstructionSettings,
        boardPrompts,
        cards,
        connections,
        groups
    ]);

    useEffect(() => {
        const controller = boardSyncControllerRef.current;
        if (!controller || !currentBoardId || isBoardLoading) return;

        if (generatingCardIds?.size > 0) {
            if (boardSyncDebounceTimerRef.current) {
                clearTimeout(boardSyncDebounceTimerRef.current);
            }
            boardSyncDebounceTimerRef.current = setTimeout(() => {
                boardSyncDebounceTimerRef.current = null;
                const activeController = boardSyncControllerRef.current;
                if (!activeController || activeController.boardId !== currentBoardId) return;
                activeController.applyLocalSnapshot(currentBoardSnapshot);
            }, STREAMING_SYNC_DEBOUNCE_MS);
            return;
        }

        if (boardSyncDebounceTimerRef.current) {
            clearTimeout(boardSyncDebounceTimerRef.current);
            boardSyncDebounceTimerRef.current = null;
        }

        controller.applyLocalSnapshot(currentBoardSnapshot);
    }, [currentBoardId, currentBoardSnapshot, generatingCardIds?.size, isBoardLoading]);

    useEffect(() => {
        return () => {
            if (boardSyncDebounceTimerRef.current) {
                clearTimeout(boardSyncDebounceTimerRef.current);
                boardSyncDebounceTimerRef.current = null;
            }
        };
    }, []);
}
