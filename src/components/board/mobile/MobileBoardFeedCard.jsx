import React, { useMemo } from 'react';
import { ArrowUpRight, Bookmark, Hash, Loader2, MessageSquare, Sparkles, Sprout, Star, StickyNote } from 'lucide-react';
import { getCardMetrics, getCardPreview, getCardTitle } from './cardPreviewUtils';

export default function MobileBoardFeedCard({
    card,
    isGenerating,
    onOpen,
    onQuickSprout,
    onExpandTopics
}) {
    const title = useMemo(() => getCardTitle(card), [card]);
    const preview = useMemo(() => getCardPreview(card), [card]);
    const metrics = useMemo(() => getCardMetrics(card), [card]);
    const hasMarks = metrics.markCount > 0;
    const isNote = card.type === 'note';

    return (
        <article className="overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/94 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.62)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
            <button
                onClick={() => onOpen(card.id)}
                className="block w-full p-3 text-left"
            >
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${isNote
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                        : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200'
                        }`}>
                        {isNote ? <StickyNote size={11} /> : <Sparkles size={11} />}
                        {isNote ? '笔记' : '卡片'}
                    </span>
                    {isGenerating && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                            <Loader2 size={11} className="animate-spin" />
                            生成中
                        </span>
                    )}
                </div>

                <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 line-clamp-2 text-[0.95rem] font-semibold leading-6 tracking-tight text-slate-900 dark:text-slate-50">
                        {title}
                    </h3>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-200">
                        <ArrowUpRight size={15} />
                    </span>
                </div>

                <p className="mt-2 whitespace-pre-wrap break-words text-[0.82rem] leading-5 text-slate-600 line-clamp-6 dark:text-slate-300">
                    {preview}
                </p>
            </button>

            <div className="border-t border-slate-200/70 px-3 pb-3 pt-2 dark:border-white/6">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-white/5">
                        <MessageSquare size={12} />
                        {metrics.messageCount}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-white/5">
                        <Hash size={12} />
                        {metrics.markCount}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-white/5">
                        <Bookmark size={12} />
                        {metrics.noteCount}
                    </span>
                </div>

                {!isNote && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <ActionButton
                            icon={ArrowUpRight}
                            label="全文"
                            onClick={() => onOpen(card.id)}
                        />
                        <ActionButton
                            icon={Sprout}
                            label="发散"
                            onClick={() => onQuickSprout(card.id)}
                        />
                        {hasMarks && (
                            <ActionButton
                                icon={Star}
                                label="主题"
                                onClick={() => onExpandTopics(card.id)}
                            />
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

function ActionButton({ icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center justify-center gap-1 rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
        >
            <Icon size={12} />
            {label}
        </button>
    );
}
