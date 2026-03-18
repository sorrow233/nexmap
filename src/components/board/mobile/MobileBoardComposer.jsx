import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Plus, Send, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getMobileBoardCopy } from './mobileBoardCopy';

export default function MobileBoardComposer({
    onSubmit,
    onCreateNote,
    onImageUpload,
    globalImages,
    onRemoveImage,
    onClearImages,
    isReadOnly = false
}) {
    const [promptInput, setPromptInput] = useState('');
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const isComposingRef = useRef(false);
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);

    const handleSubmit = () => {
        if (isReadOnly) return;
        const text = (promptInput || '').trim();
        if (!text && globalImages.length === 0) return;
        const submittedImages = (globalImages || []).map((image) => ({ ...image }));
        onSubmit(text, submittedImages);
        setPromptInput('');
        onClearImages?.();
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-[max(env(safe-area-inset-bottom),0.85rem)] pointer-events-auto">
            <div className="rounded-[1.35rem] border border-white/70 bg-white/96 p-2.5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/94">
                {globalImages.length > 0 && (
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                        {globalImages.map((img, idx) => (
                            <div key={idx} className="relative shrink-0">
                                <img
                                    src={img.previewUrl}
                                    alt="preview"
                                    className="h-12 w-12 rounded-2xl object-cover border border-slate-200 dark:border-white/10"
                                />
                                {!isReadOnly && (
                                    <button
                                        onClick={() => onRemoveImage(idx)}
                                        className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => !isReadOnly && fileInputRef.current?.click()}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
                        title={copy.uploadImage}
                    >
                        <ImageIcon size={17} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={onImageUpload}
                        disabled={isReadOnly}
                    />

                    <button
                        onClick={() => !isReadOnly && onCreateNote()}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
                        title={copy.newNote}
                    >
                        <Plus size={17} />
                    </button>

                    <input
                        ref={inputRef}
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isComposingRef.current) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        onCompositionStart={() => {
                            isComposingRef.current = true;
                        }}
                        onCompositionEnd={() => {
                            isComposingRef.current = false;
                        }}
                        readOnly={isReadOnly}
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="sentences"
                        enterKeyHint="send"
                        placeholder={isReadOnly ? copy.readOnlyPlaceholder : copy.composerPlaceholder}
                        className={`h-10 flex-1 rounded-2xl bg-slate-100 px-4 text-[15px] text-slate-800 outline-none placeholder:text-slate-400 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={isReadOnly || (!promptInput.trim() && globalImages.length === 0)}
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all ${isReadOnly || (!promptInput.trim() && globalImages.length === 0)
                            ? 'bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-600'
                            : 'bg-cyan-500 text-white active:scale-95'
                            }`}
                        title={copy.send}
                    >
                        <Send size={17} />
                    </button>
                </div>
            </div>
        </div>
    );
}
