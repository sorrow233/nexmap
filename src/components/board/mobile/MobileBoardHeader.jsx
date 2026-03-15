import React from 'react';
import { Cloud, CloudOff, LayoutGrid, RefreshCw, Settings2, Sparkles, WifiOff } from 'lucide-react';
import { getBoardDisplayName } from '../../../services/boardTitle/metadata';

const syncConfig = {
    idle: { icon: Cloud, label: '已同步', color: 'text-emerald-600 dark:text-emerald-300' },
    syncing: { icon: RefreshCw, label: '同步中', color: 'text-cyan-600 dark:text-cyan-300', animate: true },
    synced: { icon: Cloud, label: '已同步', color: 'text-emerald-600 dark:text-emerald-300' },
    error: { icon: CloudOff, label: '同步失败', color: 'text-rose-600 dark:text-rose-300' },
    offline: { icon: WifiOff, label: '离线模式', color: 'text-slate-500 dark:text-slate-300' }
};

export default function MobileBoardHeader({
    board,
    syncStatus,
    cardCount,
    onBack,
    onOpenInstructions,
    onOpenSettings,
    untitledLabel = 'Untitled Board'
}) {
    const displayTitle = getBoardDisplayName(board, untitledLabel);
    const syncState = syncConfig[syncStatus] || syncConfig.idle;
    const SyncIcon = syncState.icon;

    return (
        <header className="fixed inset-x-0 top-0 z-40 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
            <div className="rounded-[1.4rem] border border-white/70 bg-white/88 px-3.5 py-3 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.68)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/78">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
                    >
                        <LayoutGrid size={17} />
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                            iPhone Board
                        </div>
                        <div className="mt-0.5 truncate text-[1.05rem] font-semibold tracking-tight text-slate-900 dark:text-white">
                            {displayTitle}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{cardCount} 张卡片</span>
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
                            title="画板指令"
                        >
                            <Sparkles size={17} />
                        </button>
                        <button
                            onClick={onOpenSettings}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
                            title="设置"
                        >
                            <Settings2 size={17} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
