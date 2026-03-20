import React from 'react';
import { AlertCircle, Coins, HardDrive, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';


/**
 * StatusBar - 底部状态栏组件
 * 显示当前画板名称、本地保存状态和 AI 额度
 */
export default function StatusBar({ boardName, saveStatus = 'idle', onOpenSettings }) {
    // Use individual selectors to avoid object reference issues
    const systemCredits = useStore(state => state.systemCredits);
    const isSystemCreditsUser = useStore(state => state.isSystemCreditsUser);

    const saveConfig = {
        idle: { icon: HardDrive, label: '已保存', color: 'text-emerald-500' },
        saving: { icon: RefreshCw, label: '保存中...', color: 'text-blue-500', animate: true },
        saved: { icon: HardDrive, label: '已保存', color: 'text-emerald-500' },
        local_dirty: { icon: RefreshCw, label: '本地待保存', color: 'text-amber-500', animate: true },
        error: { icon: AlertCircle, label: '保存失败', color: 'text-red-500' }
    };
    const currentSave = saveConfig[saveStatus] || saveConfig.idle;
    const SaveIcon = currentSave.icon;

    return (
        <React.Fragment>
            <div className="absolute bottom-20 sm:bottom-4 right-4 z-50 flex items-center gap-3 pointer-events-auto">
                {/* Save Status */}
                <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                bg-white/80 dark:bg-slate-800/80 backdrop-blur-md
                border border-slate-200 dark:border-slate-700
                shadow-sm
                ${currentSave.color}
            `}>
                    <SaveIcon
                        size={14}
                        className={currentSave.animate ? 'animate-spin' : ''}
                    />
                    <span>{currentSave.label}</span>
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
