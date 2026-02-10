import React, { useState, useRef, useMemo } from 'react';
import { Bot, Loader2, Image as ImageIcon, X, MessageSquarePlus, Plus, Send, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import Spotlight from './shared/Spotlight';
import InstructionChips from './chat/InstructionChips';
import ModelSwitcher from './ModelSwitcher';

/**
 * ChatBar Component - Integrated Card Style Redesign
 * 采用青色系 (Cyan) 极简风格，高度压低至单行感。
 */
const ChatBar = React.memo(function ChatBar({
    selectedIds,
    generatingCardIds,
    isAgentRunning = false,
    onSubmit,
    onAgentSubmit,
    onBatchChat,
    onCreateNote,
    onImageUpload,
    globalImages,
    onRemoveImage,
    onClearImages,
    onPromptDrop,
    instructions = [],
    onClearInstructions,
    isReadOnly = false
}) {
    const [promptInput, setPromptInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isAgentMode, setIsAgentMode] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const isComposingRef = useRef(false); // IME 合成状态追踪
    const { t } = useLanguage();
    const hasInput = !!promptInput.trim() || globalImages.length > 0;
    const canSend = hasInput && !(isAgentMode && isAgentRunning);
    const isSending = generatingCardIds.size > 0 || (isAgentMode && isAgentRunning);

    const handleInput = (e) => {
        if (isReadOnly) return;
        setPromptInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    const handleSubmit = () => {
        if (isReadOnly) return;
        if (isAgentMode && isAgentRunning) return;
        const text = (promptInput || '').trim();
        if (!text && (!globalImages || globalImages.length === 0)) return;
        const submitHandler = isAgentMode && typeof onAgentSubmit === 'function'
            ? onAgentSubmit
            : onSubmit;
        submitHandler(text, globalImages || []);
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

        // Cmd/Ctrl + Enter -> 批量对话 (如果有选中)
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isComposingRef.current && selectedIds.length > 0 && !isAgentMode) {
            e.preventDefault();
            handleBatchSubmit();
            return;
        }

        // Enter 直接发送，Shift + Enter 换行
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

    const placeholderText = useMemo(() => {
        if (isReadOnly) return "Locked: Another tab is currently active...";
        if (isAgentMode) return t.chatBar.agentPlaceholder || "描述你的目标，AI 会先规划卡片再自动生成。";
        if (selectedIds.length > 0) return t.chatBar.askAboutSelected.replace('{count}', selectedIds.length);
        return t.chatBar.placeholder || "询问或记录点什么...";
    }, [isAgentMode, selectedIds.length, t, isReadOnly]);

    const agentHintText = useMemo(() => {
        if (isAgentRunning) {
            return t.chatBar.agentRunning || "AI 正在规划并生成卡片，请稍候...";
        }
        if (selectedIds.length > 0) {
            return (t.chatBar.agentUsesSelection || "将结合 {count} 个已选卡片的上下文进行规划。")
                .replace('{count}', selectedIds.length);
        }
        return t.chatBar.agentHint || "AI 会先决定卡片数量与标题，再自动分发生成。";
    }, [isAgentRunning, selectedIds.length, t]);

    return (
        <div className="absolute bottom-0 inset-x-0 z-50 pointer-events-none safe-bottom px-4 pb-6 md:pb-6">
            <div className="mx-auto w-full max-w-2xl pointer-events-auto">
                <Spotlight spotColor="rgba(6, 182, 212, 0.1)" size={400} className="rounded-[1.2rem]">
                    <motion.div
                        layout
                        className={`
                            relative bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-3xl border border-cyan-100/50 dark:border-white/10 rounded-[1.2rem] 
                            shadow-[0_4px_24px_rgba(6,182,212,0.1)] ring-1 ring-cyan-200/20 dark:ring-white/5 flex flex-col
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

                        <AnimatePresence>
                            {!isReadOnly && isAgentMode && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="px-6 pt-3"
                                >
                                    <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-200 flex items-center gap-2">
                                        {isAgentRunning ? (
                                            <Loader2 size={12} className="animate-spin shrink-0" />
                                        ) : (
                                            <Bot size={12} className="shrink-0" />
                                        )}
                                        <span className="leading-relaxed">{agentHintText}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Main Interaction Row */}
                        <div className="flex items-end gap-2 px-6 py-4">
                            {/* Left Functional Icons */}
                            <div className="flex items-center gap-0.5 h-9">
                                {/* 模型切换器 */}
                                {!isReadOnly && <ModelSwitcher compact={false} />}

                                <div className="w-px h-3 bg-slate-200 dark:bg-white/10 mx-1" />

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

                                {!isReadOnly && typeof onAgentSubmit === 'function' && (
                                    <button
                                        onClick={() => setIsAgentMode(prev => !prev)}
                                        disabled={isAgentRunning}
                                        className={`
                                            ml-1 h-7 px-2 rounded-lg border text-[11px] font-semibold transition-all
                                            ${isAgentMode
                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:text-cyan-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'}
                                            ${isAgentRunning ? 'opacity-60 cursor-not-allowed' : ''}
                                        `}
                                        title={t.chatBar.agentMode || "AI Agent Mode"}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            <Bot size={12} />
                                            {isAgentMode
                                                ? (t.chatBar.agentModeOn || "代理中")
                                                : (t.chatBar.agentMode || "AI代理")}
                                        </span>
                                    </button>
                                )}

                                <AnimatePresence mode="popLayout">
                                    {!isReadOnly && selectedIds.length > 0 && !isAgentMode && (
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
                                    disabled={isReadOnly || !canSend}
                                    className={`
                                        relative w-8 h-8 rounded-lg flex items-center justify-center transition-all
                                        ${(isReadOnly || !canSend)
                                            ? 'bg-slate-50 dark:bg-white/5 text-slate-200 dark:text-slate-800'
                                            : isAgentMode
                                                ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:bg-emerald-400'
                                                : 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:bg-cyan-400'}
                                        ${isReadOnly ? 'cursor-not-allowed' : ''}
                                    `}
                                >
                                    {isSending ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : isAgentMode ? (
                                        <Bot size={14} />
                                    ) : (
                                        <Send size={14} className={canSend && !isReadOnly ? "fill-white" : ""} />
                                    )}
                                </motion.button>
                            </div>
                        </div>


                    </motion.div>
                </Spotlight>
            </div>
        </div >
    );
});

const IconButton = ({ children, onClick, title, disabled }) => (
    <button onClick={onClick} disabled={disabled} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all active:scale-95 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`} title={title}>
        {children}
    </button>
);

export default ChatBar;
