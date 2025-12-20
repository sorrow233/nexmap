import React, { useMemo } from 'react';
import { X, Send, Image as ImageIcon, Square, Send as SendIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ChatInput Component - Integrated Card Style
 * 支持顶部输入，底部操作区，以及画布 Prompt 标签集成。
 */
export default function ChatInput({
    input,
    setInput,
    handleSend,
    handlePaste,
    handleImageUpload,
    images,
    removeImage,
    fileInputRef,
    isStreaming,
    onStop,
    placeholder,
    instructions = []
}) {
    // 自动增长高度逻辑可以在这里内联或由外部控制，ChatInput 以前是固定 h-12
    // 为了对齐 ChatBar，我们引入简单的自动增长高度
    const handleTextareaInput = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    };

    const handleQuickSend = (text) => {
        if (isStreaming) return;
        // 如果当前有输入，拼接到后面或直接替换？用户要求“选中发出”
        // 这里采取直接发送指令文本的策略
        handleSend(text);
    };

    const canSend = input.trim() || images.length > 0;

    return (
        <div className="p-4 sm:p-8 pb-10 shrink-0">
            <div className="max-w-4xl mx-auto w-full relative">
                <motion.div
                    layout
                    className="relative bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-3xl rounded-[2.5rem] border border-pink-100/50 dark:border-white/10 shadow-[0_8px_32px_rgba(244,114,182,0.1)] ring-1 ring-pink-200/20 dark:ring-white/5 overflow-hidden flex flex-col transition-all focus-within:ring-pink-300/40"
                >
                    {/* Images Container */}
                    <AnimatePresence>
                        {images.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="flex gap-4 p-6 pb-2 overflow-x-auto no-scrollbar"
                            >
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative shrink-0 group/img">
                                        <img src={img.previewUrl} className="h-20 w-auto rounded-xl object-cover border border-slate-100 dark:border-white/10 shadow-sm" alt="preview" />
                                        <button
                                            onClick={() => removeImage(idx)}
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
                    <div className="px-8 pt-6 pb-2">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onInput={handleTextareaInput}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            onPaste={handlePaste}
                            className="w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-sans text-lg leading-relaxed max-h-[160px] scrollbar-hide"
                            placeholder={placeholder}
                            rows={1}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col gap-3 px-6 pb-6 pt-2">
                        {/* Prompt Tags (Only if instructions exist) */}
                        <AnimatePresence>
                            {instructions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-wrap gap-2 mb-1"
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
                                                onClick={() => handleQuickSend(inst.text)}
                                                disabled={isStreaming}
                                                className={`group flex items-center gap-1.5 px-3 py-1 ${colorClass} rounded-full border transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shrink-0 shadow-sm`}
                                            >
                                                <Star size={10} className="fill-current" />
                                                <span className="text-[10px] font-bold tracking-tight truncate max-w-[150px]">
                                                    {inst.text}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-center justify-between">
                            {/* Left: Tools */}
                            <div className="flex items-center gap-1">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isStreaming}
                                    className="p-2.5 text-slate-400 hover:text-pink-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                >
                                    <ImageIcon size={20} />
                                </button>
                            </div>

                            {/* Right: Meta & Send */}
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest hidden sm:block">
                                    CMD + ENTER
                                </span>
                                {isStreaming ? (
                                    <button
                                        onClick={onStop}
                                        className="w-12 h-12 bg-red-500 text-white rounded-[1rem] shadow-lg shadow-red-500/20 hover:bg-red-400 flex items-center justify-center shrink-0 animate-pulse"
                                        title="停止生成"
                                    >
                                        <Square size={20} fill="currentColor" />
                                    </button>
                                ) : (
                                    <motion.button
                                        whileHover={canSend ? { scale: 1.05 } : {}}
                                        whileTap={canSend ? { scale: 0.95 } : {}}
                                        onClick={() => handleSend()}
                                        disabled={!canSend}
                                        className={`
                                            relative w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all shadow-lg
                                            ${!canSend
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed shadow-none'
                                                : 'bg-gradient-to-br from-pink-300 via-pink-400 to-rose-400 text-white shadow-pink-200/50 hover:shadow-pink-300/50'}
                                        `}
                                    >
                                        <Send size={24} className={canSend ? "fill-white" : ""} />
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
