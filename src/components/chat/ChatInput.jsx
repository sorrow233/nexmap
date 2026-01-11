import React, { useRef } from 'react';
import { X, Send, Image as ImageIcon, Square, Send as SendIcon, Star, FileText, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { getColorForString } from '../../utils/colors';
import InstructionChips from './InstructionChips';

/**
 * ChatInput Component - Integrated Card Style
 * 采用青色系 (Cyan) 极简风格，对齐 ChatBar。
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
    instructions = [],

    onClearInstructions
}) {
    const { t } = useLanguage();
    const [isFocused, setIsFocused] = React.useState(false);

    // Ensure height calculation handles larger text
    const handleTextareaInput = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
    };

    const textareaRef = useRef(null);

    const handlePromptSelect = (text) => {
        const newText = input ? `${input} ${text}` : text;
        setInput(newText);

        // Focus and adjust height
        if (textareaRef.current) {
            textareaRef.current.focus();
            requestAnimationFrame(() => {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
            });
        }
    };

    const handleKeyDown = (e) => {
        // Enter 直接发送，Shift + Enter 换行
        // 增加 isComposing 判断，防止中文输入法选词时触发发送
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = input.trim() || images.length > 0;

    return (
        <div className="p-4 sm:p-8 pb-10 shrink-0">
            <div className="max-w-4xl mx-auto w-full relative">
                <motion.div
                    layout
                    className="relative bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-3xl rounded-[1.8rem] border border-cyan-100/50 dark:border-white/10 shadow-[0_4px_24px_rgba(6,182,212,0.1)] ring-1 ring-cyan-200/20 dark:ring-white/5 overflow-hidden flex flex-col transition-all focus-within:ring-cyan-400/30"
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
                                        <img src={img.previewUrl} className="h-16 w-auto rounded-xl object-cover border border-slate-100 dark:border-white/10 shadow-sm" alt="preview" />
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
                    <div className="px-6 pt-4 pb-2">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onInput={handleTextareaInput}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            onFocus={() => setIsFocused(true)}
                            onBlur={(e) => {
                                if (e.relatedTarget && e.currentTarget.parentElement.contains(e.relatedTarget)) {
                                    return;
                                }
                                setIsFocused(false);
                            }}
                            className="w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-sans text-lg leading-relaxed max-h-[80px] scrollbar-hide"
                            placeholder={placeholder}
                            rows={1}
                        />
                    </div>

                    {/* Footer Actions - Compact Merged Row */}
                    <div className="flex items-center gap-3 px-6 pb-6 pt-2">
                        {/* Left Side: functional cluster */}
                        <div className="flex items-center gap-1">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isStreaming}
                                className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                title={t.chatBar.uploadImage}
                            >
                                <ImageIcon size={18} />
                            </button>
                            <button
                                disabled={isStreaming}
                                className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                            >
                                <FileText size={18} />
                            </button>

                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />

                            <button
                                disabled={isStreaming}
                                className="p-2 text-cyan-500/80 hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-xl transition-all"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {/* Middle: Instructions Chips List - Flex grow to fill space */}
                        <div className="flex-1 min-w-0">
                            <AnimatePresence>
                                {isFocused && (
                                    <InstructionChips
                                        instructions={instructions}
                                        onSelect={handlePromptSelect}
                                        onClear={onClearInstructions}
                                        disabled={isStreaming}
                                        className="mb-0 px-0"
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Right: Send / Stop Action */}
                        <div className="shrink-0 flex items-center gap-2">


                            {isStreaming ? (
                                <button
                                    onClick={onStop}
                                    className="w-10 h-10 bg-red-500 text-white rounded-[0.8rem] shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-400 flex items-center justify-center shrink-0 animate-pulse transition-all"
                                    title={t.ai?.stopGeneration || "Stop Generation"}
                                >
                                    <Square size={16} fill="currentColor" />
                                </button>
                            ) : (
                                <motion.button
                                    whileHover={canSend ? { scale: 1.05 } : {}}
                                    whileTap={canSend ? { scale: 0.95 } : {}}
                                    onClick={() => handleSend()}
                                    disabled={!canSend}
                                    className={`
                                        relative w-10 h-10 rounded-[0.8rem] flex items-center justify-center transition-all shadow-lg
                                        ${!canSend
                                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                                            : 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400'}
                                    `}
                                >
                                    <SendIcon size={18} className={canSend ? "fill-white" : ""} />
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
