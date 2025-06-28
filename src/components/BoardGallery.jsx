import React, { useState, useRef } from 'react';
import { LayoutGrid, Plus, Trash2, Clock, FileText, ChevronRight, Sparkles, X, ArrowRight, Image as ImageIcon, AlertCircle, RotateCcw, Ban, Loader2 } from 'lucide-react';
import ModernDialog from './ModernDialog';
import useImageUpload from '../hooks/useImageUpload';
import useBoardBackground from '../hooks/useBoardBackground';
import { loadBoard, updateBoardMetadata } from '../services/storage';
import BoardDropZone from './BoardDropZone';
import BoardCard from './BoardCard';

export default function BoardGallery({ boards, onSelectBoard, onCreateBoard, onDeleteBoard, onRestoreBoard, onPermanentlyDeleteBoard, onUpdateBoardMetadata, isTrashView = false }) {
    const { generatingBoardId, generateBackground } = useBoardBackground();
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, boardId: null });

    const getDaysRemaining = (deletedAt) => {
        if (!deletedAt) return 30;
        const expiryDate = deletedAt + (30 * 24 * 60 * 60 * 1000);
        const diff = expiryDate - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="min-h-full animate-fade-in custom-scrollbar pb-40">
            {/* Quick Start / Hero Input - Hidden in Trash View */}
            {!isTrashView && <BoardDropZone onCreateBoard={onCreateBoard} />}

            {/* Recently Accessed Section - Hidden in Trash View */}
            {!isTrashView && boards.length > 0 && (
                <div className="mb-20 animate-fade-in px-2">
                    <div className="flex items-center gap-4 mb-8 pl-2">
                        <div className="w-10 h-10 bg-white/50 dark:bg-white/10 rounded-2xl flex items-center justify-center text-orange-400 dark:text-orange-300 border border-white/60 dark:border-white/10 shadow-sm backdrop-blur-sm">
                            <Clock size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Recently Visited</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...boards]
                            .filter(b => b.lastAccessedAt)
                            .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
                            .slice(0, 4)
                            .map((board, index) => (
                                <div
                                    key={`recent-${board.id}`}
                                    onClick={() => onSelectBoard(board.id)}
                                    className="group relative glass-card rounded-[2rem] p-6 cursor-pointer transition-all duration-300 hover:glass-card-hover"
                                >
                                    <div className="flex flex-col h-full justify-between gap-6">
                                        <div className="relative">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors mb-2">
                                                {board.name}
                                            </h3>
                                            <p className="text-slate-400 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-300/60"></span>
                                                {new Date(board.lastAccessedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="px-3 py-1 bg-white/40 dark:bg-white/10 text-slate-500 dark:text-slate-300 text-[10px] font-black rounded-lg border border-white/20 backdrop-blur-sm">
                                                {board.cardCount || 0} CARDS
                                            </div>
                                            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 shadow-lg">
                                                <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Main Grid: All Boards (Active or Trash) */}
            <div className="animate-fade-in px-2">
                <div className="flex items-center gap-4 mb-8 pl-2">
                    {!isTrashView && (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm backdrop-blur-sm bg-white/50 dark:bg-white/10 text-orange-400 dark:text-orange-300 border-white/60 dark:border-white/10`}>
                            <FileText size={20} />
                        </div>
                    )}
                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                        {isTrashView ? 'Recycle Bin' : 'All Boards'}
                    </h2>
                    {isTrashView && (
                        <div className="ml-auto bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-lg border border-red-100 dark:border-red-500/20 text-xs font-bold text-red-500 flex items-center gap-2">
                            <Clock size={12} />
                            Items deleted over 30 days are permanently removed.
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                    {boards.map((board, index) => (
                        <BoardCard
                            key={board.id}
                            board={board}
                            index={index}
                            isTrashView={isTrashView}
                            onSelect={onSelectBoard}
                            onDelete={onDeleteBoard}
                            onRestore={onRestoreBoard}
                            onRequestPermanentDelete={(id) => setDeleteDialog({ isOpen: true, boardId: id })}
                            onGenerateBackground={(id) => generateBackground(id, onUpdateBoardMetadata)}
                            generatingBoardId={generatingBoardId}
                        />
                    ))}

                    {boards.length === 0 && (
                        <div className="col-span-full py-40 glass-panel rounded-[3.5rem] flex flex-col items-center justify-center text-slate-500 animate-fade-in shadow-inner border border-dashed border-slate-300/50 dark:border-white/10">
                            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 backdrop-blur-md ${isTrashView ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-white/80 dark:bg-white/5 shadow-glow-blue text-orange-400'}`}>
                                {isTrashView ? <Trash2 size={40} /> : <Sparkles size={40} className="animate-pulse-slow" />}
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                                {isTrashView ? 'Trash is empty' : 'No boards found'}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs text-center leading-relaxed">
                                {isTrashView ? 'Everything appears to be clean here.' : "Let's create something extraordinary. Start by typing a prompt above."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {/* Delete Confirmation (Only for Permanent Delete) */}
            <ModernDialog
                isOpen={deleteDialog.isOpen}
                onClose={() => setDeleteDialog({ isOpen: false, boardId: null })}
                onConfirm={() => onPermanentlyDeleteBoard(deleteDialog.boardId)}
                title="Permanently Delete?"
                message="This action cannot be undone. Are you sure you want to destroy this board?"
                type="confirm"
            />
        </div>
    );
}

// Local Loader Compatibility
if (typeof window !== 'undefined') {
    window.BoardGallery = BoardGallery;
}
