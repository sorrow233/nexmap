import React, { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Clock, FileText, ChevronRight, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import ModernDialog from './ModernDialog';
import useBoardBackground from '../hooks/useBoardBackground';
import BoardDropZone from './BoardDropZone';
import BoardCard from './BoardCard';
import { useStore } from '../store/useStore';

export default function BoardGallery({ boards, onSelectBoard, onCreateBoard, onDeleteBoard, onRestoreBoard, onPermanentlyDeleteBoard, onUpdateBoardMetadata, isTrashView = false }) {
    const { generatingBoardId, generateBackground } = useBoardBackground();
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, boardId: null, isPermanent: false });
    const [freeUserDialog, setFreeUserDialog] = useState(false);
    const [greeting, setGreeting] = useState('Welcome back');
    const isSystemCreditsUser = useStore(state => state.isSystemCreditsUser);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
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
                                {greeting}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Creator.</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                                Ready to capture your next big idea?
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
                        Recycle Bin
                    </h1>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 text-red-500 font-semibold text-sm">
                        <Clock size={14} />
                        <span>Items deleted longer than 30 days are removed forever</span>
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className="max-w-[1800px] mx-auto px-1 md:px-2 space-y-12">

                {/* Recently Visited - Horizontal Carousel */}
                {!isTrashView && recentBoards.length > 0 && (
                    <div className="animate-fade-in-up delay-100">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Clock size={16} className="text-indigo-500" />
                            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recently Visited</h2>
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
                                            onFreeUserRestricted={() => setFreeUserDialog(true)}
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
                <div className="animate-fade-in-up delay-200">
                    {!isTrashView && (
                        <div className="flex items-center gap-2 mb-6 px-1">
                            <LayoutGrid size={16} className="text-indigo-500" />
                            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">All Boards</h2>
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
                                    onFreeUserRestricted={() => setFreeUserDialog(true)}
                                />
                            </div>
                        ))}

                        {/* Empty State */}
                        {validBoards.length === 0 && (
                            <div className="col-span-full py-32 glass-panel rounded-3xl flex flex-col items-center justify-center text-center animate-fade-in border-dashed border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform hover:scale-110 duration-500 ${isTrashView ? 'bg-red-50 dark:bg-red-900/10 text-red-300' : 'bg-indigo-50 dark:bg-white/5 text-indigo-400'}`}>
                                    {isTrashView ? <Trash2 size={32} /> : <Sparkles size={32} />}
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                                    {isTrashView ? 'Trash is empty' : 'A fresh start'}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 max-w-xs text-sm">
                                    {isTrashView
                                        ? 'Items appearing here can be restored.'
                                        : "Your canvas is waiting. Create your first board above."}
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

            {/* Free User Restriction Dialog */}
            <ModernDialog
                isOpen={freeUserDialog}
                onClose={() => setFreeUserDialog(false)}
                title="功能限制"
                message="鉴于图片生成模型的成本较高，普通用户暂时不支持该功能。如需使用，请配置您自己的 API Key。"
                type="alert"
            />
        </div>
    );
}

// Local Loader Compatibility
if (typeof window !== 'undefined') {
    window.BoardGallery = BoardGallery;
}
