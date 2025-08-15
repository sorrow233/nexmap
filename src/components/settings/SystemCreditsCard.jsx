/**
 * System Credits Card
 * 
 * Displays free trial credits info for users without API key.
 * Shows progress bar and upgrade prompt when credits are exhausted.
 */

import React, { useEffect } from 'react';
import { Gift, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function SystemCreditsCard({ currentProvider }) {
    const {
        systemCredits,
        systemCreditsLoading,
        systemCreditsError,
        loadSystemCredits,
        getCreditsPercentage
    } = useStore();

    // Check if user should see credits (no API key configured)
    const hasApiKey = currentProvider?.apiKey && currentProvider.apiKey.trim() !== '';

    useEffect(() => {
        // Load credits if not loaded and user should use system credits
        if (!hasApiKey && systemCredits === null && !systemCreditsLoading && !systemCreditsError) {
            loadSystemCredits();
        }
    }, [hasApiKey, systemCredits, systemCreditsLoading, systemCreditsError, loadSystemCredits]);

    // Don't show if user has their own API key
    if (hasApiKey) {
        return null;
    }

    const percentage = getCreditsPercentage();
    const isLow = percentage < 20;
    const isExhausted = systemCredits !== null && systemCredits <= 0;

    // If system credits feature is not available (503 / not configured), silently hide
    // This allows beta/preview environments without the feature to work normally
    const isFeatureUnavailable = systemCreditsError?.includes('系统配置错误') ||
        systemCreditsError?.includes('Service unavailable');
    if (isFeatureUnavailable) {
        return null; // Silently hide - user can still use their own API key
    }

    // Error state
    if (systemCreditsError && !systemCreditsLoading) {
        return (
            <div className="mb-6 p-4 rounded-2xl border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/30">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1 text-amber-700 dark:text-amber-400">
                            积分加载失败
                        </h4>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                            {systemCreditsError}
                        </p>
                        <button
                            onClick={() => loadSystemCredits()}
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-600 transition-colors"
                        >
                            <RefreshCw size={12} /> 重试
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`mb-6 p-4 rounded-2xl border ${isExhausted
            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/30'
            : 'bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/10 dark:to-purple-900/10 border-brand-200 dark:border-brand-500/30'
            }`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${isExhausted
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                    : 'bg-brand-100 dark:bg-brand-900/30 text-brand-600'
                    }`}>
                    {isExhausted ? <AlertTriangle size={20} /> : <Gift size={20} />}
                </div>
                <div className="flex-1">
                    <h4 className={`font-bold text-sm mb-1 ${isExhausted ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-white'
                        }`}>
                        {isExhausted ? '免费试用已结束' : '✨ 免费试用积分'}
                    </h4>

                    {systemCreditsLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-slate-500">加载中...</p>
                        </div>
                    ) : isExhausted ? (
                        <div>
                            <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                                您的免费积分已用完。请添加您的 API Key 继续使用 AI 功能。
                            </p>
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-500"
                            >
                                <Zap size={12} /> 获取免费 API Key →
                            </a>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${isLow
                                            ? 'bg-gradient-to-r from-orange-400 to-red-500'
                                            : 'bg-gradient-to-r from-brand-500 to-purple-500'
                                            }`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-16 text-right">
                                    {systemCredits !== null ? systemCredits.toFixed(1) : '--'} / 100
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                使用 DeepSeek V3.2 模型，约可进行 <strong className="text-brand-600 dark:text-brand-400">10 万+</strong> 次对话。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

