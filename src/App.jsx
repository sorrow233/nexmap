import React, { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppInit } from './hooks/useAppInit';
import { useStore } from './store/useStore';
import { useCardCreator } from './hooks/useCardCreator';
import Loading from './components/Loading';
import { ToastProvider } from './components/Toast';
import { ContextMenuProvider } from './components/ContextMenu';
import IPadInstallPrompt from './components/pwa/IPadInstallPrompt';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { useSearchShortcut } from './hooks/useSearchShortcut';
import { useBuildVersionRefresh } from './hooks/useBuildVersionRefresh';
import { buildBoardCursorTrace, logPersistenceTrace } from './utils/persistenceTrace';
import { runtimeLog, runtimeWarn } from './utils/runtimeLogging';

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

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, boardsList, setBoardsList, isInitialized } = useAppInit();
    const {
        setCards,
        setConnections,
        setGroups,
        setBoardPrompts,
        setBoardInstructionSettings,
        setLastSavedAt,
        setActiveBoardPersistence
    } = useStore();
    const isBoardLoading = useStore(state => state.isBoardLoading);
    const { createCardWithText } = useCardCreator();

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

    useBuildVersionRefresh();

    // Cmd+K shortcut for search
    useSearchShortcut(useCallback(() => setIsSearchOpen(true), []));

    useEffect(() => {
        allBoardsDataRef.current = allBoardsData;
    }, [allBoardsData]);

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

    const resetBoardSessionState = useCallback(() => {
        setCards([]);
        setConnections([]);
        setGroups([]);
        setBoardPrompts([]);
        setBoardInstructionSettings(normalizeBoardInstructionSettings(DEFAULT_BOARD_INSTRUCTION_SETTINGS));
        setLastSavedAt(0);
        setActiveBoardPersistence({ updatedAt: 0, clientRevision: 0, dirty: false });
        storageSetCurrentBoardId(null);
    }, [
        setCards,
        setConnections,
        setGroups,
        setBoardPrompts,
        setBoardInstructionSettings,
        setLastSavedAt,
        setActiveBoardPersistence
    ]);

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
                // 1. Start loading state & clear existing data to prevent bleed-over
                useStore.getState().setIsBoardLoading(true);
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

                    setCards(data.cards || []);
                    setConnections(data.connections || []);
                    setGroups(data.groups || []);
                    setBoardPrompts(data.boardPrompts || []);
                    const boardInstructionSettings = normalizeBoardInstructionSettings(
                        data.boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                    );
                    setBoardInstructionSettings(boardInstructionSettings);
                    saveBoardInstructionSettingsCache(currentBoardId, boardInstructionSettings);
                    setLastSavedAt(data.updatedAt || 0);
                    setActiveBoardPersistence({
                        updatedAt: data.updatedAt || 0,
                        clientRevision: data.clientRevision || 0,
                        dirty: false
                    });
                    storageSetCurrentBoardId(currentBoardId);

                    // 3. Restore viewport state
                    const viewport = loadViewportState(currentBoardId);
                    useStore.getState().restoreViewport(viewport);
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
        };
    }, [currentBoardId, setCards, setConnections, setGroups, setBoardPrompts, setBoardInstructionSettings, setLastSavedAt, setActiveBoardPersistence]); // Rely on currentBoardId changing

    useEffect(() => {
        if (currentBoardId) return;

        // Important: only clear board store after we have already left the board route.
        // Clearing it inside the back handler can race with persistence cleanup and
        // accidentally write an empty board snapshot over real local data.
        resetBoardSessionState();
    }, [currentBoardId, resetBoardSessionState]);

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
        if (currentBoardId && !isBoardLoading) {
            // Save handled by Autosave in BoardPage mostly
            const {
                cards,
                connections,
                groups,
                boardPrompts,
                boardInstructionSettings,
                activeBoardPersistence
            } = useStore.getState();
            await saveBoard(currentBoardId, {
                cards,
                connections,
                groups,
                boardPrompts,
                boardInstructionSettings: normalizeBoardInstructionSettings(
                    boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS
                ),
                clientRevision: activeBoardPersistence?.clientRevision || 0
            });
        } else if (currentBoardId && isBoardLoading) {
            runtimeWarn(`[Board] Skip save while loading board ${currentBoardId} to avoid overwriting with transient state`);
        }

        // Refresh boardsList to pick up any metadata changes (e.g., thumbnails)
        const freshBoards = getBoardsList();
        setBoardsList(freshBoards);

        navigate('/gallery');
    }, [currentBoardId, isBoardLoading, navigate, setBoardsList]);

    const handleUpdateBoardMetadata = useCallback(async (boardId, metadata) => {
        const currentBoard = boardsList.find(board => board.id === boardId);
        let nextMetadata = metadata;

        if (hasBoardTitleMetadataPatch(metadata)) {
            nextMetadata = {
                ...metadata,
                ...pickBoardTitleMetadata({
                    ...(currentBoard || {}),
                    ...metadata
                })
            };
        }

        updateBoardMetadata(boardId, nextMetadata);

        setBoardsList(prev => prev.map(board => (
            board.id === boardId
                ? normalizeBoardTitleMeta({ ...board, ...nextMetadata })
                : board
        )));

    }, [boardsList, setBoardsList]);

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
