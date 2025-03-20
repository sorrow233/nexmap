import React from 'react';
import { X, Send, Image as ImageIcon } from 'lucide-react';

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
    placeholder
}) {
    return (
        <div className="p-8 pb-10 sm:px-10 shrink-0">
            <div className="reader-width relative group">
                {images.length > 0 && (
                    <div className="flex gap-4 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative shrink-0 group/img">
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                                <img src={img.previewUrl} alt="Preview" className="h-24 w-auto rounded-2xl border-2 border-brand-500 shadow-xl" />
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative bg-slate-100/50 dark:bg-white/5 backdrop-blur-md rounded-[2rem] p-4 flex gap-4 items-center focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-4 ring-brand-500/10 border border-transparent focus-within:border-brand-500/20 transition-all duration-300">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        onPaste={handlePaste}
                        className="flex-grow bg-transparent outline-none resize-none h-12 py-3 px-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans text-lg"
                        placeholder={placeholder}
                    />

                    <div className="flex items-center gap-2 pr-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isStreaming}
                            className="p-3 text-slate-400 hover:text-brand-500 hover:bg-brand-500/5 rounded-2xl transition-all"
                        >
                            <ImageIcon size={22} />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isStreaming || (!input.trim() && images.length === 0)}
                            className="w-14 h-14 bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-500 hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center shrink-0"
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
