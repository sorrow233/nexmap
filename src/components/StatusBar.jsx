import React from 'react';
import { AlertCircle, Clock3, Coins, HardDrive, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLanguage } from '../contexts/LanguageContext';
import { getBoardChromeCopy, getBoardSaveStatusMeta } from './board/boardChromeCopy';


/**
 * StatusBar - 底部状态栏组件
 * 显示当前画板名称、本地保存状态和 AI 额度
 */
export default function StatusBar({ boardName, saveStatus = 'idle', onOpenSettings }) {
    // Use individual selectors to avoid object reference issues
    const systemCredits = useStore(state => state.systemCredits);
    const isSystemCreditsUser = useStore(state => state.isSystemCreditsUser);
    const lastSavedAt = useStore(state => state.lastSavedAt);
    const { language, t } = useLanguage();
    const chromeCopy = getBoardChromeCopy(language);
    const saveMeta = getBoardSaveStatusMeta({
        language,
        saveStatus,
        lastSavedAt
    });
    const resolvedBoardName = typeof boardName === 'string' && boardName.trim()
        ? boardName.trim()
        : (t.gallery?.untitledBoard || 'Untitled Board');

    const saveConfig = {
        idle: { icon: HardDrive, color: 'text-emerald-500', detailColor: 'text-emerald-700/70 dark:text-emerald-200/70' },
        saving: { icon: RefreshCw, color: 'text-blue-500', detailColor: 'text-blue-700/70 dark:text-blue-200/70', animate: true },
        saved: { icon: HardDrive, color: 'text-emerald-500', detailColor: 'text-emerald-700/70 dark:text-emerald-200/70' },
        local_dirty: { icon: Clock3, color: 'text-amber-500', detailColor: 'text-amber-700/70 dark:text-amber-200/70' },
        error: { icon: AlertCircle, color: 'text-red-500', detailColor: 'text-red-700/70 dark:text-red-200/70' }
    };
    const currentSave = saveConfig[saveMeta.statusKey] || saveConfig.idle;
    const SaveIcon = currentSave.icon;
    const creditsLabel = language === 'en'
        ? 'credits'
        : language === 'ja'
            ? 'クレジット'
            : language === 'ko'
                ? '크레딧'
                : '积分';

    return (
        <React.Fragment>
            <div className="absolute bottom-20 sm:bottom-4 right-4 z-50 flex items-end gap-3 pointer-events-auto">
                <div className="min-w-[160px] rounded-2xl border border-slate-200 bg-white/88 px-3 py-2 text-slate-900 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/88 dark:text-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {chromeCopy.boardLabel}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-semibold tracking-tight">
                        {resolvedBoardName}
                    </div>
                </div>

                {/* Save Status */}
                <div className={`
                min-w-[190px] rounded-2xl px-3 py-2
                bg-white/80 dark:bg-slate-800/80 backdrop-blur-md
                border border-slate-200 dark:border-slate-700
                shadow-sm
            `}>
                    <div aria-live="polite" className="flex items-start gap-2">
                        <SaveIcon
                            size={14}
                            className={`mt-0.5 ${currentSave.color} ${currentSave.animate ? 'animate-spin' : ''}`}
                        />
                        <div className="min-w-0">
                            <div className={`text-xs font-semibold ${currentSave.color}`}>
                                {saveMeta.label}
                            </div>
                            {saveMeta.detail && (
                                <div className={`mt-0.5 truncate text-[11px] ${currentSave.detailColor}`}>
                                    {saveMeta.detail}
                                </div>
                            )}
                        </div>
                    </div>
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
                        <span>{systemCredits.toFixed(1)} {creditsLabel}</span>
                    </button>
                )}
            </div>


        </React.Fragment>
    );
}
