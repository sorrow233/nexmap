import React from 'react';
import { AlertCircle, Clock3, HardDrive, LayoutGrid, RefreshCw, Settings2, Sparkles, Upload } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getBoardDisplayName } from '../../../services/boardTitle/metadata';
import { useStore } from '../../../store/useStore';
import { getBoardChromeCopy, getBoardSaveStatusMeta } from '../boardChromeCopy';
import { getMobileBoardCopy } from './mobileBoardCopy';

export default function MobileBoardHeader({
    board,
    saveStatus,
    cardCount,
    onBack,
    onOpenInstructions,
    onOpenSettings,
    onForceSyncBoard,
    isForceSyncing = false,
    untitledLabel = 'Untitled Board'
}) {
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const chromeCopy = getBoardChromeCopy(language);
    const lastSavedAt = useStore((state) => state.lastSavedAt);
    const saveMeta = getBoardSaveStatusMeta({
        language,
        saveStatus,
        lastSavedAt
    });
    const saveConfig = {
        idle: { icon: HardDrive, color: 'text-emerald-600 dark:text-emerald-300', pill: 'bg-emerald-50 dark:bg-emerald-500/10' },
        saving: { icon: RefreshCw, color: 'text-cyan-600 dark:text-cyan-300', pill: 'bg-cyan-50 dark:bg-cyan-500/10', animate: true },
        saved: { icon: HardDrive, color: 'text-emerald-600 dark:text-emerald-300', pill: 'bg-emerald-50 dark:bg-emerald-500/10' },
        local_dirty: { icon: Clock3, color: 'text-amber-600 dark:text-amber-300', pill: 'bg-amber-50 dark:bg-amber-500/10' },
        error: { icon: AlertCircle, color: 'text-rose-600 dark:text-rose-300', pill: 'bg-rose-50 dark:bg-rose-500/10' }
    };
    const displayTitle = getBoardDisplayName(board, untitledLabel);
    const saveState = saveConfig[saveMeta.statusKey] || saveConfig.idle;
    const SaveIcon = saveState.icon;
    const cardCountLabel = copy.cardCount.replace('{count}', cardCount);

    return (
        <header className="fixed inset-x-0 top-0 z-40 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
            <div className="rounded-[1.35rem] border border-white/70 bg-white/88 px-3 py-2.5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.68)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/78">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
                    >
                        <LayoutGrid size={17} />
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                            {chromeCopy.mobileBoardLabel}
                        </div>
                        <div className="mt-0.5 truncate text-[1rem] font-semibold tracking-tight text-slate-900 dark:text-white">
                            {displayTitle}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 overflow-hidden text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{cardCountLabel}</span>
                            {saveMeta.detail && (
                                <span className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                                    {saveMeta.detail}
                                </span>
                            )}
                            <span
                                aria-label={saveMeta.a11yLabel}
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${saveState.pill} ${saveState.color}`}
                            >
                                <SaveIcon size={11} className={saveState.animate ? 'animate-spin' : ''} />
                                {saveMeta.label}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onOpenInstructions}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 transition-all active:scale-95 dark:bg-cyan-500/15 dark:text-cyan-200"
                            title={copy.instructions}
                        >
                            <Sparkles size={17} />
                        </button>
                        {typeof onForceSyncBoard === 'function' && (
                            <button
                                onClick={onForceSyncBoard}
                                disabled={isForceSyncing}
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-all active:scale-95 ${isForceSyncing
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                                    }`}
                                title={isForceSyncing ? chromeCopy.forceSyncingTitle : chromeCopy.forceSyncTitle}
                            >
                                <Upload size={17} className={isForceSyncing ? 'animate-pulse' : ''} />
                            </button>
                        )}
                        <button
                            onClick={onOpenSettings}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
                            title={copy.settings}
                        >
                            <Settings2 size={17} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
