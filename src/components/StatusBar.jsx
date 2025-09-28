import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Coins, Sparkles, WifiOff } from 'lucide-react';
import { useStore } from '../store/useStore';


/**
 * StatusBar - 底部状态栏组件
 * 显示当前画板名称、同步状态和 AI 额度
 */
export default function StatusBar({ boardName, syncStatus = 'idle', onOpenSettings }) {
    // Use individual selectors to avoid object reference issues
    const systemCredits = useStore(state => state.systemCredits);
    const isSystemCreditsUser = useStore(state => state.isSystemCreditsUser);
    const offlineMode = useStore(state => state.offlineMode);
    const autoOfflineTriggered = useStore(state => state.autoOfflineTriggered);

    // Sync status config
    const syncConfig = {
        idle: { icon: Cloud, label: '已同步', color: 'text-emerald-500' },
        syncing: { icon: RefreshCw, label: '同步中...', color: 'text-blue-500', animate: true },
        synced: { icon: Cloud, label: '已同步', color: 'text-emerald-500' },
        error: { icon: CloudOff, label: '同步失败', color: 'text-red-500' },
        offline: { icon: WifiOff, label: autoOfflineTriggered ? '配额已满，等待恢复' : '离线模式', color: 'text-slate-400' }
    };

    // Override status if offline mode is enabled
    const effectiveStatus = offlineMode ? 'offline' : syncStatus;
    const currentSync = syncConfig[effectiveStatus] || syncConfig.idle;
    const SyncIcon = currentSync.icon;

    return (
        <React.Fragment>
            <div className="absolute bottom-20 sm:bottom-4 right-4 z-50 flex items-center gap-3 pointer-events-auto">
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
                            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                            bg-white/80 dark:bg-slate-800/80 backdrop-blur-md
                            border border-slate-200 dark:border-slate-700
                            shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer
                            ${systemCredits > 20 ? 'text-amber-600' : systemCredits > 0 ? 'text-orange-500' : 'text-red-500'}
                        `}
                    >
                        <Coins size={14} />
                        <span>{systemCredits.toFixed(1)} 积分</span>
                    </button>
                )}
            </div>


        </React.Fragment>
    );
}
