import React, { useState, useRef } from 'react';
import { LayoutGrid, Plus, Trash2, Clock, FileText, ChevronRight, Sparkles, X, ArrowRight, Image as ImageIcon, AlertCircle, RotateCcw, Ban, Loader2 } from 'lucide-react';
import ModernDialog from './ModernDialog';
import useImageUpload from '../hooks/useImageUpload';
import { loadBoard, updateBoardMetadata } from '../services/storage';
import { chatCompletion, imageGeneration, getRoleModel } from '../services/llm';

export default function BoardGallery({ boards, onSelectBoard, onCreateBoard, onDeleteBoard, onRestoreBoard, onPermanentlyDeleteBoard, onUpdateBoardMetadata, isTrashView = false }) {
    const [quickPrompt, setQuickPrompt] = useState('');
    const {
        images,
        setImages,
        handleImageUpload,
        handlePaste,
        handleDrop: hookHandleDrop,
        removeImage,
        clearImages
    } = useImageUpload();
    const [isDragging, setIsDragging] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, boardId: null });
    const [generatingBoardId, setGeneratingBoardId] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        hookHandleDrop(e);
    };

    const handleSubmit = async () => {
        if (!quickPrompt.trim() && images.length === 0) return;
        await onCreateBoard(quickPrompt || 'New Board', quickPrompt, images);
        setQuickPrompt('');
        clearImages();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit();
        }
    };

    // Expiry calculation for trash items
    const getDaysRemaining = (deletedAt) => {
        if (!deletedAt) return 30;
        const expiryDate = deletedAt + (30 * 24 * 60 * 60 * 1000);
        const diff = expiryDate - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const handleGenerateBackground = async (boardId) => {
        try {
            setGeneratingBoardId(boardId);

            // 1. Load board content
            const boardData = await loadBoard(boardId);
            if (!boardData || !boardData.cards || boardData.cards.length === 0) {
                alert("Board is empty. Add some content first to generate a background!");
                setGeneratingBoardId(null);
                return;
            }

            // 2. Extract text from cards
            const boardContext = boardData.cards
                .map(c => c.data?.title || c.data?.text || '')
                .filter(Boolean)
                .join('\n');

            if (!boardContext.trim()) {
                alert("No text found on board. Add some text first!");
                setGeneratingBoardId(null);
                return;
            }

            // 3. Generate Image Prompt
            const analysisPrompt = `Analyze the following board content and describe a perfect, artistic, and abstract background image that represents the themes in this board. 
            The description should be visual, specifying colors, mood, lighting, and style.
            It should be suitable for a background wallpaper (not too busy).
            
            Board Content:
            ${boardContext.slice(0, 1000)}

            Return ONLY the visual description for the image generation model.`;

            const imagePrompt = await chatCompletion(
                [{ role: 'user', content: analysisPrompt }],
                getRoleModel('analysis')
            );

            console.log('[Background Gen] Generated prompt:', imagePrompt);

            if (!imagePrompt) throw new Error("Failed to generate prompt");

            // 4. Generate Image
            const imageUrl = await imageGeneration(imagePrompt, getRoleModel('image'));

            if (!imageUrl) throw new Error("Failed to generate image");

            console.log('[Background Gen] Image URL:', imageUrl);

            // 5. Save to board metadata via callback
            if (onUpdateBoardMetadata) {
                await onUpdateBoardMetadata(boardId, { backgroundImage: imageUrl });
            }

        } catch (error) {
            console.error("Background generation failed:", error);
            alert("Failed to generate background. Check your 'Image Generation' settings or try again.");
        } finally {
            setGeneratingBoardId(null);
        }
    };

    return (
        <div className="min-h-full animate-fade-in custom-scrollbar pb-40">
            {/* Quick Start / Hero Input - Hidden in Trash View */}
            {!isTrashView && (
                <div className="mb-24 relative group max-w-4xl mx-auto mt-8">
                    <div className={`absolute inset-0 bg-gradient-to-r from-orange-300/15 via-pink-300/15 to-orange-300/15 rounded-[2.5rem] blur-3xl transition-opacity duration-1000 ${isDragging ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}></div>

                    <div
                        className={`relative glass-panel transition-all duration-500 p-3 rounded-[2.5rem] flex flex-col
                            ${isDragging ? 'border-orange-300 ring-4 ring-orange-300/20 scale-[1.01]' : 'hover:border-orange-200/40 dark:hover:border-orange-200/20 hover:shadow-glow-blue'}
                        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onPaste={handlePaste}
                    >
                        {/* Image Preview Section */}
                        {images.length > 0 && (
                            <div className="flex px-8 pt-6 gap-4 overflow-x-auto custom-scrollbar">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative shrink-0 group/img animate-fade-in-scale">
                                        <div className="absolute -top-2 -right-2 z-10 opacity-0 group-hover/img:opacity-100 transition-all duration-300 scale-75 group-hover/img:scale-100">
                                            <button
                                                onClick={() => removeImage(idx)}
                                                className="bg-white dark:bg-slate-800 text-red-500 rounded-full p-1.5 shadow-xl border border-slate-100 dark:border-white/10 hover:bg-red-50 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <img
                                            src={img.previewUrl}
                                            alt="Preview"
                                            className="h-24 w-auto rounded-2xl border border-white dark:border-white/5 shadow-premium object-cover transition-transform group-hover/img:scale-105"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-4 w-full">
                            <div className="pl-6 text-orange-400/80 dark:text-orange-300 my-auto shrink-0">
                                <Sparkles size={28} className="animate-pulse-slow drop-shadow-sm" />
                            </div>

                            <input
                                type="text"
                                value={quickPrompt}
                                onChange={e => setQuickPrompt(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="What's on your mind? Type to start..."
                                className="flex-grow bg-transparent border-none outline-none py-6 text-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium min-w-0"
                            />

                            {/* Image Upload Button */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/*"
                                multiple
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-4 text-slate-400 hover:text-orange-400 hover:bg-orange-50/50 dark:hover:bg-white/5 rounded-2xl transition-all mr-2 shrink-0 group-hover:scale-110"
                                title="Upload Image"
                            >
                                <ImageIcon size={26} />
                            </button>

                            <button
                                onClick={handleStartClick}
                                disabled={!quickPrompt.trim() && images.length === 0}
                                className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 px-10 py-4 rounded-[1.75rem] font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed shrink-0 mr-1"
                            >
                                Start
                            </button>
                        </div>

                        {/* Drag Overlay Hint */}
                        {isDragging && (
                            <div className="absolute inset-0 bg-orange-300/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center pointer-events-none z-20 border-2 border-dashed border-orange-300/30">
                                <div className="bg-white dark:bg-slate-800 px-8 py-4 rounded-2xl shadow-premium-hover flex items-center gap-4 animate-bounce border border-orange-100 dark:border-white/10">
                                    <div className="bg-orange-400 p-2 rounded-xl text-white">
                                        <ImageIcon size={20} />
                                    </div>
                                    <span className="font-black text-slate-900 dark:text-white tracking-tight">Release to upload</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                        <div
                            key={board.id}
                            onClick={() => !isTrashView && onSelectBoard(board.id)}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className={`
                                group relative glass-card rounded-[2.5rem] p-8 transition-all duration-500 flex flex-col min-h-[280px] animate-slide-up overflow-hidden
                                ${isTrashView ? 'cursor-default border-dashed border-slate-300 dark:border-white/10 opacity-90' : 'cursor-pointer hover:glass-card-hover'}
                            `}
                        >
                            {/* Background Image or Abstract Glow */}
                            {board.backgroundImage ? (
                                <>
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-all duration-700 opacity-60 group-hover:opacity-80 group-hover:scale-105"
                                        style={{ backgroundImage: `url(${board.backgroundImage})` }}
                                    />
                                    <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/60 backdrop-blur-[2px] transition-all duration-500 group-hover:backdrop-blur-0" />
                                </>
                            ) : (
                                <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[60px] rounded-full transition-all duration-700 ${isTrashView ? 'bg-slate-200/20 dark:bg-white/5' : 'bg-gradient-to-br from-orange-300/08 to-pink-300/08 group-hover:from-orange-300/15 group-hover:to-pink-300/15'}`}></div>
                            )}

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-8">
                                    <div className={`w-14 h-14 rounded-[1.25rem] border flex items-center justify-center transition-all duration-500 shadow-sm backdrop-blur-sm ${isTrashView ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400' : 'bg-white/50 dark:bg-white/5 border-white/40 dark:border-white/5 text-slate-400 group-hover:text-orange-400 dark:group-hover:text-orange-300 group-hover:scale-110'}`}>
                                        {isTrashView ? <Ban size={24} /> : <FileText size={24} />}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        {!isTrashView ? (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteBoard(board.id); // Soft Delete
                                                    }}
                                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 shadow-sm"
                                                    title="Move to Trash"
                                                >
                                                    <Trash2 size={20} />
                                                </button>

                                                {/* Generate Background Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleGenerateBackground(board.id);
                                                    }}
                                                    disabled={generatingBoardId === board.id}
                                                    className={`p-3 rounded-2xl transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 shadow-sm
                                                        ${generatingBoardId === board.id
                                                            ? 'bg-orange-100 text-orange-500 animate-pulse cursor-wait'
                                                            : 'text-slate-300 hover:text-purple-500 hover:bg-white dark:hover:bg-slate-800'
                                                        }`}
                                                    title="Generate AI Background"
                                                >
                                                    {generatingBoardId === board.id ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRestoreBoard(board.id);
                                                    }}
                                                    className="p-3 text-emerald-500 bg-white dark:bg-slate-800 rounded-2xl transition-all hover:scale-110 shadow-sm border border-emerald-100 dark:border-emerald-500/20"
                                                    title="Restore"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteDialog({ isOpen: true, boardId: board.id });
                                                    }}
                                                    className="p-3 text-red-500 bg-white dark:bg-slate-800 rounded-2xl transition-all hover:scale-110 shadow-sm border border-red-100 dark:border-red-500/20"
                                                    title="Permanently Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-4 flex flex-col gap-1">
                                    <h3 className={`text-2xl font-black transition-all duration-300 leading-tight tracking-tight ${isTrashView ? 'text-slate-500 dark:text-slate-400 line-through decoration-2 decoration-slate-300 dark:decoration-slate-600' : 'text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-pink-400 dark:group-hover:from-orange-400 dark:group-hover:to-pink-300'}`}>
                                        {board.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            {board.cardCount || 0} CARDS
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-8 border-t border-slate-200/30 dark:border-white/5">
                                    <div className="flex flex-col">
                                        {isTrashView ? (
                                            <>
                                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">Expires In</span>
                                                <span className="text-[12px] font-bold text-red-500">{getDaysRemaining(board.deletedAt)} Days</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Last Update</span>
                                                <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400">{new Date(board.updatedAt || Date.now()).toLocaleDateString()}</span>
                                            </>
                                        )}
                                    </div>
                                    {!isTrashView && (
                                        <div className="w-10 h-10 rounded-full bg-white/50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-all duration-500 rotate-0 group-hover:-rotate-45 shadow-sm backdrop-blur-sm">
                                            <ChevronRight size={20} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
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
