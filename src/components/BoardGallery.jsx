import React, { useState, useRef } from 'react';
import { LayoutGrid, Plus, Trash2, Clock, FileText, ChevronRight, Sparkles, X, ArrowRight, Image as ImageIcon, AlertCircle } from 'lucide-react';
import ModernDialog from './ModernDialog';

export default function BoardGallery({ boards, onSelectBoard, onCreateBoard, onDeleteBoard }) {
    const [quickPrompt, setQuickPrompt] = useState('');
    const [images, setImages] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, boardId: null });
    const fileInputRef = useRef(null);

    const handleQuickStart = (e) => {
        if ((!quickPrompt.trim() && images.length === 0)) return;

        // If user pressed Enter (and not holding Shift and not in IME composition)
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault(); // Prevent newline if it was textarea, but here it is input.
            const title = quickPrompt.length > 30 ? quickPrompt.substring(0, 30) + '...' : (quickPrompt || 'New Image Board');
            onCreateBoard(title, quickPrompt, images);
            setQuickPrompt('');
            setImages([]);
        }
    };

    const handleStartClick = () => {
        if ((!quickPrompt.trim() && images.length === 0)) return;
        const title = quickPrompt.length > 30 ? quickPrompt.substring(0, 30) + '...' : (quickPrompt || 'New Image Board');
        onCreateBoard(title, quickPrompt, images);
        setQuickPrompt('');
        setImages([]);
    };

    // --- Image Handling ---
    const processFiles = (files) => {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                setImages(prev => [...prev, {
                    file,
                    previewUrl: URL.createObjectURL(file), // Create object URL for preview
                    base64: e.target.result.split(',')[1],
                    mimeType: file.type
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = (e) => {
        processFiles(e.target.files);
        e.target.value = ''; // Reset input
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        const files = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                files.push(items[i].getAsFile());
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            processFiles(files);
        }
    };

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
        processFiles(e.dataTransfer.files);
    };

    const removeImage = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].previewUrl); // Cleanup memory
            newImages.splice(index, 1);
            return newImages;
        });
    };

    return (
        <div className="min-h-full animate-fade-in custom-scrollbar pb-40">
            {/* Quick Start / Hero Input - Linear Style */}
            <div className="mb-24 relative group max-w-4xl mx-auto mt-8">
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-[2.5rem] blur-3xl transition-opacity duration-1000 ${isDragging ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}></div>

                <div
                    className={`relative glass-panel transition-all duration-500 p-3 rounded-[2.5rem] flex flex-col
                        ${isDragging ? 'border-blue-500 ring-4 ring-blue-500/20 scale-[1.01]' : 'hover:border-white/60 dark:hover:border-white/20 hover:shadow-glow-blue'}
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
                        <div className="pl-6 text-blue-500/80 dark:text-blue-400 my-auto shrink-0">
                            <Sparkles size={28} className="animate-pulse-slow drop-shadow-sm" />
                        </div>

                        <input
                            type="text"
                            value={quickPrompt}
                            onChange={e => setQuickPrompt(e.target.value)}
                            onKeyDown={handleQuickStart}
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
                            className="p-4 text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-white/5 rounded-2xl transition-all mr-2 shrink-0 group-hover:scale-110"
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
                        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center pointer-events-none z-20 border-2 border-dashed border-blue-500/30">
                            <div className="bg-white dark:bg-slate-800 px-8 py-4 rounded-2xl shadow-premium-hover flex items-center gap-4 animate-bounce border border-blue-100 dark:border-white/10">
                                <div className="bg-blue-500 p-2 rounded-xl text-white">
                                    <ImageIcon size={20} />
                                </div>
                                <span className="font-black text-slate-900 dark:text-white tracking-tight">Release to upload</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recently Accessed Section */}
            {boards.length > 0 && (
                <div className="mb-20 animate-fade-in px-2">
                    <div className="flex items-center gap-4 mb-8 pl-2">
                        <div className="w-10 h-10 bg-white/50 dark:bg-white/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-white/60 dark:border-white/10 shadow-sm backdrop-blur-sm">
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
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                                                {board.name}
                                            </h3>
                                            <p className="text-slate-400 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60"></span>
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

            {/* Main Grid: All Boards */}
            <div className="animate-fade-in px-2">
                <div className="flex items-center gap-4 mb-8 pl-2">
                    <div className="w-10 h-10 bg-white/50 dark:bg-white/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-white/60 dark:border-white/10 shadow-sm backdrop-blur-sm">
                        <FileText size={20} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">All Boards</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                    {[...boards].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((board, index) => (
                        <div
                            key={board.id}
                            onClick={() => onSelectBoard(board.id)}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className="group relative glass-card rounded-[2.5rem] p-8 cursor-pointer transition-all duration-500 hover:glass-card-hover flex flex-col min-h-[280px] animate-slide-up overflow-hidden"
                        >
                            {/* Abstract Glow Background */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-[60px] rounded-full group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-all duration-700"></div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-14 h-14 rounded-[1.25rem] bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-500 shadow-sm backdrop-blur-sm">
                                        <FileText size={24} />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteDialog({ isOpen: true, boardId: board.id });
                                        }}
                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50/80 dark:hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100"
                                        title="Delete Board"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>

                                <div className="mb-4 flex flex-col gap-1">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 dark:group-hover:from-indigo-400 dark:group-hover:to-purple-400 transition-all duration-300 leading-tight tracking-tight">
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
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Last Update</span>
                                        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400">{new Date(board.updatedAt || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-all duration-500 rotate-0 group-hover:-rotate-45 shadow-sm backdrop-blur-sm">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {boards.length === 0 && (
                        <div className="col-span-full py-40 glass-panel rounded-[3.5rem] flex flex-col items-center justify-center text-slate-500 animate-fade-in shadow-inner border border-dashed border-slate-300/50 dark:border-white/10">
                            <div className="w-24 h-24 bg-white/80 dark:bg-white/5 shadow-glow-blue rounded-[2rem] flex items-center justify-center mb-8 text-blue-500 backdrop-blur-md">
                                <Sparkles size={40} className="animate-pulse-slow" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">No boards found</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs text-center leading-relaxed">Let's create something extraordinary. Start by typing a prompt above.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Delete Confirmation */}
            <ModernDialog
                isOpen={deleteDialog.isOpen}
                onClose={() => setDeleteDialog({ isOpen: false, boardId: null })}
                onConfirm={() => onDeleteBoard(deleteDialog.boardId)}
                title="Delete Board?"
                message="Are you sure you want to delete this board? This action cannot be undone."
                type="confirm"
            />
        </div>
    );
}

// Local Loader Compatibility
if (typeof window !== 'undefined') {
    window.BoardGallery = BoardGallery;
}
