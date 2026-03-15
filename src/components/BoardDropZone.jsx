import React, { useRef, useState } from 'react';
import { Star, ImageIcon, X } from 'lucide-react';
import useImageUpload from '../hooks/useImageUpload';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * A dedicated component for the board creation interface, 
 * handling text prompts and image uploads.
 */
export default function BoardDropZone({ onCreateBoard, variant = 'default' }) {
    const [quickPrompt, setQuickPrompt] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const isComposingRef = useRef(false);
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
        if (isSubmitting || (!quickPrompt.trim() && images.length === 0)) return;

        setIsSubmitting(true);

        try {
            const submittedImages = images.map((image) => ({ ...image }));
            await onCreateBoard(null, quickPrompt, submittedImages);
            setQuickPrompt('');
            clearImages();
        } catch (error) {
            console.error('[BoardDropZone] Failed to create board:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyPress = (e) => {
        // Submit on Enter (plain or with Cmd/Ctrl)
        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const isCompact = variant === 'compact';

    const outerClassName = isCompact
        ? 'relative mx-auto mb-0 w-full max-w-none'
        : 'mb-12 relative group max-w-4xl mx-auto mt-4';

    const glowClassName = isCompact
        ? 'absolute inset-0 rounded-[1.6rem] bg-gradient-to-r from-cyan-500/10 via-blue-500/8 to-indigo-500/12 blur-xl opacity-70'
        : `absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 rounded-[2.5rem] blur-3xl transition-opacity duration-1000 ${isDragging ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`;

    const frameClassName = isCompact
        ? `relative rounded-[1.5rem] border border-white/10 bg-[#121621]/78 p-0 shadow-none transition-all duration-300 ${isDragging ? 'border-cyan-300/35 ring-2 ring-cyan-300/18' : ''}`
        : `relative glass-card-premium transition-all duration-500 p-4 rounded-[2.5rem] flex flex-col
                    ${isDragging ? 'border-blue-400 ring-4 ring-blue-400/20 scale-[1.01]' : 'hover:border-white/60 dark:hover:border-white/20 hover:shadow-premium-hover'}
                `;

    const previewWrapperClassName = isCompact
        ? 'mb-3 flex gap-2 overflow-x-auto pb-1'
        : 'flex px-8 pt-6 gap-4 overflow-x-auto custom-scrollbar';

    const previewImageClassName = isCompact
        ? 'h-14 w-14 rounded-[1.1rem] border border-white/10 object-cover'
        : 'h-24 w-auto rounded-2xl border border-white dark:border-white/5 shadow-premium object-cover transition-transform group-hover/img:scale-105';

    return (
        <div className={outerClassName}>
            <div className={glowClassName}></div>

            <div
                className={frameClassName}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onPaste={handlePaste}
            >
                {/* Image Preview Section */}
                {images.length > 0 && (
                    <div className={previewWrapperClassName}>
                        {images.map((img, idx) => (
                            <div key={idx} className="relative shrink-0 group/img animate-fade-in-scale">
                                <div className={`absolute -top-2 -right-2 z-10 transition-all duration-300 ${isCompact ? 'opacity-100 scale-100' : 'opacity-0 group-hover/img:opacity-100 scale-75 group-hover/img:scale-100'}`}>
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
                                    className={previewImageClassName}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {isCompact ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={quickPrompt}
                                onChange={e => setQuickPrompt(e.target.value)}
                                onKeyDown={handleKeyPress}
                                onCompositionStart={() => { isComposingRef.current = true; }}
                                onCompositionEnd={() => { isComposingRef.current = false; }}
                                placeholder={t.gallery.whatToCreate}
                                disabled={isSubmitting}
                                className="h-11 min-w-0 flex-1 rounded-[1rem] border border-white/8 bg-white/[0.04] px-4 text-[15px] font-medium tracking-tight text-white outline-none placeholder:text-slate-500"
                            />

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/*"
                                multiple
                                disabled={isSubmitting}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-white/8 bg-white/[0.05] text-slate-300 transition-all active:scale-95"
                                title="Upload Image"
                            >
                                <ImageIcon size={20} strokeWidth={2.1} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-[12px] text-slate-400">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/12 text-cyan-200">
                                    <Star size={15} strokeWidth={2.4} />
                                </span>
                                <span>一句话或一张图，直接开始</span>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || (!quickPrompt.trim() && images.length === 0)}
                                className="inline-flex h-10 min-w-[6.25rem] shrink-0 items-center justify-center rounded-[1rem] bg-cyan-400 px-4 text-[14px] font-black tracking-tight text-slate-950 transition-all active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (t.gallery.creating || '创建中...') : t.gallery.start}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 w-full pl-2">
                        <div className="pl-4 text-blue-500 dark:text-blue-400 my-auto shrink-0">
                            <Star size={24} className="animate-pulse-slow drop-shadow-sm" strokeWidth={2.5} />
                        </div>

                        <input
                            type="text"
                            value={quickPrompt}
                            onChange={e => setQuickPrompt(e.target.value)}
                            onKeyDown={handleKeyPress}
                            onCompositionStart={() => { isComposingRef.current = true; }}
                            onCompositionEnd={() => { isComposingRef.current = false; }}
                            placeholder={t.gallery.whatToCreate}
                            disabled={isSubmitting}
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
                            disabled={isSubmitting}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSubmitting}
                            className="p-4 text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 rounded-2xl transition-all mr-1 shrink-0 group-hover:scale-105 active:scale-95"
                            title="Upload Image"
                        >
                            <ImageIcon size={24} strokeWidth={2} />
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || (!quickPrompt.trim() && images.length === 0)}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-[1.75rem] font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed shrink-0"
                        >
                            {isSubmitting ? (t.gallery.creating || '创建中...') : t.gallery.start}
                        </button>
                    </div>
                )}

                {isDragging && (
                    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 border-2 border-dashed ${isCompact ? 'rounded-[2rem] bg-cyan-400/8 backdrop-blur-sm border-cyan-300/30' : 'bg-blue-500/10 backdrop-blur-md rounded-[2.5rem] border-blue-400/30'}`}>
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
