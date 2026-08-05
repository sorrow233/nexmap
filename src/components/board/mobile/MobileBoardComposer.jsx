import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Send, X } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getMobileBoardCopy } from './mobileBoardCopy';
import { IMAGE_UPLOAD_ACCEPT } from '../../../services/image/uploadImageNormalizer';

const MAX_COMPOSER_HEIGHT = 112;

export default function MobileBoardComposer({
    onSubmit,
    onImageUpload,
    globalImages = [],
    onRemoveImage,
    onClearImages,
    isReadOnly = false
}) {
    const [promptInput, setPromptInput] = useState('');
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const isComposingRef = useRef(false);
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const canSend = !isReadOnly && (promptInput.trim() || globalImages.length > 0);

    const resizeTextarea = (element) => {
        if (!element) return;
        element.style.height = 'auto';
        element.style.height = `${Math.min(element.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
    };

    const handleSubmit = () => {
        if (!canSend) return;
        const text = promptInput.trim();
        const submittedImages = globalImages.map((image) => ({ ...image }));
        onSubmit(text, submittedImages);
        setPromptInput('');
        onClearImages?.();
        requestAnimationFrame(() => resizeTextarea(textareaRef.current));
    };

    return (
        <footer className="shrink-0 border-t border-slate-200/80 bg-white px-3 pt-2 dark:border-white/10 dark:bg-slate-950">
            {globalImages.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
                    {globalImages.map((img, index) => (
                        <div key={img.id || img.previewUrl || index} className="relative shrink-0">
                            <img
                                src={img.previewUrl}
                                alt={copy.imagePreview}
                                className="h-14 w-14 rounded-xl border border-slate-200 object-cover dark:border-white/10"
                            />
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveImage(index)}
                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                    aria-label={copy.removeImage}
                                >
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="mobile-composer-row flex items-end gap-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    multiple
                    className="hidden"
                    onChange={onImageUpload}
                    disabled={isReadOnly}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadOnly}
                    className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-slate-500 disabled:opacity-40 dark:text-slate-300"
                    aria-label={copy.uploadImage}
                >
                    <ImageIcon size={21} />
                </button>

                <div className="min-w-0 flex-1 rounded-[1.35rem] bg-slate-100 px-4 py-2.5 dark:bg-white/10">
                    <textarea
                        ref={textareaRef}
                        value={promptInput}
                        onChange={(event) => {
                            setPromptInput(event.target.value);
                            resizeTextarea(event.target);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey && !isComposingRef.current) {
                                event.preventDefault();
                                handleSubmit();
                            }
                        }}
                        onCompositionStart={() => { isComposingRef.current = true; }}
                        onCompositionEnd={() => { isComposingRef.current = false; }}
                        readOnly={isReadOnly}
                        rows={1}
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        enterKeyHint="send"
                        placeholder={isReadOnly ? copy.readOnlyPlaceholder : copy.composerPlaceholder}
                        className="block max-h-28 min-h-6 w-full resize-none overflow-y-auto bg-transparent text-[16px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    />
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSend}
                    className="touch-target inline-flex shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white transition-colors disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-slate-600"
                    aria-label={copy.send}
                >
                    <Send size={19} />
                </button>
            </div>
        </footer>
    );
}
