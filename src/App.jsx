import React, { useEffect, useState, Suspense, lazy, useCallback } from 'react';
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
import SearchModal, { useSearchShortcut } from './components/SearchModal';
import { lazyWithRetry } from './utils/lazyWithRetry';

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


import { Tokushoho, Privacy, Terms } from './pages/legal/LegalPages';

import ModernDialog from './components/ModernDialog';
import {
    createBoard,
    saveBoardToCloud,
    saveBoard,
    loadBoard,
    deleteBoard, // This is now soft delete
    permanentlyDeleteBoard,
    restoreBoard,
    deleteBoardFromCloud,
    updateBoardMetadata,
    updateBoardMetadataInCloud,
    setCurrentBoardId as storageSetCurrentBoardId,
    getBoardsList,
    loadViewportState
} from './services/storage';

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

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, boardsList, setBoardsList, isInitialized, hasSeenWelcome, setHasSeenWelcome } = useAppInit();
    const { setCards, setConnections, setGroups, setBoardPrompts } = useStore();
    const { createCardWithText } = useCardCreator();

    // Dialog State
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    // Search Modal State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [allBoardsData, setAllBoardsData] = useState({});
    const [isSearchDataLoaded, setIsSearchDataLoaded] = useState(false);

    // Cmd+K shortcut for search
    useSearchShortcut(useCallback(() => setIsSearchOpen(true), []));

    // Load all boards data for search (lazy load when search opens)
    useEffect(() => {
        if (isSearchOpen && !isSearchDataLoaded) {
            // Load data from localStorage for all boards
            const loadedData = {};
            let hasFoundAny = false;
            boardsList.forEach(board => {
                try {
                    const data = localStorage.getItem(`board_${board.id}`);
                    if (data) {
                        loadedData[board.id] = JSON.parse(data);
                        hasFoundAny = true;
                    }
                } catch (e) {
                    console.warn('Failed to load board data for search:', board.id);
                }
            });
            setAllBoardsData(loadedData);
            setIsSearchDataLoaded(true);
        }
    }, [isSearchOpen, boardsList, isSearchDataLoaded]);

    const showDialog = (title, message, type = 'info', onConfirm = () => { }) => {
        setDialog({ isOpen: true, title, message, type, onConfirm });
    };

    // Board Management Handlers
    const handleLogin = useCallback(async () => {
        try {
            console.log('[Auth] handleLogin initiated');
            await signInWithPopup(auth, googleProvider);
        }
        catch (e) {
            console.error('[Auth] Login failed:', e);
            showDialog("Login Failed", e.message, "error");
        }
    }, [showDialog]);

    const handleLogout = useCallback((intent = 'manual') => {
        console.group('[Logout Trace]');
        console.log(`[Logout] handleLogout called with intent: ${intent}`);
        console.trace('[Logout] Caller detail:');

        // SAFETY LOCK: Block any automatic logout in first 15 seconds unless manual
        const timeSinceLoad = (Date.now() - SESSION_START_TIME) / 1000;
        if (timeSinceLoad < 15 && intent !== 'manual_user_click') {
            console.warn(`[Logout] ABORTED: Session too fresh (${timeSinceLoad.toFixed(1)}s) and intent is ${intent}`);
            console.groupEnd();
            return;
        }

        setIsLogoutConfirmOpen(true);
        console.groupEnd();
    }, []);

    const performActualLogout = useCallback(async () => {
        try {
            const timeSinceLoad = (Date.now() - SESSION_START_TIME) / 1000;
            console.log(`[Logout] performActualLogout verified at ${timeSinceLoad.toFixed(1)}s`);

            // Double check: if user just logged in, this is likely a misclick/bug
            if (user && timeSinceLoad < 30) {
                console.warn('[Logout] DANGER: User is logged in and session is very fresh. Proceeding with caution...');
            }

            console.log('[Logout] User confirmed logout, initiating cleanup...');
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
        let name = customName;
        if (!name) {
            name = `Board ${boardsList.length + 1}`;
        }

        const newBoard = await createBoard(name);
        setBoardsList(prev => [newBoard, ...prev]);
        if (user) saveBoardToCloud(user.uid, newBoard.id, { cards: [], connections: [], groups: [], boardPrompts: [] });

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
        const boardIdAtStart = currentBoardId; // Capture the ID at effect start

        const load = async () => {
            if (currentBoardId) {
                // 1. Start loading state & clear existing data to prevent bleed-over
                useStore.getState().setIsBoardLoading(true);
                setCards([]);
                setConnections([]);
                setGroups([]);

                try {
                    // 2. Load new data
                    const data = await loadBoard(currentBoardId);

                    // CRITICAL: Check if user has navigated away during load
                    // If so, discard this result to prevent data bleed-over
                    if (isCancelled || boardIdAtStart !== currentBoardId) {
                        console.log(`[Board] Load cancelled: user navigated from ${boardIdAtStart} to ${currentBoardId}`);
                        return;
                    }

                    setCards(data.cards || []);
                    setConnections(data.connections || []);
                    setGroups(data.groups || []);
                    setBoardPrompts(data.boardPrompts || []);
                    storageSetCurrentBoardId(currentBoardId);

                    // 3. Restore viewport state
                    const viewport = loadViewportState(currentBoardId);
                    useStore.getState().restoreViewport(viewport);
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
    }, [currentBoardId]); // Rely on currentBoardId changing

    // Soft Delete (Move to Trash)
    const handleSoftDeleteBoard = async (id) => {
        await deleteBoard(id); // Local soft delete
        if (user) updateBoardMetadataInCloud(user.uid, id, { deletedAt: Date.now() });

        // Update state to reflect change (filter out moved item? No, just update its status)
        // or just re-fetch? easiest is to update local list state
        setBoardsList(prev => prev.map(b => b.id === id ? { ...b, deletedAt: Date.now() } : b));

        // Optional: Show a subtle toast or message via some UI mechanism (skipped for now as per minimal App requirement, GalleryPage can handle toast)
    };

    // Restore from Trash
    const handleRestoreBoard = async (id) => {
        await restoreBoard(id);
        if (user) updateBoardMetadataInCloud(user.uid, id, { deletedAt: null }); // Remove field? Firestore update can use deleteField() but null is fine for now check
        // Ideally we use deleteField import but for now simply checking truthiness of deletedAt works if we store null.
        // Actually storage.js checks `deletedAt` existence or truthiness. `updateDoc` with `deleteField` is cleaner.
        // But for simplicity sending `null` depends on how we check. `!b.deletedAt` works for null.

        setBoardsList(prev => prev.map(b => b.id === id ? { ...b, deletedAt: null } : b));
    };

    // Permanent Delete
    const handlePermanentDeleteBoard = async (id) => {
        showDialog(
            "Permanently Delete?",
            "This will permanently delete this board and cannot be undone.",
            "confirm",
            async () => {
                await permanentlyDeleteBoard(id);
                if (user) deleteBoardFromCloud(user.uid, id);
                setBoardsList(prev => prev.filter(b => b.id !== id));
            }
        );
    };

    const handleBackToGallery = useCallback(async () => {
        // Save handled by Autosave in BoardPage mostly
        const { cards, connections, groups, boardPrompts } = useStore.getState();
        if (currentBoardId) await saveBoard(currentBoardId, { cards, connections, groups, boardPrompts });

        // Refresh boardsList to pick up any metadata changes (e.g., thumbnails)
        const freshBoards = getBoardsList();
        setBoardsList(freshBoards);

        navigate('/gallery');
        setCards([]);
        setConnections([]);
        setGroups([]);
    }, [currentBoardId, navigate, setBoardsList, setCards, setConnections, setGroups]);

    const handleUpdateBoardTitle = useCallback(async (newTitle) => {
        if (!currentBoardId || !newTitle.trim()) return;

        // 1. Update local storage (persist across reloads)
        updateBoardMetadata(currentBoardId, { name: newTitle });

        // 2. Update in-memory state (immediate UI update)
        setBoardsList(prev => prev.map(b => b.id === currentBoardId ? { ...b, name: newTitle } : b));

        // 3. Update cloud (sync across devices) - Use metadata update to avoid overwriting card data!
        if (user) updateBoardMetadataInCloud(user.uid, currentBoardId, { name: newTitle });
    }, [currentBoardId, user, setBoardsList]);

    const handleUpdateBoardMetadata = useCallback(async (boardId, metadata) => {
        // 1. Update local storage
        updateBoardMetadata(boardId, metadata);

        // 2. Update in-memory state (immediate UI update)
        setBoardsList(prev => prev.map(b => b.id === boardId ? { ...b, ...metadata } : b));

        // 3. Update cloud
        if (user) updateBoardMetadataInCloud(user.uid, boardId, metadata);

        // 4. Force reload boards to ensure UI updates
        setTimeout(async () => {
            const freshBoards = await getBoardsList();
            setBoardsList(freshBoards);
        }, 100);
    }, [user, setBoardsList]);

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

                    <Route path="/gallery" element={
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
                            hasSeenWelcome={hasSeenWelcome}
                            setHasSeenWelcome={setHasSeenWelcome}
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
            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                boardsList={boardsList}
                allBoardsData={allBoardsData}
            />

            {/* Logout Confirmation Dialog */}
            <ModernDialog
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={performActualLogout}
                title="Sign Out?"
                message="Are you sure you want to sign out? This will clear all local data for security. Ensure your boards are synced to the cloud."
                type="confirm"
            />
        </>
    );
}

if (typeof window !== 'undefined') window.App = App;
