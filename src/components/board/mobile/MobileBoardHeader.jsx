import React from 'react';
import { AlertCircle, HardDrive, LayoutGrid, RefreshCw, Settings2, Sparkles, Upload } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getBoardDisplayName } from '../../../services/boardTitle/metadata';
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
    const saveConfig = {
        idle: { icon: HardDrive, label: copy.saveIdle, color: 'text-emerald-600 dark:text-emerald-300' },
        saving: { icon: RefreshCw, label: copy.saving, color: 'text-cyan-600 dark:text-cyan-300', animate: true },
        saved: { icon: HardDrive, label: copy.saveIdle, color: 'text-emerald-600 dark:text-emerald-300' },
        local_dirty: { icon: RefreshCw, label: '本地待保存', color: 'text-amber-600 dark:text-amber-300', animate: true },
        error: { icon: AlertCircle, label: copy.saveError, color: 'text-rose-600 dark:text-rose-300' }
    };
    const displayTitle = getBoardDisplayName(board, untitledLabel);
    const saveState = saveConfig[saveStatus] || saveConfig.idle;
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
                            {copy.boardLabel}
                        </div>
                        <div className="mt-0.5 truncate text-[1rem] font-semibold tracking-tight text-slate-900 dark:text-white">
                            {displayTitle}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{cardCountLabel}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-white/5 ${saveState.color}`}>
                                <SaveIcon size={11} className={saveState.animate ? 'animate-spin' : ''} />
                                {saveState.label}
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
                                title={isForceSyncing ? '正在强制同步这张画布' : '强制以当前设备覆盖所有设备'}
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
