import React, { useMemo, useRef } from 'react';
import { Bookmark, Hash, Loader2, MessageSquare, Sparkles, StickyNote } from 'lucide-react';
import { getCardMetrics, getCardPreview, getCardTitle } from './cardPreviewUtils';

const LONG_PRESS_MS = 360;
const MOVE_THRESHOLD = 10;

export default function MobileBoardFeedCard({
    card,
    isSelected,
    isSelectionMode,
    isGenerating,
    onOpen,
    onToggleSelect,
    onEnterSelectionMode
}) {
    const timerRef = useRef(null);
    const startPointRef = useRef(null);
    const suppressClickRef = useRef(false);

    const title = useMemo(() => getCardTitle(card), [card]);
    const preview = useMemo(() => getCardPreview(card), [card]);
    const metrics = useMemo(() => getCardMetrics(card), [card]);

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        startPointRef.current = null;
    };

    const beginLongPress = (clientX, clientY) => {
        startPointRef.current = { x: clientX, y: clientY };
        clearTimer();
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            suppressClickRef.current = true;
            if (navigator.vibrate) {
                navigator.vibrate(40);
            }
            onEnterSelectionMode(card.id);
        }, LONG_PRESS_MS);
    };

    const maybeCancelLongPress = (clientX, clientY) => {
        const startPoint = startPointRef.current;
        if (!startPoint) return;
        const deltaX = Math.abs(clientX - startPoint.x);
        const deltaY = Math.abs(clientY - startPoint.y);
        if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
            clearTimer();
        }
    };

    const handleClick = () => {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }

        if (isSelectionMode) {
            onToggleSelect(card.id);
            return;
        }

        onOpen(card.id);
    };

    return (
        <article
            className={`mb-4 break-inside-avoid rounded-[1.75rem] border border-white/70 bg-white/88 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] transition-all duration-200 dark:border-white/10 dark:bg-slate-900/86 ${isSelected
                ? 'ring-2 ring-cyan-400/70 shadow-[0_24px_70px_-32px_rgba(6,182,212,0.45)]'
                : 'active:scale-[0.985]'
                }`}
            onClick={handleClick}
            onMouseDown={(e) => beginLongPress(e.clientX, e.clientY)}
            onMouseMove={(e) => maybeCancelLongPress(e.clientX, e.clientY)}
            onMouseUp={clearTimer}
            onMouseLeave={clearTimer}
            onTouchStart={(e) => {
                const touch = e.touches[0];
                beginLongPress(touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
                const touch = e.touches[0];
                maybeCancelLongPress(touch.clientX, touch.clientY);
            }}
            onTouchEnd={clearTimer}
            onTouchCancel={clearTimer}
        >
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${card.type === 'note'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                            : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200'
                            }`}>
                            {card.type === 'note' ? <StickyNote size={12} /> : <Sparkles size={12} />}
                            {card.type === 'note' ? '笔记' : '卡片'}
                        </span>
                        {isGenerating && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                                <Loader2 size={12} className="animate-spin" />
                                生成中
                            </span>
                        )}
                    </div>
                    <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                        {title}
                    </h3>
                </div>
                {isSelected && (
                    <div className="mt-0.5 rounded-full bg-cyan-500 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                        编辑态
                    </div>
                )}
            </div>

            <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-6 text-slate-600 dark:text-slate-300">
                {preview.length > 260 ? `${preview.slice(0, 260)}...` : preview}
            </p>

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
        </article>
    );
}
