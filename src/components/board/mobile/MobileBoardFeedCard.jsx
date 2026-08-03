import React, { useMemo } from 'react';
import { ChevronRight, Loader2, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getCardMetrics, getCardPreview, getCardTitle } from './cardPreviewUtils';
import { getMobileBoardCopy } from './mobileBoardCopy';

export default function MobileBoardFeedCard({ card, isGenerating, onOpen }) {
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const title = useMemo(() => getCardTitle(card, copy), [card, copy]);
    const preview = useMemo(() => getCardPreview(card, copy), [card, copy]);
    const metrics = useMemo(() => getCardMetrics(card), [card]);
    return (
        <article>
            <button
                type="button"
                onClick={() => onOpen(card.id)}
                className="flex w-full items-start gap-3 py-4 text-left active:bg-slate-100 dark:active:bg-white/5"
            >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
                    <MessageSquare size={16} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        {isGenerating && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-300">
                                <Loader2 size={12} className="animate-spin" />
                                {copy.generating}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[13px] leading-5 text-slate-600 dark:text-slate-300">
                        {preview}
                    </p>
                    <span className="mt-1.5 block text-[11px] text-slate-400 dark:text-slate-500">
                        {copy.messageCount.replace('{count}', metrics.messageCount)}
                    </span>
                </div>

                <ChevronRight size={18} className="mt-2 shrink-0 text-slate-300 dark:text-slate-600" />
            </button>
        </article>
    );
}
