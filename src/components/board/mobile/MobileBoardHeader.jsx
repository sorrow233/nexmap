import React from 'react';
import { Cloud, CloudOff, LayoutGrid, Plus, RefreshCw, Settings2, Sparkles, WifiOff } from 'lucide-react';
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
    onCreateNote,
    onOpenInstructions,
    onOpenSettings,
    untitledLabel = 'Untitled Board'
}) {
    const displayTitle = getBoardDisplayName(board, untitledLabel);
    const syncState = syncConfig[syncStatus] || syncConfig.idle;
    const SyncIcon = syncState.icon;

    return (
        <header className="fixed inset-x-0 top-0 z-40 px-4 pt-[max(env(safe-area-inset-top),1rem)]">
            <div className="rounded-[1.6rem] border border-white/70 bg-white/88 px-4 py-3 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/78">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <button
                        onClick={onBack}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
                    >
                        <LayoutGrid size={18} />
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                            iPhone Board
                        </div>
                        <div className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                            {displayTitle}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {cardCount} 张卡片，已切换为信息流视图
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onOpenInstructions}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 transition-all active:scale-95 dark:bg-cyan-500/15 dark:text-cyan-200"
                            title="画板指令"
                        >
                            <Sparkles size={18} />
                        </button>
                        <button
                            onClick={onOpenSettings}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all active:scale-95 dark:bg-white/5 dark:text-slate-100"
                            title="设置"
                        >
                            <Settings2 size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <div className={`inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold dark:bg-white/5 ${syncState.color}`}>
                        <SyncIcon size={13} className={syncState.animate ? 'animate-spin' : ''} />
                        {syncState.label}
                    </div>

                    <button
                        onClick={onCreateNote}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all active:scale-95 dark:bg-white dark:text-slate-900"
                    >
                        <Plus size={14} />
                        新建便签
                    </button>
                </div>
            </div>
        </header>
    );
}
