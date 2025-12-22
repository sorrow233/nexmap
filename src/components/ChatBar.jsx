import React, { useState, useRef, useMemo } from 'react';
import { Star, Loader2, Image as ImageIcon, X, StickyNote as StickyNoteIcon, MessageSquarePlus, Network, LayoutGrid, Plus, Palette, Send, RefreshCw, Sprout, Trash2, BoxSelect } from 'lucide-react';
 Greenlandimport { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import Spotlight from './shared/Spotlight';

/**
 * ChatBar Component - Integrated Card Style Redesign
 * 参考用户提供的参考图：大圆角卡片、底部功能区、独立发送按钮
 */
const ChatBar = React.memo(function ChatBar({
    cards,
    selectedIds,
    generatingCardIds,
    onSubmit,
    onBatchChat,
    onCreateNote,
    onImageUpload,
    globalImages,
    onRemoveImage,
    onClearImages,
    onSelectConnected,
    onLayoutGrid,
    onPromptDrop,
    onRegenerate,
    onSprout,
    onDelete,
    onGroup,
    instructions = [],
    onClearInstructions,
    onExpandTopics
}) {
 Greenland    const [promptInput, setPromptInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const { t } = useLanguage();

    // 自动调节高度
    const handleInput = (e) => {
        setPromptInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    };

    const handleSubmit = () => {
        if (!promptInput.trim() && globalImages.length === 0) return;
        onSubmit(promptInput, globalImages);
        setPromptInput('');
        if (onClearImages) onClearImages();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleQuickSend = (text) => {
        if (selectedIds.length > 0 && onBatchChat) {
            onBatchChat(selectedIds, text, []);
        } else {
            onSubmit(text, []);
        }
        setPromptInput('');
        if (onClearImages) onClearImages();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'prompt' && onPromptDrop) {
                onPromptDrop(data.content);
            }
        } catch (err) { }
    };

    const activeCards = cards.filter(c => !c.deletedAt);
    const hasMarkedTopics = useMemo(() => {
        if (selectedIds.length !== 1) return false;
        const card = activeCards.find(c => c.id === selectedIds[0]);
        return (card?.data?.marks?.length || 0) > 0;
    }, [activeCards, selectedIds]);

    const placeholderText = useMemo(() => {
        if (selectedIds.length > 0) return t.chatBar.askAboutSelected.replace('{count}', selectedIds.length);
        return t.chatBar.placeholder || "记录一闪而过的念头...";
    }, [selectedIds.length, t]);

    return (
        <div className="absolute bottom-0 inset-x-0 z-50 pointer-events-none safe-bottom px-4 pb-6 md:pb-6">
            <div className="mx-auto w-full max-w-md pointer-events-auto">
                <Spotlight spotColor="rgba(244, 114, 182, 0.1)" size={400} className="rounded-[1.5rem]">
                    <motion.div
                        layout
                        className={`
                            relative bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-3xl border border-pink-100/50 dark:border-white/10 rounded-[1.5rem] 
                            shadow-[0_8px_32px_rgba(244,114,182,0.1)] ring-1 ring-pink-200/20 dark:ring-white/5 overflow-hidden flex flex-col
                            ${isFocused ? 'ring-pink-300/40 shadow-xl' : 'hover:border-pink-200/50'}
                        `}
                    >
                        {/* Image Preview List */}
                        <AnimatePresence>
                            {globalImages.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="flex gap-3 px-8 pt-6 overflow-x-auto no-scrollbar"
                                >
                                    {globalImages.map((img, idx) => (
                                        <div key={idx} className="relative shrink-0 group/img">
                                            <img src={img.previewUrl} className="h-16 w-auto rounded-xl object-cover border border-slate-100 dark:border-white/10 shadow-sm" alt="preview" />
                                            <button
                                                onClick={() => onRemoveImage(idx)}
                                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Textarea Area */}
                        <div
                            className="px-6 pt-4 pb-1"
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <AnimatePresence>
                                {instructions.length > 0 && (
                                    <motion.div
                                        initial={{ y: 5, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="mb-2"
                                    >
                                        <div className="bg-pink-500/10 text-pink-600 dark:text-pink-300 text-[10px] px-2 py-0.5 rounded-full border border-pink-500/20 flex items-center gap-1.5 w-fit font-bold">
                                            <Star size={8} fill="currentColor" />
                                            <span>指令生效中</span>
                                            <button onClick={onClearInstructions} className="hover:text-pink-700 transition-colors ml-1 border-l border-pink-500/20 pl-1"><X size={8} /></button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <textarea
                                ref={textareaRef}
                                value={promptInput}
                                onInput={handleInput}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={placeholderText}
                                className="w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-sans text-sm leading-relaxed max-h-[100px] scrollbar-hide"
                                rows={1}
                            />
                        </div>

                        {/* Prompt Tags Integration */}
                        <AnimatePresence>
                            {instructions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="px-6 pb-2 -mt-1 flex flex-wrap gap-1.5 overflow-hidden"
                                >
                                    {instructions.map((inst, idx) => {
                                        const colors = [
                                            'bg-rose-50 text-rose-500 border-rose-200/50 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
                                            'bg-amber-50 text-amber-500 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
                                            'bg-emerald-50 text-emerald-500 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
                                            'bg-sky-50 text-sky-500 border-sky-200/50 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
                                            'bg-indigo-50 text-indigo-500 border-indigo-200/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
                                        ];
                                        const colorClass = colors[idx % colors.length];
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleQuickSend(inst.content || inst.text)}
                                                className={`flex items-center gap-1 px-2.5 py-0.5 ${colorClass} rounded-full border text-[10px] font-bold transition-all active:scale-90 shrink-0 shadow-sm`}
                                            >
                                                <Send size={8} className="fill-current" />
                                                <span className="truncate max-w-[80px]">{inst.name || inst.text}</span>
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer Action Bar */}
                        <div className="flex items-center justify-between px-6 pb-5 pt-1">
                            {/* Left: Functional Icons */}
                            <div className="flex items-center gap-1">
                                <IconButton onClick={() => fileInputRef.current?.click()}>
                                    <ImageIcon size={18} className="text-slate-400 dark:text-slate-500 hover:text-pink-400 transition-colors" />
                                </IconButton>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => onImageUpload(e.target.files)} />

                                <IconButton onClick={() => onCreateNote('', false)}>
                                    <StickyNoteIcon size={18} className="text-slate-400 dark:text-slate-500 hover:text-amber-400 transition-colors" />
                                </IconButton>

                                <AnimatePresence mode="popLayout">
                                    {selectedIds.length > 0 && (
                                        <motion.div
                                            initial={{ width: 0, opacity: 0, x: -10 }}
                                            animate={{ width: 'auto', opacity: 1, x: 0 }}
                                            exit={{ width: 0, opacity: 0, x: -10 }}
                                            className="flex items-center overflow-hidden"
                                        >
                                            <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-2" />
                                            <div className="flex items-center gap-1">
                                                {selectedIds.length > 1 && (
                                                    <IconButton onClick={() => onBatchChat(selectedIds)} title="Batch Chat">
                                                        <MessageSquarePlus size={18} className="text-indigo-400 group-hover:text-indigo-500" />
                                                    </IconButton>
                                                )}
                                                <IconButton onClick={() => onRegenerate && onRegenerate()} title="Regenerate">
                                                    <RefreshCw size={18} className="text-blue-400 group-hover:text-blue-500" />
                                                </IconButton>
                                                <IconButton onClick={() => onSprout && selectedIds.forEach(id => onSprout(id))} title="Sprout">
                                                    <Sprout size={18} className="text-emerald-400 group-hover:text-emerald-500" />
                                                </IconButton>
                                                <IconButton onClick={() => onGroup && onGroup(selectedIds)} title="Create Group">
                                                    <BoxSelect size={18} className="text-purple-400 group-hover:text-purple-500" />
                                                </IconButton>
                                                <IconButton onClick={() => onSelectConnected(selectedIds[0])} title="Select Connected">
                                                    <Network size={18} className="text-cyan-400 group-hover:text-cyan-500" />
                                                </IconButton>
                                                <IconButton onClick={() => onLayoutGrid && onLayoutGrid()} title="Layout Grid">
                                                    <LayoutGrid size={18} className="text-sky-400 group-hover:text-sky-500" />
                                                </IconButton>
                                                <IconButton onClick={() => onDelete && onDelete()} title="Delete">
                                                    <Trash2 size={18} className="text-red-400 group-hover:text-red-500" />
                                                </IconButton>

                                                {hasMarkedTopics && (
                                                    <button
                                                        onClick={() => onExpandTopics(selectedIds[0])}
                                                        className="flex items-center gap-1 px-2 py-1 bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 rounded-lg transition-all shrink-0 ml-1 border border-pink-500/20"
                                                    >
                                                        <Star size={10} className="fill-current" />
                                                        <span className="text-[10px] font-black uppercase tracking-tighter">Topics</span>
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                Greenland                            </div>

                            {/* Right: Meta & Send */}
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest hidden sm:block">
                                    CMD + ENTER
                                </span>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSubmit}
                                    disabled={(!promptInput.trim() && globalImages.length === 0)}
                                    className={`
                                        relative w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg
                                        ${(!promptInput.trim() && globalImages.length === 0)
                                            ? 'bg-pink-50/50 dark:bg-pink-500/5 text-pink-200 dark:text-pink-900 cursor-not-allowed border border-pink-100/20 dark:border-pink-500/10'
                                            : 'bg-gradient-to-br from-pink-400 via-pink-500 to-rose-500 text-white shadow-pink-200/50 hover:shadow-pink-400/50 border border-white/20'}
                                    `}
                                >
                                    {generatingCardIds.size > 0 ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={18} className={(promptInput.trim() || globalImages.length > 0) ? "fill-white" : ""} />
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </Spotlight>
            </div>
        </div>
    );
});

/**
 * Helper: Icon Button with Hover & Tap Feedback
 */
const IconButton = ({ children, onClick, title, className = "" }) => (
    <button
        onClick={onClick}
        className={`group p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all active:scale-90 flex items-center justify-center shrink-0 ${className}`}
        title={title}
    >
        {children}
    </button>
);

export default ChatBar;
