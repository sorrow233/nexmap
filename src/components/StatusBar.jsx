import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Coins, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';


/**
 * StatusBar - 底部状态栏组件
 * 显示当前画板名称、同步状态和 AI 额度
 */
export default function StatusBar({ boardName, syncStatus = 'idle', onOpenSettings }) {
    // Use individual selectors to avoid object reference issues
    const systemCredits = useStore(state => state.systemCredits);
    const isSystemCreditsUser = useStore(state => state.isSystemCreditsUser);

    // Sync status config
    const syncConfig = {
        idle: { icon: Cloud, label: '已同步', color: 'text-emerald-500' },
        syncing: { icon: RefreshCw, label: '同步中...', color: 'text-blue-500', animate: true },
        synced: { icon: Cloud, label: '已同步', color: 'text-emerald-500' },
        error: { icon: CloudOff, label: '同步失败', color: 'text-red-500' }
    };

    const currentSync = syncConfig[syncStatus] || syncConfig.idle;
    const SyncIcon = currentSync.icon;

    return (
        <React.Fragment>
            <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 pointer-events-auto">
                {/* Sync Status */}
                <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                bg-white/80 dark:bg-slate-800/80 backdrop-blur-md
                border border-slate-200 dark:border-slate-700
                shadow-sm
                ${currentSync.color}
            `}>
                    <SyncIcon
                        size={14}
                        className={currentSync.animate ? 'animate-spin' : ''}
                    />
                    <span>{currentSync.label}</span>
                </div>

                {isSystemCreditsUser && typeof systemCredits === 'number' && (
                    <button
                        onClick={onOpenSettings}
                        className={`
                            flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold
                            bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                            border border-white/10
                            shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer
                            group
                        `}
                        title="无需配置 API Key，直接开始使用"
                    >
                        <Sparkles size={14} className="text-yellow-300 group-hover:rotate-12 transition-transform" fill="currentColor" />
                        <span>10万+ 免费额度</span>
                        <div className="w-[1px] h-3 bg-white/20 mx-1"></div>
                        <span className="opacity-80 font-mono text-[10px]">{systemCredits.toFixed(0)}</span>
                    </button>
                )}
            </div>


        </React.Fragment>
    );
}
