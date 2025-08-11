import React from 'react';
import { Sparkles, CheckCircle2, Gift, Zap, Infinity } from 'lucide-react';
import { useStore } from '../../store/useStore';

/**
 * SettingsCreditsTab
 * 
 * A tab in Settings modal showing free trial credits info.
 * Designed to be user-friendly without exposing API configuration details.
 */
export default function SettingsCreditsTab() {
    const systemCredits = useStore(state => state.systemCredits);
    const isSystemCreditsUser = useStore(state => state.isSystemCreditsUser);

    const creditsPercent = typeof systemCredits === 'number'
        ? Math.max(0, Math.min(100, systemCredits))
        : 100;

    return (
        <div className="space-y-6">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border border-white/10 p-8">
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-transparent" />
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />

                <div className="relative flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 shadow-xl shadow-purple-500/30 relative">
                        <Sparkles size={32} className="text-white" />
                        <div className="absolute -top-1 -right-1 text-white/80 text-xs font-bold">+</div>
                        <div className="absolute -bottom-1 -left-1 text-white/80 text-xs font-bold">+</div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-1">
                        ✨ 免费试用积分
                    </h3>

                    {/* Credits Display */}
                    <div className="w-full max-w-xs my-5">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">当前额度</span>
                            <span className="text-white font-bold">
                                {typeof systemCredits === 'number' ? systemCredits.toFixed(1) : '100.0'} / 100
                            </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${creditsPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-slate-400 text-sm leading-relaxed mb-1">
                        使用 <span className="text-cyan-400 font-semibold">DeepSeek V3</span> 模型
                    </p>
                    <p className="text-slate-300 text-lg">
                        约可进行 <span className="font-bold text-indigo-400">10 万+</span> 次对话
                    </p>
                </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-white">无需配置</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">开箱即用，已为你想好一切</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Zap size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-white">即刻开始</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">无需注册、等待或审核</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Infinity size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-white">海量对话</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">100 积分支持约 10 万+ 次 AI 对话</p>
                    </div>
                </div>
            </div>

            {/* Footer Note */}
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2">
                积分用完后可在 "Provider" 标签页配置自己的 API Key
            </p>
        </div>
    );
}
