import React, { useEffect, useState, Suspense, useCallback, useRef, useMemo } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppInit } from './hooks/useAppInit';
import { useStore } from './store/useStore';
import { nextCardIndexMutation } from './store/slices/utils/cardIndexMutation';
import { useCardCreator } from './hooks/useCardCreator';
import Loading from './components/Loading';
import { ToastProvider } from './components/Toast';
import { ContextMenuProvider } from './components/ContextMenu';
import IPadInstallPrompt from './components/pwa/IPadInstallPrompt';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { useSearchShortcut } from './hooks/useSearchShortcut';
import { useBuildVersionRefresh } from './hooks/useBuildVersionRefresh';
import { useBackgroundBoardAutoGeneration } from './hooks/useBackgroundBoardAutoGeneration';
import { buildBoardCursorTrace, logPersistenceTrace } from './utils/persistenceTrace';
import { runtimeLog, runtimeWarn } from './utils/runtimeLogging';
import { aiManager } from './services/ai/AIManager';

// Lazy Load Pages
const GalleryPage = lazyWithRetry(() => import('./pages/GalleryPage'));
const BoardPage = lazyWithRetry(() => import('./pages/BoardPage'));
const LandingPage = lazyWithRetry(() => import('./modules/landing'));
const FreeTrialPage = lazyWithRetry(() => import('./pages/FreeTrialPage'));
const FeedbackPage = lazyWithRetry(() => import('./pages/FeedbackPage'));
const PricingPage = lazyWithRetry(() => import('./pages/PricingPage'));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage'));
const HistoryPage = lazyWithRetry(() => import('./pages/HistoryPage'));
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));
const SearchModal = lazyWithRetry(() => import('./components/SearchModal'));


import { Tokushoho, Privacy, Terms } from './pages/legal/LegalPages';

import ModernDialog from './components/ModernDialog';
import {
    createBoard,
    saveBoard,
    loadBoard,
    deleteBoard, // This is now soft delete
    permanentlyDeleteBoard,
    restoreBoard,
    updateBoardMetadata,
    setCurrentBoardId as storageSetCurrentBoardId,
    getBoardsList,
    loadViewportState,
    loadBoardDataForSearch
} from './services/storage';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings,
    saveBoardInstructionSettingsCache
} from './services/customInstructionsService';
import {
    buildBoardTitleUpdatePatch,
    hasBoardTitleMetadataPatch,
    normalizeBoardTitleMeta,
    pickBoardTitleMetadata
} from './services/boardTitle/metadata';
import { loadBoardsSearchData } from './services/search/searchDataLoader';
import { BoardSyncController } from './services/sync/boardSyncController';
import {
    FIREBASE_SYNC_LIMITS,
    isSampleBoardId
} from './services/sync/config';
import {
    loadRemoteBoardMetadataList,
    mergeBoardMetadataLists,
    syncBoardMetadataListToRemote
} from './services/sync/boardMetadataSync';
import {
    createBoardSnapshotFingerprint,
    normalizeBoardSnapshot
} from './services/sync/boardSnapshot';
import { hasBoardDisplayMetadataPatch } from './services/boardTitle/displayMetadata';
import { persistBoardDisplayMetadataSnapshot } from './services/boardPersistence/boardDisplayMetadataStorage';
import { persistBoardsMetadataList } from './services/boardPersistence/boardsListStorage';
import { getSyncDeviceId } from './services/sync/deviceId';
import { repairRemoteBoardSnapshotIfLocalNewer } from './services/sync/remoteBoardSnapshotRepair';

export default function App() {
    return (
        <ToastProvider>
            <ContextMenuProvider>
                <ErrorBoundary>
                    <AppContent />
                </ErrorBoundary>
            </ContextMenuProvider>
        </ToastProvider>
    );
}

const SESSION_START_TIME = Date.now();
const SEARCH_DATA_FLUSH_DELAY_MS = 80;
const REMOTE_METADATA_RETRY_MS = 5000;
const STREAMING_SYNC_DEBOUNCE_MS = 700;
const sanitizeBoardMetadataPatch = (metadata = {}) => Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
);

const isBoardMetadataValueEqual = (left, right) => {
    if (left === right) return true;
    if ((left == null) || (right == null)) {
        return left == null && right == null;
    }

    if (typeof left === 'object' || typeof right === 'object') {
        try {
            return JSON.stringify(left) === JSON.stringify(right);
        } catch (error) {
            console.warn('[BoardMetadata] Failed to compare metadata value:', error);
            return false;
        }
    }

    return false;
};

const hasMeaningfulBoardMetadataChange = (board, metadata = {}) => Object.keys(metadata).some((key) => (
    !isBoardMetadataValueEqual(board?.[key], metadata[key])
));

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        user,
        boardsList,
        setBoardsList,
        isInitialized,
        hasHydratedLocalBoardsMetadata
    } = useAppInit();
    const cards = useStore(state => state.cards);
    const connections = useStore(state => state.connections);
    const groups = useStore(state => state.groups);
    const boardPrompts = useStore(state => state.boardPrompts);
    const boardInstructionSettings = useStore(state => state.boardInstructionSettings);
    const setCards = useStore(state => state.setCards);
    const setConnections = useStore(state => state.setConnections);
    const setGroups = useStore(state => state.setGroups);
    const setBoardPrompts = useStore(state => state.setBoardPrompts);
    const setBoardInstructionSettings = useStore(state => state.setBoardInstructionSettings);
    const setLastSavedAt = useStore(state => state.setLastSavedAt);
    const setActiveBoardPersistence = useStore(state => state.setActiveBoardPersistence);
    const setExternalSyncMarker = useStore(state => state.setExternalSyncMarker);
    const activeBoardPersistence = useStore(state => state.activeBoardPersistence);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const isBoardLoading = useStore(state => state.isBoardLoading);
    const { createCardWithText } = useCardCreator();
    const boardSyncControllerRef = useRef(null);
    const boardSyncDebounceTimerRef = useRef(null);
    const metadataSyncTimerRef = useRef(null);
    const metadataHydrationRetryTimerRef = useRef(null);
    const currentBoardRepairKeyRef = useRef('');
    const [hasHydratedRemoteBoards, setHasHydratedRemoteBoards] = useState(false);

    // Dialog State
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    // Search Modal State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [allBoardsData, setAllBoardsData] = useState({});
    const [searchLoadState, setSearchLoadState] = useState({
        isLoading: false,
        loadedCount: 0,
        totalCount: 0
    });
    const allBoardsDataRef = useRef(allBoardsData);
    const searchLoadTokenRef = useRef(0);
    const searchBufferedDataRef = useRef({});
    const searchFlushTimerRef = useRef(null);
    const boardsListRef = useRef(boardsList);

    useBuildVersionRefresh();

    // Cmd+K shortcut for search
    useSearchShortcut(useCallback(() => setIsSearchOpen(true), []));

    useEffect(() => {
        allBoardsDataRef.current = allBoardsData;
    }, [allBoardsData]);

    useEffect(() => {
        boardsListRef.current = boardsList;
    }, [boardsList]);

    const applyBoardSnapshotToStore = useCallback((snapshot, options = {}) => {
        const normalized = normalizeBoardSnapshot(snapshot);
        const currentCardIndexMutation = useStore.getState().cardIndexMutation;

        // Build the merged state patch — single zustand set() to avoid N separate renders.
        // In async callbacks (IDB / Firebase), React 18 automatic batching does NOT cover
        // zustand set() calls, so each independent set triggers a full render pass.
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
            },
            cardIndexMutation: nextCardIndexMutation(currentCardIndexMutation, {
                mode: 'bulk',
                reason: `applyBoardSnapshotToStore:${options.source || 'unknown'}`
            })
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

        // Single atomic zustand update — triggers exactly ONE render pass.
        useStore.setState(patch);

        // Rebuild card lookup cache outside of set() so it stays consistent.
        useStore.getState().rebuildCardLookup?.(normalized.cards);
    }, []);

    const flushSearchDataBuffer = useCallback(() => {
        const pendingChunk = searchBufferedDataRef.current;
        if (Object.keys(pendingChunk).length === 0) return;

        searchBufferedDataRef.current = {};
        setAllBoardsData(prev => ({ ...prev, ...pendingChunk }));
    }, []);

    const queueSearchDataChunk = useCallback((boardId, data) => {
        searchBufferedDataRef.current[boardId] = data;
        if (searchFlushTimerRef.current) return;

        searchFlushTimerRef.current = setTimeout(() => {
            searchFlushTimerRef.current = null;
            flushSearchDataBuffer();
        }, SEARCH_DATA_FLUSH_DELAY_MS);
    }, [flushSearchDataBuffer]);

    useEffect(() => {
        return () => {
            if (searchFlushTimerRef.current) {
                clearTimeout(searchFlushTimerRef.current);
                searchFlushTimerRef.current = null;
            }
            if (boardSyncDebounceTimerRef.current) {
                clearTimeout(boardSyncDebounceTimerRef.current);
                boardSyncDebounceTimerRef.current = null;
            }
            flushSearchDataBuffer();
        };
    }, [flushSearchDataBuffer]);

    useEffect(() => {
        let cancelled = false;
        setHasHydratedRemoteBoards(false);
        if (metadataHydrationRetryTimerRef.current) {
            clearTimeout(metadataHydrationRetryTimerRef.current);
            metadataHydrationRetryTimerRef.current = null;
        }

        if (!user?.uid) {
            return () => {
                cancelled = true;
                if (metadataHydrationRetryTimerRef.current) {
                    clearTimeout(metadataHydrationRetryTimerRef.current);
                    metadataHydrationRetryTimerRef.current = null;
                }
            };
        }

        const hydrateRemoteBoards = async () => {
            try {
                const remoteBoards = await loadRemoteBoardMetadataList(user.uid);
                if (cancelled) return;

                setBoardsList((prev) => {
                    const merged = mergeBoardMetadataLists(prev, remoteBoards);
                    if (merged.length > 0) {
                        persistBoardsMetadataList(merged, { reason: 'firebase_sync:hydrate_remote_metadata' });
                    }
                    return merged.length > 0 ? merged : prev;
                });
                setHasHydratedRemoteBoards(true);
            } catch (error) {
                if (cancelled) return;
                console.error('[FirebaseSync] Failed to hydrate remote boards metadata:', error);
                setHasHydratedRemoteBoards(false);
                metadataHydrationRetryTimerRef.current = setTimeout(() => {
                    metadataHydrationRetryTimerRef.current = null;
                    if (!cancelled) {
                        void hydrateRemoteBoards();
                    }
                }, REMOTE_METADATA_RETRY_MS);
            }
        };

        void hydrateRemoteBoards();

        return () => {
            cancelled = true;
            if (metadataHydrationRetryTimerRef.current) {
                clearTimeout(metadataHydrationRetryTimerRef.current);
                metadataHydrationRetryTimerRef.current = null;
            }
        };
    }, [user?.uid, setBoardsList]);

    useEffect(() => {
        if (!user?.uid || !hasHydratedRemoteBoards) return undefined;

        if (metadataSyncTimerRef.current) {
            clearTimeout(metadataSyncTimerRef.current);
        }

        metadataSyncTimerRef.current = setTimeout(() => {
            void syncBoardMetadataListToRemote(user.uid, boardsList).catch((error) => {
                console.error('[FirebaseSync] Failed to sync boards metadata:', error);
            });
        }, FIREBASE_SYNC_LIMITS.metadataSyncDebounceMs);

        return () => {
            if (metadataSyncTimerRef.current) {
                clearTimeout(metadataSyncTimerRef.current);
                metadataSyncTimerRef.current = null;
            }
        };
    }, [boardsList, hasHydratedRemoteBoards, user?.uid]);

    useEffect(() => {
        if (!isSearchOpen) return;

        const existingBoardIds = new Set(
            boardsList
                .filter(board => Object.prototype.hasOwnProperty.call(allBoardsDataRef.current, board.id))
                .map(board => board.id)
        );
        const totalCount = boardsList.length;
        const missingCount = boardsList.filter(board => (
            board?.id && !existingBoardIds.has(board.id)
        )).length;

        if (missingCount === 0) {
            setSearchLoadState({
                isLoading: false,
                loadedCount: existingBoardIds.size,
                totalCount
            });
            return;
        }

        const loadToken = searchLoadTokenRef.current + 1;
        searchLoadTokenRef.current = loadToken;
        let loadedDelta = 0;

        setSearchLoadState({
            isLoading: true,
            loadedCount: existingBoardIds.size,
            totalCount
        });

        void loadBoardsSearchData({
            boards: boardsList,
            loadBoardData: loadBoardDataForSearch,
            existingBoardIds,
            shouldCancel: () => searchLoadTokenRef.current !== loadToken || !isSearchOpen,
            onBoardLoaded: (boardId, data) => {
                if (searchLoadTokenRef.current !== loadToken || !isSearchOpen) return;
                loadedDelta += 1;
                queueSearchDataChunk(boardId, data);
                setSearchLoadState({
                    isLoading: true,
                    loadedCount: existingBoardIds.size + loadedDelta,
                    totalCount
                });
            }
        }).finally(() => {
            if (searchLoadTokenRef.current !== loadToken || !isSearchOpen) return;

            flushSearchDataBuffer();
            setSearchLoadState({
                isLoading: false,
                loadedCount: existingBoardIds.size + loadedDelta,
                totalCount
            });
        });

        return () => {
            if (searchLoadTokenRef.current === loadToken) {
                searchLoadTokenRef.current += 1;
            }
            if (searchFlushTimerRef.current) {
                clearTimeout(searchFlushTimerRef.current);
                searchFlushTimerRef.current = null;
            }
            flushSearchDataBuffer();
        };
    }, [isSearchOpen, boardsList, queueSearchDataChunk, flushSearchDataBuffer]);

    const showDialog = (title, message, type = 'info', onConfirm = () => { }) => {
        setDialog({ isOpen: true, title, message, type, onConfirm });
    };

    // Board Management Handlers
    const handleLogin = useCallback(async () => {
        try {
            runtimeLog('[Auth] handleLogin initiated');
            await signInWithPopup(auth, googleProvider);
        }
        catch (e) {
            console.error('[Auth] Login failed:', e);
            showDialog("Login Failed", e.message, "error");
        }
    }, [showDialog]);

    const handleLogout = useCallback((intent = 'manual') => {
        console.group('[Logout Trace]');
        runtimeLog(`[Logout] handleLogout called with intent: ${intent}`);
        console.trace('[Logout] Caller detail:');

        // SAFETY LOCK: Block any automatic logout in first 15 seconds unless manual
        const timeSinceLoad = (Date.now() - SESSION_START_TIME) / 1000;
        if (timeSinceLoad < 15 && intent !== 'manual_user_click') {
            runtimeWarn(`[Logout] ABORTED: Session too fresh (${timeSinceLoad.toFixed(1)}s) and intent is ${intent}`);
            console.groupEnd();
            return;
        }

        setIsLogoutConfirmOpen(true);
        console.groupEnd();
    }, []);

    const performActualLogout = useCallback(async () => {
        try {
            const timeSinceLoad = (Date.now() - SESSION_START_TIME) / 1000;
            runtimeLog(`[Logout] performActualLogout verified at ${timeSinceLoad.toFixed(1)}s`);

            // Double check: if user just logged in, this is likely a misclick/bug
            if (user && timeSinceLoad < 30) {
                runtimeWarn('[Logout] DANGER: User is logged in and session is very fresh. Proceeding with caution...');
            }

            runtimeLog('[Logout] User confirmed logout, initiating cleanup...');
            const { clearAllUserData } = await import('./services/clearAllUserData');
            await clearAllUserData();
            await signOut(auth);
            setIsLogoutConfirmOpen(false);
        }
        catch (e) {
            console.error('[Logout] Error during cleanup:', e);
            setIsLogoutConfirmOpen(false);
        }
    }, [user]);

    const handleCreateBoard = async (customName = null, initialPrompt = null, initialImages = []) => {
        const normalizedName = typeof customName === 'string' ? customName.trim() : '';
        const newBoard = await createBoard(normalizedName || null);
        setBoardsList(prev => [normalizeBoardTitleMeta(newBoard), ...prev]);

        navigate(`/board/${newBoard.id}`);

        if (initialPrompt || initialImages.length > 0) {
            // Wait for navigation to complete and board to load before creating card
            // The board loading effect runs async after navigation, so we need to wait longer
            setTimeout(() => createCardWithText(initialPrompt, initialImages), 600);
        }
    };

    const handleSelectBoard = async (id) => {
        navigate(`/board/${id}`);
    };

    // We need to listen to board ID changes to load data. 
    const boardMatch = location.pathname.match(/^\/board\/([^/]+)/);
    const currentBoardId = boardMatch ? boardMatch[1] : null;

    useEffect(() => {
        // Use AbortController pattern to handle race conditions
        let isCancelled = false;

        const load = async () => {
            if (currentBoardId) {
                if (boardSyncControllerRef.current) {
                    await boardSyncControllerRef.current.stop();
                    boardSyncControllerRef.current = null;
                }
                if (boardSyncDebounceTimerRef.current) {
                    clearTimeout(boardSyncDebounceTimerRef.current);
                    boardSyncDebounceTimerRef.current = null;
                }

                // 1. Start loading state & clear existing data to prevent bleed-over
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
                    // 2. Load new data
                    const data = await loadBoard(currentBoardId);
                    logPersistenceTrace('app:load-board-finished', {
                        boardId: currentBoardId,
                        cursor: buildBoardCursorTrace(data)
                    });

                    // CRITICAL: Check if user has navigated away during load
                    // If so, discard this result to prevent data bleed-over
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

                    // 3. Restore viewport state
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

                        const currentBoardMeta = boardsListRef.current.find((board) => board.id === currentBoardId);
                        const expectedCardCount = Number(currentBoardMeta?.cardCount) || 0;
                        const repairKey = `${currentBoardId}:${data?.updatedAt || 0}:${data?.clientRevision || 0}:${expectedCardCount}`;

                        if (currentBoardRepairKeyRef.current !== repairKey) {
                            currentBoardRepairKeyRef.current = repairKey;

                            setTimeout(() => {
                                if (isCancelled) return;

                                void repairRemoteBoardSnapshotIfLocalNewer({
                                    userId: user.uid,
                                    boardId: currentBoardId,
                                    deviceId: getSyncDeviceId(),
                                    localSnapshot: data,
                                    expectedCardCount
                                }).catch((error) => {
                                    console.error('[RemoteSnapshotRepair] Failed to repair current board snapshot:', {
                                        boardId: currentBoardId,
                                        error
                                    });
                                });
                            }, 1200);
                        }
                    }
                } catch (error) {
                    console.error(`[Board] Failed to load board ${currentBoardId}:`, error);
                } finally {
                    // 4. End loading state only if not cancelled
                    if (!isCancelled) {
                        useStore.getState().setIsBoardLoading(false);
                    }
                }
            }
        };
        load();

        // Cleanup function - mark as cancelled if effect re-runs
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
        setLastSavedAt,
        user
    ]); // Rely on currentBoardId changing

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

    // Soft Delete (Move to Trash)
    const handleSoftDeleteBoard = async (id) => {
        await deleteBoard(id); // Local soft delete

        // Update state to reflect change (filter out moved item? No, just update its status)
        // or just re-fetch? easiest is to update local list state
        setBoardsList(prev => prev.map(b => b.id === id ? normalizeBoardTitleMeta({ ...b, deletedAt: Date.now() }) : b));

        // Optional: Show a subtle toast or message via some UI mechanism (skipped for now as per minimal App requirement, GalleryPage can handle toast)
    };

    // Restore from Trash
    const handleRestoreBoard = async (id) => {
        await restoreBoard(id);
        setBoardsList(prev => prev.map(b => b.id === id ? normalizeBoardTitleMeta({ ...b, deletedAt: null }) : b));
    };

    // Permanent Delete
    const handlePermanentDeleteBoard = async (id) => {
        showDialog(
            "Permanently Delete?",
            "This will permanently delete this board and cannot be undone.",
            "confirm",
            async () => {
                await permanentlyDeleteBoard(id);
                setBoardsList(prev => prev.filter(b => b.id !== id));
            }
        );
    };

    const handleBackToGallery = useCallback(async () => {
        if (currentBoardId && isBoardLoading) {
            runtimeWarn(`[Board] Skip direct leave-save while loading board ${currentBoardId} to avoid overwriting with transient state`);
        }

        // Leaving a board should rely on the persistence hook's latest in-memory snapshot.
        // Directly saving here is risky because route transitions can temporarily expose
        // partially-reset store state and overwrite real board content with an empty payload.
        navigate('/gallery');
    }, [currentBoardId, isBoardLoading, navigate]);

    const handleUpdateBoardMetadata = useCallback(async (boardId, metadata) => {
        if (!boardId || !metadata || typeof metadata !== 'object') return;

        const currentBoard = boardsListRef.current.find(board => board.id === boardId);
        let nextMetadata = sanitizeBoardMetadataPatch(metadata);

        if (Object.keys(nextMetadata).length === 0) {
            return;
        }

        if (hasBoardTitleMetadataPatch(nextMetadata)) {
            nextMetadata = sanitizeBoardMetadataPatch({
                ...nextMetadata,
                ...pickBoardTitleMetadata({
                    ...(currentBoard || {}),
                    ...nextMetadata
                })
            });
        }

        if (!hasMeaningfulBoardMetadataChange(currentBoard, nextMetadata)) {
            return;
        }

        updateBoardMetadata(boardId, nextMetadata);

        setBoardsList((prev) => {
            const nextBoards = prev.map((board) => (
                board.id === boardId
                    ? normalizeBoardTitleMeta({ ...board, ...nextMetadata })
                    : board
            ));
            boardsListRef.current = nextBoards;
            return nextBoards;
        });

        if (hasBoardDisplayMetadataPatch(nextMetadata)) {
            await persistBoardDisplayMetadataSnapshot(boardId, nextMetadata);
        }

    }, [setBoardsList]);

    const handleUpdateBoardTitle = useCallback(async (newTitle) => {
        if (!currentBoardId) return;

        const currentBoard = boardsList.find(board => board.id === currentBoardId);
        const nextPatch = buildBoardTitleUpdatePatch(currentBoard, newTitle);
        const currentTitleMetadata = currentBoard ? pickBoardTitleMetadata(currentBoard) : null;

        if (currentTitleMetadata &&
            currentTitleMetadata.name === nextPatch.name &&
            currentTitleMetadata.nameSource === nextPatch.nameSource &&
            currentTitleMetadata.autoTitle === (nextPatch.autoTitle ?? currentTitleMetadata.autoTitle) &&
            currentTitleMetadata.autoTitleGeneratedAt === (nextPatch.autoTitleGeneratedAt ?? currentTitleMetadata.autoTitleGeneratedAt)
        ) {
            return;
        }

        await handleUpdateBoardMetadata(currentBoardId, nextPatch);
    }, [boardsList, currentBoardId, handleUpdateBoardMetadata]);

    useBackgroundBoardAutoGeneration({
        boardsList,
        onUpdateBoardMetadata: handleUpdateBoardMetadata,
        enabled: true,
        metadataReady: hasHydratedLocalBoardsMetadata && (!user?.uid || hasHydratedRemoteBoards),
        routeAllowsBackgroundWork: location.pathname.startsWith('/gallery')
    });

    if (!isInitialized) return null;

    return (
        <>
            <Suspense fallback={<Loading message="Initializing MixBoard..." />}>
                <Routes>
                    <Route path="/" element={user ? <Navigate to="/gallery" replace /> : <LandingPage />} />
                    <Route path="/intro" element={<LandingPage />} />
                    <Route path="/free-trial" element={<FreeTrialPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/history" element={<HistoryPage />} />

                    {/* Legal Routes */}
                    <Route path="/legal/tokushoho" element={<Tokushoho />} />
                    <Route path="/legal/privacy" element={<Privacy />} />
                    <Route path="/legal/terms" element={<Terms />} />

                    {/* Pricing */}
                    <Route path="/pricing" element={<PricingPage />} />

                    {/* Admin (Hidden) */}
                    <Route path="/admin" element={<AdminPage />} />

                    <Route path="/gallery/*" element={
                        <GalleryPage
                            boardsList={boardsList}
                            onCreateBoard={handleCreateBoard}
                            onSelectBoard={handleSelectBoard}
                            onDeleteBoard={handleSoftDeleteBoard} // Default "delete" action is soft
                            onRestoreBoard={handleRestoreBoard}
                            onPermanentlyDeleteBoard={handlePermanentDeleteBoard}
                            onUpdateBoardMetadata={handleUpdateBoardMetadata}
                            user={user}
                            onLogin={handleLogin}
                            onLogout={handleLogout}
                        />
                    } />
                    <Route path="/board/:id" element={
                        <BoardPage
                            user={user}
                            boardsList={boardsList}
                            onUpdateBoardTitle={handleUpdateBoardTitle}
                            onUpdateBoardMetadata={handleUpdateBoardMetadata}
                            onBack={handleBackToGallery}
                        />
                    } />
                    <Route path="/board/:id/note/:noteId" element={
                        <BoardPage
                            user={user}
                            boardsList={boardsList}
                            onUpdateBoardTitle={handleUpdateBoardTitle}
                            onUpdateBoardMetadata={handleUpdateBoardMetadata}
                            onBack={handleBackToGallery}
                        />
                    } />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>

            <ModernDialog
                isOpen={dialog.isOpen}
                onClose={() => setDialog({ ...dialog, isOpen: false })}
                onConfirm={dialog.onConfirm}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
            />

            {/* Global Search Modal */}
            {isSearchOpen && (
                <Suspense fallback={null}>
                    <SearchModal
                        isOpen={isSearchOpen}
                        onClose={() => setIsSearchOpen(false)}
                        boardsList={boardsList}
                        allBoardsData={allBoardsData}
                        searchLoadState={searchLoadState}
                    />
                </Suspense>
            )}

            {/* Logout Confirmation Dialog */}
            <ModernDialog
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={performActualLogout}
                title="Sign Out?"
                message="Are you sure you want to sign out? This will clear local data on this device for security."
                type="confirm"
            />

            <IPadInstallPrompt />
        </>
    );
}

if (typeof window !== 'undefined') window.App = App;
