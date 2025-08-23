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

    const recentBoards = [...boards]
        .filter(b => b.lastAccessedAt)
        .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
        .slice(0, 5);

    return (
        <div className="min-h-full animate-fade-in custom-scrollbar pb-40">
            {/* Hero Section & Greeting */}
            {!isTrashView && (
                <div className="relative pt-12 pb-6 px-8 max-w-[1600px] mx-auto">
                    <div className="text-center mb-10 animate-fade-in-up">
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white">
                            {greeting}, <span className="text-gradient-gold">Creator.</span>
                        </h1>
                        <p className="text-xl text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                            Ready to capture your next big idea?
                        </p>
                    </div>

                    <BoardDropZone onCreateBoard={onCreateBoard} />
                </div>
            )}

            {/* Trash View Header */}
            {isTrashView && (
                <div className="pt-12 pb-6 px-8 max-w-[1600px] mx-auto text-center animate-fade-in-up">
                    <h1 className="text-4xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white">
                        Recycle Bin
                    </h1>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 text-red-500 font-bold text-sm">
                        <Clock size={16} />
                        <span>Items are permanently deleted after 30 days</span>
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-16">

                {/* Recently Visited - Horizontal Carousel */}
                {!isTrashView && recentBoards.length > 0 && (
                    <div className="animate-fade-in-up delay-100">
                        <div className="flex items-center gap-3 mb-6 px-2">
                            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <Clock size={16} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Recently Visited</h2>
                        </div>

                        <div className="relative group/carousel">
                            <div className="flex overflow-x-auto gap-6 pb-8 pt-2 px-2 custom-scrollbar snap-x snap-mandatory mask-gradient-right">
                                {recentBoards.map((board, index) => (
                                    <div key={`recent-${board.id}`} className="snap-start shrink-0 w-[220px] md:w-[260px]">
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

                {/* All Boards Grid */}
                <div className="animate-fade-in-up delay-200">
                    {!isTrashView && (
                        <div className="flex items-center gap-3 mb-6 px-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <LayoutGrid size={16} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">All Boards</h2>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                {boards.length}
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
                        {boards.map((board, index) => (
                            <BoardCard
                                key={board.id}
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
                        ))}

                        {/* Empty State */}
                        {boards.length === 0 && (
                            <div className="col-span-full py-32 glass-panel rounded-[2.5rem] flex flex-col items-center justify-center text-center animate-fade-in border-dashed border-2 border-slate-200 dark:border-white/5">
                                <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mb-8 backdrop-blur-md transition-transform hover:scale-110 duration-500 ${isTrashView ? 'bg-red-50 dark:bg-red-900/10 text-red-300' : 'bg-gradient-to-br from-orange-100 to-rose-100 dark:from-white/5 dark:to-white/5 text-orange-400'}`}>
                                    {isTrashView ? <Trash2 size={48} strokeWidth={1.5} /> : <Sparkles size={48} strokeWidth={1.5} className="animate-pulse" />}
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                                    {isTrashView ? 'Trash is empty' : 'A fresh start'}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm leading-relaxed text-lg">
                                    {isTrashView
                                        ? 'Your deleted boards will appear here before they vanish forever.'
                                        : "Your canvas is waiting. Type a thought above to begin your journey."}
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
