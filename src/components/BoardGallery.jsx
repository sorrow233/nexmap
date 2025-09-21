import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Clock, FileText, ChevronRight, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import ModernDialog from './ModernDialog';
import useBoardBackground from '../hooks/useBoardBackground';
import BoardDropZone from './BoardDropZone';
import BoardCard from './BoardCard';
import { useStore } from '../store/useStore';
import { useLanguage } from '../contexts/LanguageContext';

export default function BoardGallery({ boards, onSelectBoard, onCreateBoard, onDeleteBoard, onRestoreBoard, onPermanentlyDeleteBoard, onUpdateBoardMetadata, isTrashView = false }) {
    const { generatingBoardId, generateBackground } = useBoardBackground();
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, boardId: null, isPermanent: false });
    // NOTE: freeUserDialog removed - free users now have 20 images/week quota
    const [greeting, setGreeting] = useState('morning');
    const isSystemCreditsUser = useStore(state => state.isSystemCreditsUser);
    const { t } = useLanguage();

    // Track if initial animation has played to prevent re-triggering on data updates
    const hasAnimatedRef = useRef(false);
    const [shouldAnimate, setShouldAnimate] = useState(true);

    useEffect(() => {
        // After initial mount + animation duration, mark animations as done
        const timer = setTimeout(() => {
            hasAnimatedRef.current = true;
            setShouldAnimate(false);
        }, 1000); // 1 second covers animation duration
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('morning');
        else if (hour < 18) setGreeting('afternoon');
        else setGreeting('evening');
    }, []);

    // Use boards directly
    const validBoards = boards;

    const recentBoards = [...validBoards]
        .filter(b => b.lastAccessedAt)
        .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
        .slice(0, 5);

    return (
        <div className="min-h-full animate-fade-in custom-scrollbar pb-40">
            {/* Hero Section & Greeting */}
            {!isTrashView && (
                <div className="relative pt-2 pb-8 px-2 max-w-[1800px] mx-auto">
                    <div className="flex flex-col md:flex-row items-end md:items-center justify-between mb-8 animate-fade-in-up">
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter mb-2 text-slate-900 dark:text-white font-inter-tight">
                                {greeting === 'morning' ? t.gallery.greetingMorning : greeting === 'afternoon' ? t.gallery.greetingAfternoon : t.gallery.greetingEvening}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">{t.gallery.creator}.</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                                {t.gallery.readyToCreate}
                            </p>
                        </div>
                        {/* DropZone is now more compact or integrated if needed, keeping as creates new board */}
                    </div>

                    <BoardDropZone onCreateBoard={onCreateBoard} />
                </div>
            )}

            {/* Trash View Header */}
            {isTrashView && (
                <div className="pt-6 pb-6 px-2 text-center animate-fade-in-up">
                    <h1 className="text-3xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white font-inter-tight">
                        {t.gallery.recycleBin}
                    </h1>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 text-red-500 font-semibold text-sm">
                        <Clock size={14} />
                        <span>{t.gallery.trashHint}</span>
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className="max-w-[1800px] mx-auto px-1 md:px-2 space-y-12">

                {/* Recently Visited - Horizontal Carousel */}
                {!isTrashView && recentBoards.length > 0 && (
                    <div className={shouldAnimate ? "animate-fade-in-up delay-100" : ""}>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Clock size={16} className="text-indigo-500" />
                            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.gallery.recentlyVisited}</h2>
                        </div>

                        <div className="relative group/carousel">
                            <div className="flex overflow-x-auto gap-4 pb-4 pt-2 px-1 custom-scrollbar snap-x snap-mandatory mask-gradient-right">
                                {recentBoards.map((board, index) => (
                                    <div key={`recent-${board.id}`} className="snap-start shrink-0 w-[240px] md:w-[280px]">
                                        <BoardCard
                                            board={board}
                                            index={index}
                                            isTrashView={false}
                                            onSelect={onSelectBoard}
                                            onDelete={(id) => setDeleteDialog({ isOpen: true, boardId: id, isPermanent: false })}
                                            onGenerateBackground={generateBackground}
                                            generatingBoardId={generatingBoardId}
                                            variant="overlay"
                                            isSystemCreditsUser={isSystemCreditsUser}
                                            shouldAnimate={shouldAnimate}
                                        />
                                    </div>
                                ))}
                                {/* Add a spacer at the end for better scrolling */}
                                <div className="w-[20px] shrink-0"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* All Boards - Masonry Grid */}
                <div className={shouldAnimate ? "animate-fade-in-up delay-200" : ""}>
                    {!isTrashView && (
                        <div className="flex items-center gap-2 mb-6 px-1">
                            <LayoutGrid size={16} className="text-indigo-500" />
                            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.gallery.allBoards}</h2>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                {validBoards.length}
                            </span>
                        </div>
                    )}

                    <div className="masonry-grid px-1">
                        {validBoards.map((board, index) => (
                            <div key={board.id} className="masonry-item">
                                <BoardCard
                                    board={board}
                                    index={index}
                                    isTrashView={isTrashView}
                                    onSelect={onSelectBoard}
                                    onDelete={(id) => setDeleteDialog({ isOpen: true, boardId: id, isPermanent: false })}
                                    onRestore={onRestoreBoard}
                                    onRequestPermanentDelete={(id) => setDeleteDialog({ isOpen: true, boardId: id, isPermanent: true })}
                                    onGenerateBackground={(id) => generateBackground(id, onUpdateBoardMetadata)}
                                    generatingBoardId={generatingBoardId}
                                    variant="stacked"
                                    isSystemCreditsUser={isSystemCreditsUser}
                                    shouldAnimate={shouldAnimate}
                                />
                            </div>
                        ))}

                        {validBoards.length === 0 && (
                            <div className="col-span-full py-32 glass-panel rounded-3xl flex flex-col items-center justify-center text-center animate-fade-in border-dashed border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform hover:scale-110 duration-500 ${isTrashView ? 'bg-red-50 dark:bg-red-900/10 text-red-300' : 'bg-indigo-50 dark:bg-white/5 text-indigo-400'}`}>
                                    {isTrashView ? <Trash2 size={32} /> : <Sparkles size={32} />}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                                    {isTrashView ? t.gallery.emptyTrash : t.gallery.freshStart}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 max-w-xs text-sm">
                                    {isTrashView
                                        ? t.gallery.emptyTrashHint
                                        : t.gallery.freshStartHint}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            <ModernDialog
                isOpen={deleteDialog.isOpen}
                onClose={() => setDeleteDialog({ isOpen: false, boardId: null, isPermanent: false })}
                onConfirm={() => {
                    if (deleteDialog.isPermanent) {
                        onPermanentlyDeleteBoard(deleteDialog.boardId);
                    } else {
                        onDeleteBoard(deleteDialog.boardId);
                    }
                }}
                title={deleteDialog.isPermanent ? "Permanently Delete?" : "Move to Trash?"}
                message={deleteDialog.isPermanent
                    ? "This action cannot be undone. Are you sure you wish to dissolve this board into the void?"
                    : "This board will be moved to the trash. You can restore it within 30 days."
                }
                type="confirm"
            />

            {/* NOTE: Free User Restriction Dialog removed - free users now have 20 images/week quota */}
        </div>
    );
}

// Local Loader Compatibility
if (typeof window !== 'undefined') {
    window.BoardGallery = BoardGallery;
}
