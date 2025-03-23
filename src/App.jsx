import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppInit } from './hooks/useAppInit';
import { useStore } from './store/useStore';
import { useCardCreator } from './hooks/useCardCreator';
import GalleryPage from './pages/GalleryPage';
import BoardPage from './pages/BoardPage';
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
    updateBoardMetadataInCloud,
    setCurrentBoardId as storageSetCurrentBoardId
} from './services/storage';

export default function App() {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, boardsList, setBoardsList, isInitialized } = useAppInit();
    const { setCards, setConnections } = useStore();
    const { createCardWithText } = useCardCreator();

    // Dialog State
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });

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
        try { await signOut(auth); }
        catch (e) { console.error(e); }
    };

    const handleCreateBoard = async (customName = null, initialPrompt = null, initialImages = []) => {
        let name = customName;
        if (!name) {
            name = `Board ${boardsList.length + 1}`;
        }

        const newBoard = await createBoard(name);
        setBoardsList(prev => [newBoard, ...prev]);
        if (user) saveBoardToCloud(user.uid, newBoard.id, { cards: [], connections: [] });

        navigate(`/board/${newBoard.id}`);

        if (initialPrompt || initialImages.length > 0) {
            setTimeout(() => createCardWithText(initialPrompt, newBoard.id, initialImages), 100);
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
                const data = await loadBoard(currentBoardId);
                setCards(data.cards || []);
                setConnections(data.connections || []);
                storageSetCurrentBoardId(currentBoardId);
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
        const { cards, connections } = useStore.getState();
        if (currentBoardId) await saveBoard(currentBoardId, { cards, connections });

        navigate('/gallery');
        setCards([]);
        setConnections([]);
    };

    const handleUpdateBoardTitle = async (newTitle) => {
        if (!currentBoardId || !newTitle.trim()) return;
        setBoardsList(prev => prev.map(b => b.id === currentBoardId ? { ...b, name: newTitle } : b));
        if (user) saveBoardToCloud(user.uid, currentBoardId, { name: newTitle }, true);
    };

    if (!isInitialized) return null;

    return (
        <>
            <Routes>
                <Route path="/gallery" element={
                    <GalleryPage
                        boardsList={boardsList}
                        onCreateBoard={handleCreateBoard}
                        onSelectBoard={handleSelectBoard}
                        onDeleteBoard={handleSoftDeleteBoard} // Default "delete" action is soft
                        onRestoreBoard={handleRestoreBoard}
                        onPermanentlyDeleteBoard={handlePermanentDeleteBoard}
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
                        onBack={handleBackToGallery}
                    />
                } />
                <Route path="*" element={<Navigate to="/gallery" replace />} />
            </Routes>

            <ModernDialog
                isOpen={dialog.isOpen}
                onClose={() => setDialog({ ...dialog, isOpen: false })}
                onConfirm={dialog.onConfirm}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
            />
        </>
    );
}

if (typeof window !== 'undefined') window.App = App;
