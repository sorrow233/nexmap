import React from 'react';
import { AlertCircle, ChevronLeft, Loader2, Settings2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getBoardDisplayName } from '../../../services/boardTitle/metadata';
import { getMobileBoardCopy } from './mobileBoardCopy';

export default function MobileBoardHeader({
    board,
    saveStatus,
    cardCount,
    onBack,
    onOpenSettings,
    untitledLabel = 'Untitled Board'
}) {
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const displayTitle = getBoardDisplayName(board, untitledLabel);
    const isSaving = saveStatus === 'saving' || saveStatus === 'local_dirty';
    const hasSaveError = saveStatus === 'error';

    return (
        <header className="shrink-0 border-b border-slate-200/80 bg-white/95 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] dark:border-white/10 dark:bg-slate-950/95">
            <div className="flex min-h-11 items-center gap-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-white/10"
                    aria-label={copy.backToBoards}
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[16px] font-semibold leading-5 text-slate-900 dark:text-white">
                        {displayTitle}
                    </h1>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{copy.cardCount.replace('{count}', cardCount)}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`inline-flex items-center gap-1 ${hasSaveError ? 'text-rose-600 dark:text-rose-300' : ''}`}>
                            {isSaving && <Loader2 size={11} className="animate-spin" />}
                            {hasSaveError && <AlertCircle size={11} />}
                            {hasSaveError ? copy.saveError : isSaving ? copy.saving : copy.saveIdle}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onOpenSettings}
                    className="touch-target inline-flex shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-white/10"
                    aria-label={copy.settings}
                >
                    <Settings2 size={20} />
                </button>
            </div>
        </header>
    );
}
