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
        <article className="rounded-[1.5rem] border border-white/70 bg-white/92 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isNote
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                            : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200'
                            }`}>
                            {isNote ? <StickyNote size={12} /> : <Sparkles size={12} />}
                            {isNote ? '笔记' : '卡片'}
                        </span>
                        {isGenerating && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                                <Loader2 size={12} className="animate-spin" />
                                生成中
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => onOpen(card.id)}
                        className="block text-left"
                    >
                        <h3 className="line-clamp-3 text-[1.1rem] font-semibold leading-8 tracking-tight text-slate-900 dark:text-slate-50">
                            {title}
                        </h3>
                    </button>
                </div>

                <button
                    onClick={() => onOpen(card.id)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-200"
                    title="打开"
                >
                    <ArrowUpRight size={18} />
                </button>
            </div>

            <button
                onClick={() => onOpen(card.id)}
                className="block w-full text-left"
            >
                <p className="whitespace-pre-wrap break-words text-[0.97rem] leading-7 text-slate-600 dark:text-slate-300">
                    {preview.length > 180 ? `${preview.slice(0, 180)}...` : preview}
                </p>
            </button>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/5">
                    <MessageSquare size={12} />
                    {metrics.messageCount}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/5">
                    <Hash size={12} />
                    {metrics.markCount}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-white/5">
                    <Bookmark size={12} />
                    {metrics.noteCount}
                </span>
            </div>

            {!isNote && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <ActionButton
                        icon={ArrowUpRight}
                        label="打开全文"
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
                            label="展开主题"
                            onClick={() => onExpandTopics(card.id)}
                            wide
                        />
                    )}
                </div>
            )}
        </article>
    );
}

function ActionButton({ icon: Icon, label, onClick, wide = false }) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100 ${wide ? 'col-span-2' : ''}`}
        >
            <Icon size={16} />
            {label}
        </button>
    );
}
