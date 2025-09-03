import React, { useState, useEffect } from 'react';
import { Plus, Settings, Star, MessageSquare, CreditCard, LogOut, ChevronDown } from 'lucide-react';
import BoardGallery from '../components/BoardGallery';
import FavoritesGallery from '../components/FavoritesGallery';
import FeedbackView from '../components/FeedbackView';
import SettingsModal from '../components/SettingsModal';
import { getGuideBoardData } from '../utils/guideBoardData';
import { createBoard, saveBoard, getBoardsList, saveUserSettings, loadUserSettings, updateUserSettings } from '../services/storage';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

import InitialCreditsModal from '../components/InitialCreditsModal';

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
    onLogout,
    hasSeenWelcome,           // New: from useAppInit (Firebase synced)
    setHasSeenWelcome         // New: from useAppInit
}) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [viewMode, setViewMode] = useState('active'); // 'active' | 'trash'
    const { t } = useLanguage();

    // Determine if we should show welcome: hasn't seen it (regardless of login status)
    const showWelcome = hasSeenWelcome === false;

    const handleDismissWelcome = async () => {
        // 1. Update local state immediately
        setHasSeenWelcome(true);
        localStorage.setItem('hasVisitedBefore', 'true');

        // 2. Sync to Firebase
        if (user) {
            try {
                // Just patch the flag
                await updateUserSettings(user.uid, {
                    hasSeenWelcome: true
                });
                console.log('✅ Welcome status synced to cloud');
            } catch (error) {
                console.error('Failed to sync welcome status:', error);
            }
        }
    };

    const navigate = useNavigate();

    const handleCreateGuide = async () => {
        // Check if guide board already exists (Chinese title)
        const guideTitle = "NexMap 使用指南 🚀";
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
        return (
            <InitialCreditsModal
                isOpen={true}
                onClose={handleDismissWelcome}
            />
        );
    }

    return (
        <div className="bg-mesh-gradient h-screen text-slate-900 dark:text-slate-200 p-4 md:p-8 font-lxgw relative overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="sticky top-2 md:top-4 z-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8 md:mb-16 py-3 md:py-4 px-4 md:px-6 glass-card rounded-2xl transition-all duration-300">
                    <div className="flex items-center gap-3 md:gap-6 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight cursor-pointer" onClick={() => setViewMode('active')}>
                            <span className="text-gradient">Nex</span>Map
                        </h1>

                        {/* View Switcher */}
                        <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-white/10 overflow-x-auto">
                            <button
                                onClick={() => setViewMode('active')}
                                className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${viewMode === 'active' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {t.gallery.gallery}
                            </button>
                            <button
                                onClick={() => setViewMode('favorites')}
                                className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap ${viewMode === 'favorites' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <Star size={14} fill={viewMode === 'favorites' ? "currentColor" : "none"} />
                                <span className="hidden sm:inline">{t.gallery.favorites}</span>
                            </button>
                            <button
                                onClick={() => setViewMode('trash')}
                                className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap ${viewMode === 'trash' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <span className="hidden sm:inline">{t.gallery.trash}</span>
                                <span className="sm:hidden">🗑️</span>
                            </button>
                            <button
                                onClick={() => setViewMode('feedback')}
                                className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap ${viewMode === 'feedback' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-500' : 'text-slate-500 hover:text-orange-500 dark:hover:text-orange-400'}`}
                            >
                                <MessageSquare size={14} />
                                <span className="hidden sm:inline">{t.feedback?.title || 'Feedback'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Only show Create button in Active mode */}
                        {viewMode === 'active' && (
                            <div className="flex gap-2 md:gap-3">
                                <button
                                    onClick={handleCreateGuide}
                                    className="hidden md:flex px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800/50 font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shadow-sm"
                                >
                                    {t.gallery.usageGuide}
                                </button>
                                <button onClick={() => onCreateBoard("New Board")} className="p-2 md:p-2.5 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/60 dark:border-white/10 shadow-sm hover:scale-110 hover:shadow-glow-blue transition-all group">
                                    <Plus size={18} className="md:w-5 md:h-5 text-slate-700 dark:text-slate-200 group-hover:text-orange-500 dark:group-hover:text-orange-400" />
                                </button>
                            </div>
                        )}

                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-2 md:gap-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl pl-2 pr-3 md:pr-4 py-2 border border-white/60 dark:border-white/10 shadow-sm transition-all hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/80 active:scale-95 cursor-pointer"
                                >
                                    {user.photoURL ? (
                                        <img src={user.photoURL} className="w-7 h-7 md:w-8 md:h-8 rounded-xl shadow-sm border border-white dark:border-white/10" alt="User" />
                                    ) : (
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold leading-none text-slate-800 dark:text-slate-200 pr-1">{user.displayName}</span>
                                    </div>
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                                </button>

                                {showUserMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden z-50 animate-scale-in origin-top-right">
                                            <div className="p-1.5 space-y-0.5">
                                                <button
                                                    onClick={() => navigate('/pricing')}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all"
                                                >
                                                    <CreditCard size={16} className="text-amber-500" />
                                                    {t.gallery.pricing}
                                                </button>
                                                <div className="h-px bg-slate-200/50 dark:bg-white/5 my-1" />
                                                <button
                                                    onClick={() => onLogout('manual_user_click')}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                >
                                                    <LogOut size={16} />
                                                    {t.gallery.signOut}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <button onClick={onLogin} className="px-4 md:px-6 py-2 md:py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm md:text-base cursor-pointer z-50 relative">{t.gallery.signIn}</button>
                        )}
                    </div>
                </div>

                {viewMode === 'feedback' ? (
                    <FeedbackView user={user} onLogin={onLogin} />
                ) : viewMode === 'favorites' ? (
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
            <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50">
                <button onClick={() => setIsSettingsOpen(true)} className="p-3 md:p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-premium rounded-full text-slate-400 hover:text-orange-400 hover:rotate-90 hover:scale-110 transition-all border border-white/60 dark:border-white/10"><Settings size={20} className="md:w-6 md:h-6" /></button>
            </div>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                user={user}
                onShowWelcome={async () => {
                    setIsSettingsOpen(false);
                    setHasSeenWelcome(false);
                    localStorage.removeItem('hasVisitedBefore');
                    // Sync reset to cloud if logged in
                    if (user) {
                        try {
                            await updateUserSettings(user.uid, { hasSeenWelcome: false });
                            console.log('✅ Welcome status reset in cloud');
                        } catch (e) {
                            console.error('Failed to reset welcome status in cloud:', e);
                        }
                    }
                }}
            />
        </div>
    );
}
