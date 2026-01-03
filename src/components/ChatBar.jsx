import React, { useState, useRef, useMemo } from 'react';
import { Star, Loader2, Image as ImageIcon, X, StickyNote as StickyNoteIcon, MessageSquarePlus, Network, LayoutGrid, Plus, Palette, Send, RefreshCw, Sprout, Trash2, BoxSelect } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import Spotlight from './shared/Spotlight';
import InstructionChips from './chat/InstructionChips';
import { getColorForString } from '../utils/colors';

/**
 * ChatBar Component - Integrated Card Style Redesign
 * 采用青色系 (Cyan) 极简风格，高度压低至单行感。
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
    const [promptInput, setPromptInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const { t } = useLanguage();

    const handleInput = (e) => {
        setPromptInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    const handleSubmit = () => {
        const text = (promptInput || '').trim();
        if (!text && (!globalImages || globalImages.length === 0)) return;
        onSubmit(text, globalImages || []);
        setPromptInput('');
        if (onClearImages) onClearImages();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleBatchSubmit = () => {
        const text = (promptInput || '').trim();
        if (!text && (!globalImages || globalImages.length === 0)) return;
        onBatchChat(text, globalImages || []);
        setPromptInput('');
        if (onClearImages) onClearImages();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleQuickSend = (text) => {
        onSubmit(text, []);
        setPromptInput('');
        if (onClearImages) onClearImages();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        // Enter 直接发送，Shift + Enter 换行
        if (e.key === 'Enter' && !e.shiftKey) {
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
        return t.chatBar.placeholder || "询问或记录点什么...";
    }, [selectedIds.length, t]);

    return (
        <div className="absolute bottom-0 inset-x-0 z-50 pointer-events-none safe-bottom px-4 pb-6 md:pb-6">
            <div className="mx-auto w-full max-w-lg pointer-events-auto">
                <Spotlight spotColor="rgba(6, 182, 212, 0.1)" size={400} className="rounded-[1.2rem]">
                    <motion.div
                        layout
                        className={`
                            relative bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-3xl border border-cyan-100/50 dark:border-white/10 rounded-[1.2rem] 
                            shadow-[0_4px_24px_rgba(6,182,212,0.1)] ring-1 ring-cyan-200/20 dark:ring-white/5 overflow-hidden flex flex-col
                            ${isFocused ? 'ring-cyan-400/30' : 'hover:border-cyan-200/50'}
                        `}
                    >
                        {/* Image Previews */}
                        <AnimatePresence>
                            {globalImages.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="flex gap-2 px-6 pt-4 overflow-x-auto no-scrollbar"
                                >
                                    {globalImages.map((img, idx) => (
                                        <div key={idx} className="relative shrink-0 group/img">
                                            <img src={img.previewUrl} className="h-12 w-auto rounded-lg object-cover border border-slate-100 dark:border-white/10 shadow-sm" alt="preview" />
                                            <button
                                                onClick={() => onRemoveImage(idx)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            >
                                                <X size={8} />
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Instruction Chips */}
                        <div className="px-6 pt-4">
                            <InstructionChips
                                instructions={instructions}
                                onSelect={handleQuickSend}
                                onClear={onClearInstructions}
                            />
                        </div>

                        {/* Main Interaction Row */}
                        <div className="flex items-end gap-2 px-6 py-4">
                            {/* Left Functional Icons */}
                            <div className="flex items-center gap-0.5 h-9">
                                <IconButton onClick={() => fileInputRef.current?.click()} title={t.chatBar.uploadImage}>
                                    <ImageIcon size={16} className="text-slate-400 hover:text-cyan-400" />
                                </IconButton>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => onImageUpload(e.target.files)} />

                                <IconButton onClick={() => onCreateNote('', false)} title={t.contextMenu.newNote}>
                                    <StickyNoteIcon size={16} className="text-slate-400 hover:text-cyan-400" />
                                </IconButton>

                                <AnimatePresence mode="popLayout">
                                    {selectedIds.length > 0 && (
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="flex items-center"
                                        >
                                            <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1.5" />
                                            <IconButton onClick={handleBatchSubmit} title={t.chatBar.batchChat}>
                                                <MessageSquarePlus size={16} className="text-cyan-400 hover:text-cyan-500" />
                                            </IconButton>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Textarea */}
                            <div className="flex-1" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                                <textarea
                                    ref={textareaRef}
                                    value={promptInput}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder={placeholderText}
                                    className="w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-sans text-[13px] leading-tight py-2.5 max-h-24 scrollbar-hide"
                                    rows={1}
                                />
                            </div>

                            {/* Send Button */}
                            <div className="flex items-center h-9">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSubmit}
                                    disabled={(!promptInput.trim() && globalImages.length === 0)}
                                    className={`
                                        relative w-8 h-8 rounded-lg flex items-center justify-center transition-all
                                        ${(!promptInput.trim() && globalImages.length === 0)
                                            ? 'bg-slate-50 dark:bg-white/5 text-slate-200 dark:text-slate-800'
                                            : 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:bg-cyan-400'}
                                    `}
                                >
                                    {generatingCardIds.size > 0 ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Send size={14} className={(promptInput.trim() || globalImages.length > 0) ? "fill-white" : ""} />
                                    )}
                                </motion.button>
                            </div>
                        </div>

                        {/* Selection Context Toolbar */}
                        <AnimatePresence>
                            {selectedIds.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-6 pb-3 pt-0 flex items-center gap-1 overflow-x-auto no-scrollbar"
                                >
                                    <MiniActionBtn onClick={() => onRegenerate && onRegenerate()} icon={<RefreshCw size={10} />} color="text-blue-400" />
                                    <MiniActionBtn onClick={() => onSprout && selectedIds.forEach(id => onSprout(id))} icon={<Sprout size={10} />} color="text-emerald-400" />
                                    <MiniActionBtn onClick={() => onGroup && onGroup(selectedIds)} icon={<BoxSelect size={10} />} color="text-purple-400" />
                                    <MiniActionBtn onClick={() => onDelete && onDelete()} icon={<Trash2 size={10} />} color="text-red-400" />
                                    <div className="flex-1" />
                                    <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter">
                                        {selectedIds.length} {t.chatBar.selected}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </Spotlight>
            </div>
        </div>
    );
});

const IconButton = ({ children, onClick, title }) => (
    <button onClick={onClick} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all active:scale-95" title={title}>
        {children}
    </button>
);

const MiniActionBtn = ({ onClick, icon, color }) => (
    <button onClick={onClick} className={`p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-all ${color}`}>
        {icon}
    </button>
);

export default ChatBar;
