import React from 'react';
import { ChevronLeft, Loader2, MessageSquare, StickyNote } from 'lucide-react';
import CardModelSwitcher from './CardModelSwitcher';

export default function MobileChatHeader({ card, onClose, onUpdate, isStreaming, t }) {
    const isNote = card.type === 'note';
    const title = card.data.title || (isNote ? t.chat.insightArchive : t.chat.conversation);

    return (
        <header className="shrink-0 border-b border-slate-200/80 bg-white/95 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] dark:border-white/10 dark:bg-slate-950/95">
            <div className="flex min-h-11 items-center gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-white/10"
                    aria-label={t.common?.back || 'Back'}
                >
                    <ChevronLeft size={24} />
                </button>

                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isNote
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                    : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200'
                    }`}>
                    {isNote ? <StickyNote size={15} /> : <MessageSquare size={15} />}
                </div>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
                        {title}
                    </h1>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {isStreaming && <Loader2 size={11} className="animate-spin" />}
                        {isStreaming ? (t.ai?.generating || 'Generating') : (isNote ? t.chat.neuralNotepad : t.chat.neuralReader)}
                    </p>
                </div>

                {!isNote && (
                    <CardModelSwitcher
                        card={card}
                        onUpdate={onUpdate}
                        mobileMode
                    />
                )}
            </div>
        </header>
    );
}
