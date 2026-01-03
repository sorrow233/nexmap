import { X, Send, Image as ImageIcon, Square, Send as SendIcon, Star } from 'lucide-react';
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
    instructions = [],
    onClearInstructions
}) {
    const { t } = useLanguage();

    const handleTextareaInput = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    };

    const handleQuickSend = (text) => {
        if (isStreaming) return;
        handleSend(text);
    };

    const handleKeyDown = (e) => {
        // Enter 直接发送，Shift + Enter 换行
        if (e.key === 'Enter' && !e.shiftKey) {
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
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            className="w-full bg-transparent outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-sans text-lg leading-relaxed max-h-[200px] scrollbar-hide"
                            placeholder={placeholder}
                            rows={1}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col gap-3 px-6 pb-6 pt-2">
                        {/* Instructions Chips List */}
                        <InstructionChips
                            instructions={instructions}
                            onSelect={handleQuickSend}
                            onClear={onClearInstructions}
                            disabled={isStreaming}
                            className="mb-2 px-8"
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isStreaming}
                                    className="p-2.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                                >
                                    <ImageIcon size={20} />
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                {isStreaming ? (
                                    <button
                                        onClick={onStop}
                                        className="w-12 h-12 bg-red-500 text-white rounded-[1rem] shadow-lg shadow-red-500/20 hover:bg-red-400 flex items-center justify-center shrink-0 animate-pulse"
                                        title={t.ai?.stopGeneration || "Stop Generation"}
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
                                                ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                                                : 'bg-cyan-500 text-white shadow-cyan-500/20 hover:bg-cyan-400'}
                                        `}
                                    >
                                        <SendIcon size={24} className={canSend ? "fill-white" : ""} />
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
