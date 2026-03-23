import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppInit } from './hooks/useAppInit';
import { useStore } from './store/useStore';
import { nextCardIndexMutation } from './store/slices/utils/cardIndexMutation';
import { useCardCreator } from './hooks/useCardCreator';
import Loading from './components/Loading';
import { ToastProvider, useToast } from './components/Toast';
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
    FIREBASE_SYNC_ORIGINS,
    FIREBASE_SYNC_LIMITS,
    isSampleBoardId
} from './services/sync/config';
import {
    loadRemoteBoardMetadataList,
    mergeBoardMetadataLists,
    syncBoardMetadataListToRemote
} from './services/sync/boardMetadataSync';
import { normalizeBoardSnapshot } from './services/sync/boardSnapshot';
import { hasBoardDisplayMetadataPatch } from './services/boardTitle/displayMetadata';
import {
    persistBoardDisplayMetadataSnapshot,
    prepareBoardDisplayMetadataPatch
} from './services/boardPersistence/boardDisplayMetadataStorage';
import { persistBoardsMetadataList } from './services/boardPersistence/boardsListStorage';
import {
    createBoardChangeState,
    syncBoardChangeStateToCursor
} from './store/slices/utils/boardChangeState';
import { buildBoardChangeIntegrityHash } from './store/slices/utils/boardChangeIntegrity';
import {
    subscribeLocalSaveConfirmed
} from './services/sync/localPersistedBoardSyncBridge';
import { pickBoardSyncMetadata } from './services/sync/boardSyncMetadata';
import {
    registerActiveBoardRuntime,
    withBoardRuntimeStoreWriteScope,
    unregisterActiveBoardRuntime
} from './services/sync/boardRuntimeAuthority';

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
const sanitizeBoardMetadataPatch = (metadata = {}) => Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
);

const getActiveCardCount = (cards = []) => (
    Array.isArray(cards)
        ? cards.filter((card) => card && !card.deletedAt).length
        : 0
);

const resolveRuntimeCardsChangeType = (previousCards = [], nextCards = []) => {
    const previousActiveCount = getActiveCardCount(previousCards);
    const nextActiveCount = getActiveCardCount(nextCards);
    if (nextActiveCount > previousActiveCount) return 'card_add';
    if (nextActiveCount < previousActiveCount) return 'card_delete';

    const previousById = new Map(previousCards.map((card) => [card.id, card]));
    for (const nextCard of nextCards) {
        const previousCard = previousById.get(nextCard.id);
        if (!previousCard) {
            return 'card_add';
        }

        if ((previousCard.x || 0) !== (nextCard.x || 0) || (previousCard.y || 0) !== (nextCard.y || 0)) {
            return 'card_move';
        }
    }

    return 'card_content';
};

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
    const boardMatch = location.pathname.match(/^\/board\/([^/]+)/);
    const currentBoardId = boardMatch ? boardMatch[1] : null;
    const toast = useToast();
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
    const activeBoardPersistence = useStore(state => state.activeBoardPersistence);
    const boardChangeState = useStore(state => state.boardChangeState);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const isBoardLoading = useStore(state => state.isBoardLoading);
    const { createCardWithText } = useCardCreator();
    const boardSyncControllerRef = useRef(null);
    const metadataSyncTimerRef = useRef(null);
    const metadataHydrationRetryTimerRef = useRef(null);
    const [hasHydratedRemoteBoards, setHasHydratedRemoteBoards] = useState(false);

    // Dialog State
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [forceSyncingBoardId, setForceSyncingBoardId] = useState(null);

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

    useEffect(() => {
        const controller = boardSyncControllerRef.current;
        if (!controller || controller.boardId !== currentBoardId) {
            return;
        }

        const hasGeneratingCards = (generatingCardIds?.size || 0) > 0;
        controller.setFirestoreUploadPaused(
            hasGeneratingCards,
            hasGeneratingCards ? 'ai_generation_pause' : 'ai_generation_complete'
        );
    }, [currentBoardId, generatingCardIds]);

    const syncBoardSnapshotMetadataIntoList = useCallback((boardId, snapshot) => {
        if (!boardId || !snapshot) return;

        const nextMetadata = pickBoardSyncMetadata(snapshot);
        setBoardsList((prev) => {
            let didChange = false;
            const nextBoards = prev.map((board) => {
                if (board.id !== boardId) return board;

                if (
                    (Number(board.updatedAt) || 0) === nextMetadata.updatedAt &&
                    (Number(board.clientRevision) || 0) === nextMetadata.clientRevision &&
                    (Number(board.cardCount) || 0) === nextMetadata.cardCount
                ) {
                    return board;
                }

                didChange = true;
                return normalizeBoardTitleMeta({
                    ...board,
                    ...nextMetadata
                });
            });

            if (!didChange) {
                return prev;
            }

            boardsListRef.current = nextBoards;
            return nextBoards;
        });
    }, [setBoardsList]);

    const applyBoardRuntimeViewPatch = useCallback((runtimePatch = {}, metadata = {}, options = {}) => {
        const currentState = useStore.getState();
        const nextCards = Object.prototype.hasOwnProperty.call(runtimePatch, 'cards')
            ? runtimePatch.cards
            : currentState.cards;
        const nextConnections = Object.prototype.hasOwnProperty.call(runtimePatch, 'connections')
            ? runtimePatch.connections
            : currentState.connections;
        const nextGroups = Object.prototype.hasOwnProperty.call(runtimePatch, 'groups')
            ? runtimePatch.groups
            : currentState.groups;
        const nextBoardPrompts = Object.prototype.hasOwnProperty.call(runtimePatch, 'boardPrompts')
            ? runtimePatch.boardPrompts
            : currentState.boardPrompts;
        const nextBoardInstructionSettings = Object.prototype.hasOwnProperty.call(runtimePatch, 'boardInstructionSettings')
            ? normalizeBoardInstructionSettings(runtimePatch.boardInstructionSettings)
            : currentState.boardInstructionSettings;
        const nextUpdatedAt = Number(metadata.updatedAt) || Number(currentState.activeBoardPersistence?.updatedAt) || 0;
        const nextClientRevision = Number(metadata.clientRevision) || Number(currentState.activeBoardPersistence?.clientRevision) || 0;
        const nextSnapshot = normalizeBoardSnapshot({
            cards: nextCards,
            connections: nextConnections,
            groups: nextGroups,
            boardPrompts: nextBoardPrompts,
            boardInstructionSettings: nextBoardInstructionSettings,
            updatedAt: nextUpdatedAt,
            clientRevision: nextClientRevision
        });
        const integrityHash = buildBoardChangeIntegrityHash(nextSnapshot);
        const isRemoteSync = options.source === 'remote_sync';
        const isRuntimeRegister = options.source === 'runtime_register';
        const nextDirtyState = isRemoteSync
            ? currentState.activeBoardPersistence?.dirty === true
            : !isRuntimeRegister;
        let nextBoardChangeState = currentState.boardChangeState;
        if (isRemoteSync || isRuntimeRegister) {
            nextBoardChangeState = syncBoardChangeStateToCursor(
                currentState.boardChangeState,
                nextSnapshot,
                isRemoteSync ? 'sync_apply' : 'local_load',
                {
                    integrityHash,
                    validatedAt: nextUpdatedAt || Date.now()
                }
            );
        } else {
            const nextChangeType = Object.prototype.hasOwnProperty.call(runtimePatch, 'cards')
                ? resolveRuntimeCardsChangeType(currentState.cards, nextCards)
                : (
                    Object.prototype.hasOwnProperty.call(runtimePatch, 'connections')
                        ? 'connection_change'
                        : (
                            Object.prototype.hasOwnProperty.call(runtimePatch, 'groups')
                                ? 'group_change'
                                : (
                                    Object.prototype.hasOwnProperty.call(runtimePatch, 'boardPrompts')
                                        ? 'board_prompt_change'
                                        : 'board_instruction_change'
                                )
                        )
                );
            nextBoardChangeState = syncBoardChangeStateToCursor(
                currentState.boardChangeState,
                nextSnapshot,
                nextChangeType,
                {
                    integrityHash,
                    validatedAt: nextUpdatedAt || Date.now()
                }
            );
        }

        const patch = {
            cards: nextCards,
            connections: nextConnections,
            groups: nextGroups,
            boardPrompts: nextBoardPrompts,
            boardInstructionSettings: nextBoardInstructionSettings,
            activeBoardPersistence: {
                updatedAt: nextUpdatedAt,
                clientRevision: nextClientRevision,
                dirty: nextDirtyState
            },
            boardChangeState: nextBoardChangeState
        };

        if (isRuntimeRegister) {
            patch.lastSavedAt = nextUpdatedAt;
        }

        if (Object.prototype.hasOwnProperty.call(runtimePatch, 'cards')) {
            patch.cardIndexMutation = nextCardIndexMutation(currentState.cardIndexMutation, {
                mode: 'bulk',
                reason: `applyBoardRuntimeViewPatch:${options.source || 'unknown'}`
            });
        }

        if (isRemoteSync) {
            patch.lastRemoteApplyToken = (Number(currentState.lastRemoteApplyToken) || 0) + 1;
        }

        withBoardRuntimeStoreWriteScope('authority_observe', () => {
            useStore.setState(patch);
        });

        if (Object.prototype.hasOwnProperty.call(runtimePatch, 'cards')) {
            useStore.getState().rebuildCardLookup?.(nextCards);
        }

        return nextSnapshot;
    }, []);

    const applyBoardSnapshotToStore = useCallback((snapshot, options = {}) => {
        const normalized = normalizeBoardSnapshot(snapshot);
        const currentCardIndexMutation = useStore.getState().cardIndexMutation;
        const currentBoardChangeState = useStore.getState().boardChangeState;
        const integrityHash = buildBoardChangeIntegrityHash(normalized);

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
            boardChangeState: syncBoardChangeStateToCursor(
                currentBoardChangeState,
                normalized,
                'local_load',
                {
                    integrityHash,
                    validatedAt: normalized.updatedAt || Date.now()
                }
            ),
            cardIndexMutation: nextCardIndexMutation(currentCardIndexMutation, {
                mode: 'bulk',
                reason: `applyBoardSnapshotToStore:${options.source || 'unknown'}`
            })
        };

        // Single atomic zustand update — triggers exactly ONE render pass.
        withBoardRuntimeStoreWriteScope('authority_bootstrap', () => {
            useStore.setState(patch);
        });

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
            flushSearchDataBuffer();
        };
    }, [flushSearchDataBuffer]);

    useEffect(() => {
        const unsubscribe = subscribeLocalSaveConfirmed((payload = {}) => {
            const boardId = typeof payload.boardId === 'string' ? payload.boardId : '';
            const snapshot = payload.snapshot ? normalizeBoardSnapshot(payload.snapshot) : null;

            if (boardId && snapshot) {
                syncBoardSnapshotMetadataIntoList(boardId, snapshot);
            }
        });

        return () => unsubscribe?.();
    }, [syncBoardSnapshotMetadataIntoList]);

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

    useEffect(() => {
        // Use AbortController pattern to handle race conditions
        let isCancelled = false;

        const load = async () => {
            if (currentBoardId) {
                if (boardSyncControllerRef.current) {
                    unregisterActiveBoardRuntime({
                        boardId: boardSyncControllerRef.current.boardId,
                        controller: boardSyncControllerRef.current
                    });
                    await boardSyncControllerRef.current.stop();
                    boardSyncControllerRef.current = null;
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
                storeState.setBoardChangeState?.(createBoardChangeState());

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
                            onSyncStateChange: () => { }
                        });

                        boardSyncControllerRef.current = syncController;
                        await syncController.start(data);
                        if (syncController.started) {
                            registerActiveBoardRuntime({
                                boardId: currentBoardId,
                                controller: syncController,
                                onViewSync: ({ origin, patch, updatedAt, clientRevision }) => {
                                    if (isCancelled) return;

                                    const metadata = { updatedAt, clientRevision };
                                    if (origin === FIREBASE_SYNC_ORIGINS.firestore) {
                                        const appliedSnapshot = applyBoardRuntimeViewPatch(patch, metadata, {
                                            source: 'remote_sync',
                                            boardId: currentBoardId
                                        });
                                        syncBoardSnapshotMetadataIntoList(currentBoardId, appliedSnapshot);
                                        return;
                                    }

                                    const appliedSnapshot = applyBoardRuntimeViewPatch(patch, metadata, {
                                        source: origin === 'runtime_register' ? 'runtime_register' : 'runtime_sync',
                                        boardId: currentBoardId
                                    });
                                    if (origin === 'runtime_register') {
                                        syncBoardSnapshotMetadataIntoList(currentBoardId, appliedSnapshot);
                                    }
                                }
                            });
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
                unregisterActiveBoardRuntime({
                    boardId: currentBoardId,
                    controller: boardSyncControllerRef.current
                });
                void boardSyncControllerRef.current.stop();
                boardSyncControllerRef.current = null;
            }
        };
    }, [
        applyBoardSnapshotToStore,
        applyBoardRuntimeViewPatch,
        currentBoardId,
        setActiveBoardPersistence,
        setBoardInstructionSettings,
        setBoardPrompts,
        setCards,
        setConnections,
        setGroups,
        setLastSavedAt,
        syncBoardSnapshotMetadataIntoList,
        user
    ]); // Rely on currentBoardId changing

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

    const handleForceSyncBoard = useCallback(() => {
        if (!currentBoardId) return;

        if (isBoardLoading) {
            toast.warning('画布还在加载，请稍后再强制同步');
            return;
        }

        if ((generatingCardIds?.size || 0) > 0) {
            toast.warning('请等待当前回答生成完成后，再强制覆盖所有设备');
            return;
        }

        const controller = boardSyncControllerRef.current;
        if (!controller || controller.boardId !== currentBoardId) {
            toast.error('当前画布的同步控制器还没有准备好');
            return;
        }

        showDialog(
            '强制覆盖所有设备？',
            '将以当前设备上的这张画布为准，重新覆盖远端同步数据。其他设备下次打开或同步这张画布时，会以这份内容为准。请先确认当前设备内容完整无误。',
            'confirm',
            async () => {
                const latestController = boardSyncControllerRef.current;
                if (!latestController || latestController.boardId !== currentBoardId) {
                    toast.error('同步控制器已失效，请重新进入画布后再试');
                    return;
                }

                const currentBoard = boardsListRef.current.find((board) => board.id === currentBoardId);
                const nextUpdatedAt = Date.now();
                const nextClientRevision = Math.max(
                    Number(activeBoardPersistence?.clientRevision) || 0,
                    Number(currentBoard?.clientRevision) || 0
                ) + 1;
                const snapshot = normalizeBoardSnapshot({
                    cards,
                    connections,
                    groups,
                    boardPrompts,
                    boardInstructionSettings,
                    updatedAt: nextUpdatedAt,
                    clientRevision: nextClientRevision
                });

                setForceSyncingBoardId(currentBoardId);
                try {
                    await saveBoard(currentBoardId, snapshot);
                    setLastSavedAt(nextUpdatedAt);
                    setActiveBoardPersistence({
                        updatedAt: nextUpdatedAt,
                        clientRevision: nextClientRevision,
                        dirty: false
                    });
                    setBoardsList(prev => prev.map((board) => {
                        if (board.id !== currentBoardId) return board;
                        return normalizeBoardTitleMeta({
                            ...board,
                            updatedAt: nextUpdatedAt,
                            clientRevision: nextClientRevision,
                            cardCount: snapshot.cards.filter(card => !card?.deletedAt).length
                        });
                    }));

                    const didForceSync = await latestController.forceOverwriteFromSnapshot(snapshot);
                    if (!didForceSync) {
                        throw new Error('强制同步未成功写出远端快照');
                    }

                    toast.success('已强制把当前设备的这张画布覆盖到远端，其他设备刷新后会以这份内容为准');
                } catch (error) {
                    console.error(`[Board] Failed to force sync board ${currentBoardId}:`, error);
                    toast.error(error?.message || '强制同步失败，请稍后重试');
                } finally {
                    setForceSyncingBoardId(null);
                }
            }
        );
    }, [
        activeBoardPersistence?.clientRevision,
        boardInstructionSettings,
        boardPrompts,
        cards,
        connections,
        currentBoardId,
        generatingCardIds?.size,
        groups,
        isBoardLoading,
        setActiveBoardPersistence,
        setBoardsList,
        setLastSavedAt,
        toast
    ]);

    const handleUpdateBoardMetadata = useCallback(async (boardId, metadata) => {
        if (!boardId || !metadata || typeof metadata !== 'object') return;

        const currentBoard = boardsListRef.current.find(board => board.id === boardId);
        let nextMetadata = sanitizeBoardMetadataPatch(metadata);

        if (Object.keys(nextMetadata).length === 0) {
            return;
        }

        if (hasBoardDisplayMetadataPatch(nextMetadata)) {
            nextMetadata = sanitizeBoardMetadataPatch(
                await prepareBoardDisplayMetadataPatch(boardId, nextMetadata)
            );
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

        if (Object.keys(nextMetadata).length === 0) {
            return;
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
                            onForceSyncBoard={user?.uid ? handleForceSyncBoard : undefined}
                            isForceSyncingBoard={forceSyncingBoardId === currentBoardId}
                        />
                    } />
                    <Route path="/board/:id/note/:noteId" element={
                        <BoardPage
                            user={user}
                            boardsList={boardsList}
                            onUpdateBoardTitle={handleUpdateBoardTitle}
                            onUpdateBoardMetadata={handleUpdateBoardMetadata}
                            onBack={handleBackToGallery}
                            onForceSyncBoard={user?.uid ? handleForceSyncBoard : undefined}
                            isForceSyncingBoard={forceSyncingBoardId === currentBoardId}
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
