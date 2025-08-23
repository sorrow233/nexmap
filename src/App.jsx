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

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, boardsList, setBoardsList, isInitialized, hasSeenWelcome, setHasSeenWelcome } = useAppInit();
    const { setCards, setConnections, setGroups } = useStore();
    const { createCardWithText } = useCardCreator();

    // Dialog State
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });

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
    const handleLogin = async () => {
        try { await signInWithPopup(auth, googleProvider); }
        catch (e) {
            showDialog("Login Failed", e.message, "error");
        }
    };

    const handleLogout = async () => {
        try {
            // CRITICAL: Clear all local data before signing out
            // This prevents data leakage between user accounts
            const { clearAllUserData } = await import('./services/clearAllUserData');
            await clearAllUserData();
            await signOut(auth);
        }
        catch (e) { console.error(e); }
    };

    const handleCreateBoard = async (customName = null, initialPrompt = null, initialImages = []) => {
        let name = customName;
        if (!name) {
            name = `Board ${boardsList.length + 1}`;
        }

        const newBoard = await createBoard(name);
        setBoardsList(prev => [newBoard, ...prev]);
        if (user) saveBoardToCloud(user.uid, newBoard.id, { cards: [], connections: [], groups: [] });

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
                    setCards(data.cards || []);
                    setConnections(data.connections || []);
                    setGroups(data.groups || []);
                    storageSetCurrentBoardId(currentBoardId);

                    // 3. Restore viewport state
                    const viewport = loadViewportState(currentBoardId);
                    useStore.getState().restoreViewport(viewport);
                } finally {
                    // 4. End loading state
                    useStore.getState().setIsBoardLoading(false);
                }
            }
        };
        load();
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

    const handleBackToGallery = async () => {
        // Save handled by Autosave in BoardPage mostly
        const { cards, connections, groups } = useStore.getState();
        if (currentBoardId) await saveBoard(currentBoardId, { cards, connections, groups });

        navigate('/gallery');
        setCards([]);
        setConnections([]);
        setGroups([]);
    };

    const handleUpdateBoardTitle = async (newTitle) => {
        if (!currentBoardId || !newTitle.trim()) return;

        // 1. Update local storage (persist across reloads)
        updateBoardMetadata(currentBoardId, { name: newTitle });

        // 2. Update in-memory state (immediate UI update)
        setBoardsList(prev => prev.map(b => b.id === currentBoardId ? { ...b, name: newTitle } : b));

        // 3. Update cloud (sync across devices)
        if (user) saveBoardToCloud(user.uid, currentBoardId, { name: newTitle }, true);
    };

    const handleUpdateBoardMetadata = async (boardId, metadata) => {
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
    };

    if (!isInitialized) return null;

    return (
        <>
            <Suspense fallback={<Loading message="Initializing MixBoard..." />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/free-trial" element={<FreeTrialPage />} />

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
                            onBack={handleBackToGallery}
                        />
                    } />
                    <Route path="/board/:id/note/:noteId" element={
                        <BoardPage
                            user={user}
                            boardsList={boardsList}
                            onUpdateBoardTitle={handleUpdateBoardTitle}
                            onBack={handleBackToGallery}
                        />
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
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
        </>
    );
}

if (typeof window !== 'undefined') window.App = App;
