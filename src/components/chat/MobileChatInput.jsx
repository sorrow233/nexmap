import React, { useRef } from 'react';
import { Image as ImageIcon, Send, Square, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { IMAGE_UPLOAD_ACCEPT } from '../../services/image/uploadImageNormalizer';

const MAX_INPUT_HEIGHT = 120;

export default function MobileChatInput({
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
    isReadOnly
}) {
    const { t } = useLanguage();
    const textareaRef = useRef(null);
    const isComposingRef = useRef(false);
    const canSend = !isReadOnly && (input.trim() || images.length > 0);

    const resizeTextarea = (element) => {
        if (!element) return;
        element.style.height = 'auto';
        element.style.height = `${Math.min(element.scrollHeight, MAX_INPUT_HEIGHT)}px`;
    };

    const send = () => {
        if (!canSend) return;
        handleSend();
        requestAnimationFrame(() => resizeTextarea(textareaRef.current));
    };

    return (
        <footer className="mobile-chat-composer shrink-0 border-t border-slate-200/80 bg-white px-3 pt-2 dark:border-white/10 dark:bg-slate-950">
            {images.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
                    {images.map((image, index) => (
                        <div key={image.id || image.previewUrl || index} className="relative shrink-0">
                            <img
                                src={image.previewUrl}
                                alt=""
                                className="h-14 w-14 rounded-xl border border-slate-200 object-cover dark:border-white/10"
                            />
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                    aria-label={t.chat?.removeImage || 'Remove image'}
                                >
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-end gap-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    multiple
                    onChange={handleImageUpload}
                    disabled={isReadOnly}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadOnly}
                    className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-slate-500 disabled:opacity-40 dark:text-slate-300"
                    aria-label={t.chatBar?.uploadImage || 'Upload image'}
                >
                    <ImageIcon size={21} />
                </button>

                <div className="min-w-0 flex-1 rounded-[1.35rem] bg-slate-100 px-4 py-2.5 dark:bg-white/10">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(event) => {
                            if (isReadOnly) return;
                            setInput(event.target.value);
                            resizeTextarea(event.target);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey && !isComposingRef.current) {
                                event.preventDefault();
                                send();
                            }
                        }}
                        onPaste={handlePaste}
                        onCompositionStart={() => { isComposingRef.current = true; }}
                        onCompositionEnd={() => { isComposingRef.current = false; }}
                        readOnly={isReadOnly}
                        rows={1}
                        enterKeyHint="send"
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        placeholder={isReadOnly ? 'Locked: Another tab is active.' : placeholder}
                        className="block max-h-[120px] min-h-6 w-full resize-none overflow-y-auto bg-transparent text-[16px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    />
                </div>

                {isStreaming ? (
                    <button
                        type="button"
                        onClick={onStop}
                        className="touch-target inline-flex shrink-0 items-center justify-center rounded-full bg-rose-500 text-white"
                        aria-label={t.ai?.stopGeneration || 'Stop generation'}
                    >
                        <Square size={17} fill="currentColor" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={send}
                        disabled={!canSend}
                        className="touch-target inline-flex shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-slate-600"
                        aria-label={t.chatBar?.send || 'Send'}
                    >
                        <Send size={19} />
                    </button>
                )}
            </div>
        </footer>
    );
}
