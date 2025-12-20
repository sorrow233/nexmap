import React, { useState, useRef } from 'react';
import { Star, ImageIcon, X } from 'lucide-react';
import useImageUpload from '../hooks/useImageUpload';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * A dedicated component for the board creation interface, 
 * handling text prompts and image uploads.
 */
export default function BoardDropZone({ onCreateBoard }) {
    const [quickPrompt, setQuickPrompt] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const { t } = useLanguage();

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
        // Submit on Enter (plain or with Cmd/Ctrl)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="mb-12 relative group max-w-4xl mx-auto mt-4">
            <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 rounded-[2.5rem] blur-3xl transition-opacity duration-1000 ${isDragging ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}></div>

            <div
                className={`relative glass-card-premium transition-all duration-500 p-4 rounded-[2.5rem] flex flex-col
                    ${isDragging ? 'border-blue-400 ring-4 ring-blue-400/20 scale-[1.01]' : 'hover:border-white/60 dark:hover:border-white/20 hover:shadow-premium-hover'}
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

                <div className="flex items-center gap-4 w-full pl-2">
                    <div className="pl-4 text-blue-500 dark:text-blue-400 my-auto shrink-0">
                        <Star size={24} className="animate-pulse-slow drop-shadow-sm" strokeWidth={2.5} />
                    </div>

                    <input
                        type="text"
                        value={quickPrompt}
                        onChange={e => setQuickPrompt(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={t.gallery.whatToCreate}
                        className="flex-grow bg-transparent border-none outline-none py-6 text-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500/70 font-medium min-w-0 tracking-tight font-inter-tight"
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
                        className="p-4 text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 rounded-2xl transition-all mr-1 shrink-0 group-hover:scale-105 active:scale-95"
                        title="Upload Image"
                    >
                        <ImageIcon size={24} strokeWidth={2} />
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!quickPrompt.trim() && images.length === 0}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-[1.75rem] font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed shrink-0"
                    >
                        {t.gallery.start}
                    </button>
                </div>

                {isDragging && (
                    <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center pointer-events-none z-20 border-2 border-dashed border-blue-400/30">
                        <div className="bg-white dark:bg-slate-800 px-8 py-4 rounded-2xl shadow-premium-hover flex items-center gap-4 animate-bounce border border-blue-100 dark:border-white/10">
                            <div className="bg-blue-500 p-2 rounded-xl text-white">
                                <ImageIcon size={20} />
                            </div>
                            <span className="font-black text-slate-900 dark:text-white tracking-tight">{t.gallery.releaseToUpload}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
