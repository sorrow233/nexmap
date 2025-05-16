import React, { useState, useRef } from 'react';
import { Sparkles, ImageIcon, X } from 'lucide-react';
import useImageUpload from '../hooks/useImageUpload';

/**
 * A dedicated component for the board creation interface, 
 * handling text prompts and image uploads.
 */
export default function BoardDropZone({ onCreateBoard }) {
    const [quickPrompt, setQuickPrompt] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const {
        images,
        handleImageUpload,
        handlePaste,
        handleDrop: hookHandleDrop,
        removeImage,
        clearImages
    } = useImageUpload();

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

    return (
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
                        onClick={handleSubmit}
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
    );
}
