import React, { useState, useEffect } from 'react';
import { Plus, Settings, Star } from 'lucide-react';
import BoardGallery from '../components/BoardGallery';
import FavoritesGallery from '../components/FavoritesGallery';
import SettingsModal from '../components/SettingsModal';
import WelcomeCanvas from '../components/WelcomeCanvas';
import { getGuideBoardData } from '../utils/guideBoardData';
import { createBoard, saveBoard, getBoardsList } from '../services/storage';
import { useNavigate } from 'react-router-dom';

export default function GalleryPage({
    boardsList,
    onCreateBoard,
    onSelectBoard,
    onDeleteBoard,
    onRestoreBoard,           // New prop
    onPermanentlyDeleteBoard, // New prop
    onUpdateBoardMetadata,    // New prop
    user,
    onLogin,
    onLogout
}) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [viewMode, setViewMode] = useState('active'); // 'active' | 'trash'
    const [showWelcome, setShowWelcome] = useState(false);

    // Check if this is the user's first visit
    useEffect(() => {
        const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
        if (!hasVisitedBefore) {
            setShowWelcome(true);
        }
    }, []);

    const handleDismissWelcome = async () => {
        setShowWelcome(false);
        localStorage.setItem('hasVisitedBefore', 'true');

        // Auto-create guide board for new users
        const guideTitle = "Neural Canvas 使用指南 🚀";
        const existingBoard = boardsList.find(b => b.name === guideTitle && !b.deletedAt);

        if (!existingBoard) {
            try {
                const newBoard = await createBoard(guideTitle);
                const guideContent = getGuideBoardData();
                await saveBoard(newBoard.id, guideContent);
                // Don't navigate automatically, just create it in background
                console.log('✅ Guide board created automatically');
            } catch (error) {
                console.error('Failed to auto-create guide board:', error);
            }
        }
    };

    const navigate = useNavigate();

    const handleCreateGuide = async () => {
        // Check if guide board already exists (Chinese title)
        const guideTitle = "Neural Canvas 使用指南 🚀";
        const existingBoard = boardsList.find(b => b.name === guideTitle && !b.deletedAt);

        if (existingBoard) {
            onSelectBoard(existingBoard.id);
            return;
        }

        // Create new guide board
        const newBoard = await createBoard(guideTitle);
        const guideContent = getGuideBoardData();
        await saveBoard(newBoard.id, guideContent);

        // Refresh list (handled by parent usually, but we can navigate directly)
        // onCreateBoard usually expects name, but we manually created.
        // Let's force navigation or let the live sync pick it up.
        // Better: Reuse onCreateBoard if possible, but it only takes name.
        // We manually created, so we should manually trigger selection.
        onSelectBoard(newBoard.id);
    };

    const activeBoards = boardsList.filter(b => !b.deletedAt);
    const trashBoards = boardsList.filter(b => b.deletedAt);
    const trashCount = trashBoards.length;

    const displayBoards = viewMode === 'active' ? activeBoards : trashBoards;

    // Show welcome screen for first-time visitors
    if (showWelcome) {
        return <WelcomeCanvas onDismiss={handleDismissWelcome} />;
    }

    return (
        <div className="bg-mesh-gradient h-screen text-slate-900 dark:text-slate-200 p-8 font-lxgw relative overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="sticky top-4 z-50 flex justify-between items-center mb-16 py-4 px-6 glass-card rounded-2xl transition-all duration-300">
                    <div className="flex items-center gap-6">
                        <h1 className="text-3xl font-black tracking-tight cursor-pointer" onClick={() => setViewMode('active')}>
                            <span className="text-gradient">Neural</span> Canvas
                        </h1>

                        {/* View Switcher */}
                        <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-white/10">
                            <button
                                onClick={() => setViewMode('active')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'active' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Gallery
                            </button>
                            <button
                                onClick={() => setViewMode('favorites')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'favorites' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <Star size={14} fill={viewMode === 'favorites' ? "currentColor" : "none"} />
                                Favorites
                            </button>
                            <button
                                onClick={() => setViewMode('trash')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'trash' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Trash
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Only show Create button in Active mode */}
                        {viewMode === 'active' && (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCreateGuide}
                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800/50 font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shadow-sm"
                                >
                                    💡 Usage Guide
                                </button>
                                <button onClick={() => onCreateBoard("New Board")} className="p-2.5 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/60 dark:border-white/10 shadow-sm hover:scale-110 hover:shadow-glow-blue transition-all group">
                                    <Plus size={20} className="text-slate-700 dark:text-slate-200 group-hover:text-orange-500 dark:group-hover:text-orange-400" />
                                </button>
                            </div>
                        )}

                        {user ? (
                            <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl pl-2 pr-5 py-2 border border-white/60 dark:border-white/10 shadow-sm transition-all hover:shadow-md">
                                {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-xl shadow-sm border border-white dark:border-white/10" alt="User" />}
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold leading-none text-slate-800 dark:text-slate-200">{user.displayName}</span>
                                    <button onClick={onLogout} className="text-[10px] text-slate-500 hover:text-red-500 font-bold uppercase mt-1 text-left transition-colors">Sign Out</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={onLogin} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">Sign In</button>
                        )}
                    </div>
                </div>

                {viewMode === 'favorites' ? (
                    <FavoritesGallery />
                ) : (
                    <BoardGallery
                        boards={displayBoards}
                        onCreateBoard={onCreateBoard}
                        onSelectBoard={viewMode === 'active' ? onSelectBoard : () => { }} // Disable select in trash
                        onDeleteBoard={onDeleteBoard}
                        onRestoreBoard={onRestoreBoard}
                        onPermanentlyDeleteBoard={onPermanentlyDeleteBoard}
                        onUpdateBoardMetadata={onUpdateBoardMetadata}
                        isTrashView={viewMode === 'trash'}
                    />
                )}
            </div>
            <div className="fixed bottom-10 right-10 z-50">
                <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-premium rounded-full text-slate-400 hover:text-orange-400 hover:rotate-90 hover:scale-110 transition-all border border-white/60 dark:border-white/10"><Settings size={24} /></button>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} />
        </div>
    );
}
