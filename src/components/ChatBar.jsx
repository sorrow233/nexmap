import React, { useState, useRef, useMemo } from 'react';
import { Star, Loader2, Image as ImageIcon, X, StickyNote as StickyNoteIcon, MessageSquarePlus, Network, LayoutGrid, Plus, Palette, Send, RefreshCw, Sprout, Trash2, BoxSelect, FileText } from 'lucide-react';
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
    onExpandTopics,
    isReadOnly = false
}) {
    const [promptInput, setPromptInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const isComposingRef = useRef(false); // IME 合成状态追踪
    const { t } = useLanguage();

    const handleInput = (e) => {
        if (isReadOnly) return;
        setPromptInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    const handleSubmit = () => {
        if (isReadOnly) return;
        const text = (promptInput || '').trim();
        if (!text && (!globalImages || globalImages.length === 0)) return;
        onSubmit(text, globalImages || []);
        setPromptInput('');
        if (onClearImages) onClearImages();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleBatchSubmit = () => {
        if (isReadOnly) return;
        const text = (promptInput || '').trim();
        if (!text && (!globalImages || globalImages.length === 0)) return;
        onBatchChat(text, globalImages || []);
        setPromptInput('');
        if (onClearImages) onClearImages();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handlePromptSelect = (text) => {
        if (isReadOnly) return;
        const newText = promptInput ? `${promptInput} ${text}` : text;
        setPromptInput(newText);
        // Focus and adjust height
        if (textareaRef.current) {
            textareaRef.current.focus();
            requestAnimationFrame(() => {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
            });
        }
    };

    const handleKeyDown = (e) => {
        if (isReadOnly) return;
        // Enter 直接发送，Shift + Enter 换行
        // 使用 isComposingRef 追踪 IME 状态，防止中文输入法选词时触发发送
        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleDrop = (e) => {
        if (isReadOnly) return;
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
        if (isReadOnly) return "Locked: Another tab is currently active...";
        if (selectedIds.length > 0) return t.chatBar.askAboutSelected.replace('{count}', selectedIds.length);
        return t.chatBar.placeholder || "询问或记录点什么...";
    }, [selectedIds.length, t, isReadOnly]);

    return (
        <div className="absolute bottom-0 inset-x-0 z-50 pointer-events-none safe-bottom px-4 pb-6 md:pb-6">
            <div className="mx-auto w-full max-w-2xl pointer-events-auto">
                <Spotlight spotColor="rgba(6, 182, 212, 0.1)" size={400} className="rounded-[1.2rem]">
                    <motion.div
                        layout
                        className={`
                            relative bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-3xl border border-cyan-100/50 dark:border-white/10 rounded-[1.2rem] 
                            shadow-[0_4px_24px_rgba(6,182,212,0.1)] ring-1 ring-cyan-200/20 dark:ring-white/5 overflow-hidden flex flex-col
                            ${isFocused ? 'ring-cyan-400/30' : 'hover:border-cyan-200/50'}
                            ${isReadOnly ? 'opacity-70 grayscale-[0.3]' : ''}
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
                                            <img src={img.previewUrl} className="h-14 w-auto rounded-lg object-cover border border-slate-100 dark:border-white/10 shadow-sm" alt="preview" />
                                            {!isReadOnly && (
                                                <button
                                                    onClick={() => onRemoveImage(idx)}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                >
                                                    <X size={8} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Instruction Chips */}
                        <AnimatePresence>
                            {!isReadOnly && isFocused && (
                                <div className="px-6 pt-4">
                                    <InstructionChips
                                        instructions={instructions}
                                        onSelect={handlePromptSelect}
                                        onClear={onClearInstructions}
                                    />
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Main Interaction Row */}
                        <div className="flex items-end gap-2 px-6 py-4">
                            {/* Left Functional Icons */}
                            <div className="flex items-center gap-0.5 h-9">
                                <IconButton onClick={() => !isReadOnly && fileInputRef.current?.click()} title={t.chatBar.uploadImage} disabled={isReadOnly}>
                                    <ImageIcon size={16} className={`${isReadOnly ? 'text-slate-300' : 'text-slate-400 hover:text-cyan-400'}`} />
                                </IconButton>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={onImageUpload} disabled={isReadOnly} />

                                <IconButton title="Files" disabled={isReadOnly}>
                                    <FileText size={16} className={`${isReadOnly ? 'text-slate-300' : 'text-slate-400 hover:text-cyan-400'}`} />
                                </IconButton>

                                <div className="w-px h-3 bg-slate-200 dark:bg-white/10 mx-1" />

                                <IconButton onClick={() => !isReadOnly && onCreateNote('', false)} title={t.contextMenu.newNote} disabled={isReadOnly}>
                                    <Plus size={16} className={`${isReadOnly ? 'text-slate-300' : 'text-cyan-400/80 hover:text-cyan-500'}`} />
                                </IconButton>

                                <AnimatePresence mode="popLayout">
                                    {!isReadOnly && selectedIds.length > 0 && (
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="flex items-center"
                                        >
                                            <div className="h-3 w-px bg-slate-200 dark:bg-white/10 mx-1" />
                                            <IconButton onClick={handleBatchSubmit} title={t.chatBar.batchChat}>
                                                <MessageSquarePlus size={16} className="text-cyan-500 hover:text-cyan-600" />
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
                                    onCompositionStart={() => { isComposingRef.current = true; }}
                                    onCompositionEnd={() => { isComposingRef.current = false; }}
                                    onFocus={() => !isReadOnly && setIsFocused(true)}
                                    onBlur={(e) => {
                                        // If the user clicks on an element within the same container (like the IconButton or InstructionChips), 
                                        // don't hide the instructions immediately.
                                        if (e.relatedTarget && e.currentTarget.parentElement.contains(e.relatedTarget)) {
                                            return;
                                        }
                                        setIsFocused(false);
                                    }}
                                    readOnly={isReadOnly}
                                    placeholder={placeholderText}
                                    className={`w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-sans text-[13px] leading-tight py-2.5 max-h-24 scrollbar-hide ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                                    rows={1}
                                />
                            </div>

                            {/* Send Button */}
                            <div className="flex items-center h-9">
                                <motion.button
                                    whileHover={isReadOnly ? {} : { scale: 1.05 }}
                                    whileTap={isReadOnly ? {} : { scale: 0.95 }}
                                    onClick={handleSubmit}
                                    disabled={isReadOnly || (!promptInput.trim() && globalImages.length === 0)}
                                    className={`
                                        relative w-8 h-8 rounded-lg flex items-center justify-center transition-all
                                        ${(isReadOnly || (!promptInput.trim() && globalImages.length === 0))
                                            ? 'bg-slate-50 dark:bg-white/5 text-slate-200 dark:text-slate-800'
                                            : 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:bg-cyan-400'}
                                        ${isReadOnly ? 'cursor-not-allowed' : ''}
                                    `}
                                >
                                    {generatingCardIds.size > 0 ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Send size={14} className={(promptInput.trim() || globalImages.length > 0) && !isReadOnly ? "fill-white" : ""} />
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

const IconButton = ({ children, onClick, title, disabled }) => (
    <button onClick={onClick} disabled={disabled} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all active:scale-95 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`} title={title}>
        {children}
    </button>
);

export default ChatBar;
