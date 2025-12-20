import React, { useState, useRef, useMemo } from 'react';
import { Sparkles, Loader2, ImageIcon, X, StickyNote as StickyNoteIcon, MessageSquarePlus, Network, LayoutGrid, Copy, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import Spotlight from './shared/Spotlight';

/**
 * ChatBar Component - 深度重构版 [Exquisite, Elegant, Compact]
 */
const ChatBar = React.memo(function ChatBar({
    cards,
    selectedIds,
    generatingCardIds,
    onSubmit,
    onCreateNote,
    onExpandTopics,
    onImageUpload,
    globalImages,
    onRemoveImage,
    onClearImages,
    onBatchChat,
    onSelectConnected,
    onLayoutGrid,
    onPromptDrop,
    instructions = [],
    onClearInstructions
}) {
    const [promptInput, setPromptInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const globalPromptInputRef = useRef(null);
    const globalFileInputRef = useRef(null);
    const { t } = useLanguage();

    const handleSubmit = () => {
        if (!promptInput.trim() && globalImages.length === 0) return;
        onSubmit(promptInput, globalImages);
        setPromptInput('');
        if (globalPromptInputRef.current) {
            globalPromptInputRef.current.style.height = 'auto';
        }
        if (onClearImages) onClearImages();
    };

    const handleBatchSubmit = () => {
        if (!promptInput.trim() && globalImages.length === 0) return;
        onBatchChat(promptInput, globalImages);
        setPromptInput('');
        if (globalPromptInputRef.current) {
            globalPromptInputRef.current.style.height = 'auto';
        }
        if (onClearImages) onClearImages();
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
            if (data.type === 'prompt') {
                onPromptDrop && onPromptDrop(data);
                if (globalPromptInputRef.current) {
                    globalPromptInputRef.current.focus();
                }
            }
        } catch (err) { }
    };

    const handleInput = (e) => {
        setPromptInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    const activeCards = cards.filter(c => !c.deletedAt);
    const placeholderText = useMemo(() => {
        if (activeCards.length === 0) return t.chatBar.startNewBoard;
        if (selectedIds.length > 0) return t.chatBar.askAboutSelected.replace('{count}', selectedIds.length);
        return t.chatBar.typeToCreate;
    }, [activeCards.length, selectedIds.length, t]);

    const hasMarkedTopics = selectedIds.length === 1 &&
        activeCards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0;

    return (
        <div className="absolute bottom-0 inset-x-0 z-50 pointer-events-none safe-bottom px-4 pb-4 md:pb-8">
            <div className="mx-auto w-full max-w-4xl pointer-events-auto">
                <Spotlight spotColor="rgba(99, 102, 241, 0.15)" size={600} className="rounded-full">
                    <motion.div
                        layout
                        className={`
                            relative bg-[#111111]/85 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] 
                            shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5 overflow-hidden
                            transition-all duration-500 ease-out
                            ${isFocused ? 'ring-indigo-500/40 shadow-indigo-500/10' : 'hover:border-white/20'}
                        `}
                    >
                        <div className="flex items-center gap-1 p-2 pl-3">

                            {/* --- 附件工具栏 (固定显示) --- */}
                            <div className="flex items-center gap-1 mr-1">
                                <IconButton
                                    onClick={() => globalFileInputRef.current?.click()}
                                    title={t.chatBar.uploadImage}
                                >
                                    <ImageIcon size={19} className="text-slate-400 group-hover:text-white transition-colors" />
                                </IconButton>
                                <input type="file" ref={globalFileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => onImageUpload(e.target.files)} />

                                <IconButton
                                    onClick={() => onCreateNote('', false)}
                                    title={t.chatBar.addStickyNote}
                                    className="hidden sm:flex"
                                >
                                    <StickyNoteIcon size={19} className="text-slate-400 group-hover:text-white transition-colors" />
                                </IconButton>
                            </div>

                            {/* --- 分隔线 (动态) --- */}
                            <AnimatePresence>
                                {(selectedIds.length > 0 || hasMarkedTopics) && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        className="w-px h-6 bg-white/10 mx-1 shrink-0"
                                    />
                                )}
                            </AnimatePresence>

                            {/* --- 操作工具栏 (根据选中项显示) --- */}
                            <div className="flex items-center gap-1 overflow-hidden">
                                <AnimatePresence mode="popLayout">
                                    {hasMarkedTopics && (
                                        <motion.div key="topics" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                                            <button
                                                onClick={() => onExpandTopics(selectedIds[0])}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 rounded-full transition-all group shrink-0"
                                            >
                                                <Sparkles size={16} className="text-purple-400 animate-pulse" />
                                                <span className="text-[11px] font-bold uppercase tracking-tight">{t.chatBar.topics}</span>
                                            </button>
                                        </motion.div>
                                    )}

                                    {selectedIds.length > 0 && (
                                        <motion.div
                                            key="selection-tools"
                                            className="flex items-center gap-1"
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: -20, opacity: 0 }}
                                        >
                                            <IconButton
                                                onClick={() => {
                                                    const selectedContent = selectedIds.map(id => {
                                                        const card = cards.find(c => c.id === id);
                                                        if (!card?.data?.messages) return '';
                                                        const lastMsg = card.data.messages[card.data.messages.length - 1];
                                                        const content = lastMsg?.content;
                                                        return Array.isArray(content) ? content.filter(p => p.type === 'text').map(p => p.text).join(' ') : (content || '');
                                                    }).filter(Boolean).join('\n\n---\n\n');
                                                    navigator.clipboard.writeText(selectedContent).catch(() => { });
                                                }}
                                                title={t.common?.copy || "Copy"}
                                            >
                                                <Copy size={18} className="text-indigo-400 group-hover:text-indigo-300" />
                                            </IconButton>

                                            <IconButton onClick={() => onSelectConnected(selectedIds[0])} title={t.chatBar.selectConnected}>
                                                <Network size={18} className="text-cyan-400 group-hover:text-cyan-300" />
                                            </IconButton>

                                            <IconButton onClick={() => onLayoutGrid && onLayoutGrid()} title={t.chatBar.gridLayout}>
                                                <LayoutGrid size={18} className="text-pink-400 group-hover:text-pink-300" />
                                            </IconButton>

                                            <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* --- 输入区域 --- */}
                            <div className="flex-1 min-w-0 flex flex-col pt-1" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                                <AnimatePresence>
                                    {instructions.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="flex flex-wrap gap-2 px-1 mb-2 overflow-hidden"
                                        >
                                            {instructions.map((inst, idx) => (
                                                <div key={idx} className="flex items-center gap-1 bg-indigo-500/20 text-indigo-200 text-[10px] px-2 py-0.5 rounded-full border border-indigo-500/30">
                                                    <Plus size={10} className="rotate-45 opacity-60" />
                                                    <span className="truncate max-w-[120px] font-medium">{inst.text}</span>
                                                    <button onClick={() => onClearInstructions && onClearInstructions()} className="hover:text-white transition-colors ml-0.5 border-l border-white/10 pl-1"><X size={10} /></button>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <textarea
                                    ref={globalPromptInputRef}
                                    value={promptInput}
                                    onInput={handleInput}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    placeholder={placeholderText}
                                    className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-[15px] font-normal leading-relaxed py-2 focus:outline-none resize-none overflow-y-auto max-h-[160px] min-h-[40px] scrollbar-hide px-1"
                                    rows={1}
                                />

                                <AnimatePresence>
                                    {globalImages.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            className="flex gap-2 py-2 overflow-x-auto no-scrollbar overflow-hidden"
                                        >
                                            {globalImages.map((img, index) => (
                                                <div key={index} className="relative group shrink-0">
                                                    <img src={img.previewUrl} alt="Upload" className="w-14 h-14 object-cover rounded-xl border border-white/10 ring-1 ring-black/50" />
                                                    <button onClick={() => onRemoveImage(index)} className="absolute -top-1.5 -right-1.5 bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all border border-white/10 shadow-lg"><X size={10} /></button>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* --- 发送区域 --- */}
                            <div className="flex items-center gap-2 pr-1">
                                <AnimatePresence>
                                    {selectedIds.length > 0 && (
                                        <motion.button
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            onClick={handleBatchSubmit}
                                            disabled={!promptInput.trim() && globalImages.length === 0}
                                            className="p-3 text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 relative"
                                            title={t.chatBar.appendToChat}
                                        >
                                            <MessageSquarePlus size={20} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSubmit}
                                    disabled={!promptInput.trim() && globalImages.length === 0}
                                    className={`
                                        relative p-3.5 rounded-full flex items-center justify-center transition-all shadow-xl
                                        ${(!promptInput.trim() && globalImages.length === 0)
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                            : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'}
                                    `}
                                >
                                    {generatingCardIds.size > 0 ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={20} className={promptInput.trim() || globalImages.length > 0 ? "fill-white" : ""} />
                                    )}

                                    {/* 呼吸灯特效 (仅在有输入时显示) */}
                                    {(promptInput.trim() || globalImages.length > 0) && (
                                        <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
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

/**
 * 助手组件：圆角图标按钮
 */
const IconButton = ({ children, onClick, title, className = "" }) => (
    <button
        onClick={onClick}
        className={`group p-2.5 hover:bg-white/5 rounded-full transition-all active:scale-90 flex items-center justify-center ${className}`}
        title={title}
    >
        {children}
    </button>
);

export default ChatBar;
