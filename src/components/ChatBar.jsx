import React, { useState, useRef, useMemo } from 'react';
import { Star, Loader2, Image as ImageIcon, X, StickyNote as StickyNoteIcon, MessageSquarePlus, Network, LayoutGrid, Copy, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import Spotlight from './shared/Spotlight';

/**
 * ChatBar Component - Flow Studio Inspired Redesign
 * 极致精致、优雅、紧凑的 AI 交互入口
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
    instructions = [],
    onClearInstructions,
    onExpandTopics
}) {
    const [promptInput, setPromptInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const { t } = useLanguage();

    // 自动调节高度
    const handleInput = (e) => {
        setPromptInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
    };

    const handleSubmit = () => {
        if (!promptInput.trim() && globalImages.length === 0) return;
        onSubmit(promptInput, globalImages);
        setPromptInput('');
        if (onClearImages) onClearImages();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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
        return t.chatBar.placeholder || "完善这个想法...";
    }, [selectedIds.length, t]);

    return (
        <div className="absolute bottom-0 inset-x-0 z-50 pointer-events-none safe-bottom px-4 pb-4 md:pb-8">
            <div className="mx-auto w-full max-w-4xl pointer-events-auto">
                <Spotlight spotColor="rgba(99, 102, 241, 0.15)" size={600} className="rounded-[2.5rem]">
                    <motion.div
                        layout
                        className={`
                            relative bg-[#0d0d0d]/85 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] 
                            shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5 overflow-hidden
                            ${isFocused ? 'ring-indigo-500/40 shadow-indigo-500/10' : 'hover:border-white/20'}
                        `}
                    >
                        {/* Image Preview List */}
                        <AnimatePresence>
                            {globalImages.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="flex gap-3 px-6 pt-4 overflow-x-auto no-scrollbar"
                                >
                                    {globalImages.map((img, idx) => (
                                        <div key={idx} className="relative shrink-0 group/img">
                                            <img src={img.previewUrl} className="h-16 w-auto rounded-xl object-cover border border-white/10 shadow-lg" alt="preview" />
                                            <button
                                                onClick={() => onRemoveImage(idx)}
                                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-xl opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-center gap-1 p-2 pl-3">
                            {/* --- Left Tools (Attached/Generic) --- */}
                            <div className="flex items-center">
                                <IconButton onClick={() => fileInputRef.current?.click()} title={t.chatBar.uploadImg}>
                                    <ImageIcon size={20} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                </IconButton>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => onImageUpload(e.target.files)} />

                                <IconButton onClick={() => onCreateNote('', false)} title={t.chatBar.addStickyNote}>
                                    <StickyNoteIcon size={20} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
                                </IconButton>
                            </div>

                            {/* --- Dynamic Actions (Selection Based) --- */}
                            <AnimatePresence mode="popLayout">
                                {(selectedIds.length > 0 || hasMarkedTopics) && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0, x: -10 }}
                                        animate={{ width: 'auto', opacity: 1, x: 0 }}
                                        exit={{ width: 0, opacity: 0, x: -10 }}
                                        className="flex items-center overflow-hidden"
                                    >
                                        <div className="h-6 w-px bg-white/10 mx-2" />
                                        <div className="flex items-center gap-1">
                                            {selectedIds.length > 1 && (
                                                <IconButton onClick={() => onBatchChat(selectedIds)} title={t.chatBar.batchChat}>
                                                    <MessageSquarePlus size={20} className="text-indigo-400" />
                                                </IconButton>
                                            )}
                                            {selectedIds.length > 0 && (
                                                <>
                                                    <IconButton onClick={() => onSelectConnected(selectedIds[0])} title={t.chatBar.selectRelated}>
                                                        <Network size={20} className="text-emerald-400" />
                                                    </IconButton>
                                                    <IconButton onClick={() => onLayoutGrid && onLayoutGrid()} title={t.chatBar.gridLayout}>
                                                        <LayoutGrid size={20} className="text-sky-400" />
                                                    </IconButton>
                                                </>
                                            )}
                                            {hasMarkedTopics && (
                                                <button
                                                    onClick={() => onExpandTopics(selectedIds[0])}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 rounded-full transition-all group shrink-0 ml-1"
                                                >
                                                    <Star size={14} className="text-purple-400 animate-pulse" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">{t.chatBar.topics}</span>
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* --- Input Field --- */}
                            <div
                                className="flex-1 relative mx-2 flex flex-col pt-0.5"
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <AnimatePresence>
                                    {instructions.length > 0 && (
                                        <motion.div
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="pb-1"
                                        >
                                            <div className="bg-indigo-600/20 text-indigo-300 text-[9px] px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1.5 w-fit">
                                                <Plus size={8} className="rotate-45" />
                                                <span>指令生效中</span>
                                                <button onClick={onClearInstructions} className="hover:text-white transition-colors ml-1 border-l border-white/10 pl-1"><X size={8} /></button>
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
                                    className="w-full bg-transparent outline-none resize-none py-2 text-slate-100 placeholder:text-slate-600 font-sans text-[15px] max-h-[180px] scrollbar-hide"
                                    rows={1}
                                />
                            </div>

                            {/* --- Send Button --- */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSubmit}
                                disabled={(!promptInput.trim() && globalImages.length === 0)}
                                className={`
                                    relative p-3.5 rounded-full flex items-center justify-center transition-all shadow-xl
                                    ${(!promptInput.trim() && globalImages.length === 0)
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                        : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'}
                                `}
                            >
                                {generatingCardIds.size > 0 ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Star size={18} className={promptInput.trim() || globalImages.length > 0 ? "fill-white" : ""} />
                                )}

                                {/* Breathing Light Effect */}
                                {(promptInput.trim() || globalImages.length > 0) && (
                                    <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                                )}
                            </motion.button>
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
        className={`group p-2.5 hover:bg-white/5 rounded-full transition-all active:scale-90 flex items-center justify-center shrink-0 ${className}`}
        title={title}
    >
        {children}
    </button>
);

export default ChatBar;
