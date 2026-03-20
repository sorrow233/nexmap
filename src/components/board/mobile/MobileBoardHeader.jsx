import React from 'react';
import { AlertCircle, HardDrive, LayoutGrid, RefreshCw, Settings2, Sparkles, WifiOff } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getBoardDisplayName } from '../../../services/boardTitle/metadata';
import { getMobileBoardCopy } from './mobileBoardCopy';

export default function MobileBoardHeader({
    board,
    syncStatus,
    cardCount,
    onBack,
    onOpenInstructions,
    onOpenSettings,
    untitledLabel = 'Untitled Board'
}) {
    const { language } = useLanguage();
    const copy = getMobileBoardCopy(language);
    const syncConfig = {
        idle: { icon: HardDrive, label: copy.syncIdle, color: 'text-emerald-600 dark:text-emerald-300' },
        syncing: { icon: RefreshCw, label: copy.syncing, color: 'text-cyan-600 dark:text-cyan-300', animate: true },
        synced: { icon: HardDrive, label: copy.syncIdle, color: 'text-emerald-600 dark:text-emerald-300' },
        local_dirty: { icon: RefreshCw, label: '本地待保存', color: 'text-amber-600 dark:text-amber-300', animate: true },
        persisting_local: { icon: RefreshCw, label: '保存本地中', color: 'text-sky-600 dark:text-sky-300', animate: true },
        error: { icon: AlertCircle, label: copy.syncError, color: 'text-rose-600 dark:text-rose-300' },
        offline: { icon: WifiOff, label: copy.syncOffline, color: 'text-slate-500 dark:text-slate-300' }
    };
    const displayTitle = getBoardDisplayName(board, untitledLabel);
    const syncState = syncConfig[syncStatus] || syncConfig.idle;
    const SyncIcon = syncState.icon;
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
                            {copy.boardLabel}
                        </div>
                        <div className="mt-0.5 truncate text-[1rem] font-semibold tracking-tight text-slate-900 dark:text-white">
                            {displayTitle}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{cardCountLabel}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-white/5 ${syncState.color}`}>
                                <SyncIcon size={11} className={syncState.animate ? 'animate-spin' : ''} />
                                {syncState.label}
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
