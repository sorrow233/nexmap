import React from 'react';
import MessageImage from './MessageImage';

const buildQueuedImagePart = (image = {}) => ({
    source: {
        media_type: image?.mimeType || 'image/png',
        data: image?.base64 || ''
    }
});

export default function QueuedUserMessagePreview({ pendingMessage = {} }) {
    const textContent = typeof pendingMessage?.text === 'string' ? pendingMessage.text : '';
    const queuedImages = Array.isArray(pendingMessage?.images)
        ? pendingMessage.images.filter((image) => image?.base64).map(buildQueuedImagePart)
        : [];

    if (!textContent && queuedImages.length === 0) {
        return null;
    }

    return (
        <div className="chat-message-frame chat-message-frame--user justify-end flex relative">
            <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-tr-none border border-amber-200/80 bg-amber-50/85 p-6 text-slate-800 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-slate-100">
                <div className="mb-3 flex justify-end">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/90 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-300/20 dark:bg-black/20 dark:text-amber-200">
                        排队中
                    </span>
                </div>

                {queuedImages.length > 0 && (
                    <div className="mb-3 flex flex-wrap justify-end gap-2">
                        {queuedImages.map((img, index) => (
                            <div key={`${pendingMessage?.text || 'queued'}-img-${index}`} className="relative">
                                <MessageImage img={img} />
                            </div>
                        ))}
                    </div>
                )}

                {textContent && (
                    <div className="whitespace-pre-wrap break-words font-sans" style={{ overflowWrap: 'anywhere' }}>
                        {textContent}
                    </div>
                )}
            </div>
        </div>
    );
}
