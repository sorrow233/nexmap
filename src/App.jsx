import React, { useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './services/firebase';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppInit } from './hooks/useAppInit';
import { useStore } from './store/useStore';
import { useCardCreator } from './hooks/useCardCreator';
import GalleryPage from './pages/GalleryPage';
import BoardPage from './pages/BoardPage';
import { createBoard, saveBoardToCloud, saveBoard, loadBoard, deleteBoard, deleteBoardFromCloud, setCurrentBoardId as storageSetCurrentBoardId } from './services/storage';

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

    // Board Management Handlers
    const handleLogin = async () => {
        try { await signInWithPopup(auth, googleProvider); }
        catch (e) { alert("Login failed: " + e.message); }
    };

    const handleLogout = async () => {
        try { await signOut(auth); }
        catch (e) { console.error(e); }
    };

    const handleCreateBoard = async (customName = null, initialPrompt = null, initialImages = []) => {
        let name = customName || prompt('Name your board:', `Board ${boardsList.length + 1}`);
        if (!name) return;

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
        // Data loading is handled by the route change effect below or inside BoardPage?
        // Actually, BoardPage doesn't load data itself in my implementation.
        // The original App logic loaded data when `currentBoardId` changed.
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

    const handleDeleteBoard = async (id) => {
        if (!confirm('Are you sure?')) return;
        await deleteBoard(id);
        if (user) deleteBoardFromCloud(user.uid, id);
        setBoardsList(prev => prev.filter(b => b.id !== id));
    };

    const handleBackToGallery = async () => {
        // Save handled by Autosave in BoardPage mostly, but we can force save if we want.
        // Original code did force save. 
        // We can access store state here via useStore if we really need to force save, 
        // or rely on the Autosave effect in BoardPage which triggers on change.
        // However, if we navigate away immediately, the Autosave timeout might be cleared or not fire.
        // It's safer to have BoardPage handle "unmount save" or just trust the debounce.
        // Let's implement a "Save on Unmount" in BoardPage or here.
        // Since we are decoupling, let's trust the Autosave mechanism or add a specific save call.
        // Accessing cards/connections here to save:
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

    if (!isInitialized) return null; // Or a loading spinner

    return (
        <Routes>
            <Route path="/gallery" element={
                <GalleryPage
                    boardsList={boardsList}
                    onCreateBoard={handleCreateBoard}
                    onSelectBoard={handleSelectBoard}
                    onDeleteBoard={handleDeleteBoard}
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
    );
}

if (typeof window !== 'undefined') window.App = App;
