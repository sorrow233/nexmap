import React from 'react';
import { Crown, Image, MessageSquare, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';

function UsageMetric({ icon: Icon, label, value }) {
    return (
        <div className="rounded-[24px] border border-[#efe2d5] bg-[rgba(255,252,247,0.94)] px-4 py-4 shadow-[0_14px_28px_rgba(91,72,49,0.06)] dark:border-slate-800/70 dark:bg-[#18212c]">
            <div className="flex items-center gap-2 text-xs font-medium text-[#8b7a68] dark:text-slate-300/70">
                <Icon size={13} />
                {label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#2e241b] dark:text-white">
                {value}
            </div>
        </div>
    );
}

export default function SettingsUsageSummaryCard() {
    const { t } = useLanguage();
    const systemCredits = useStore(state => state.systemCredits);
    const systemImageCredits = useStore(state => state.systemImageCredits);
    const isPro = useStore(state => state.isPro);

    const chatCredits = typeof systemCredits === 'number' ? systemCredits : 200;
    const imageCredits = typeof systemImageCredits === 'number' ? systemImageCredits : 20;

    return (
        <section className="rounded-[32px] border border-[#efe4d7] bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(248,243,236,0.94))] p-6 shadow-[0_24px_60px_rgba(94,75,50,0.08)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(19,24,33,0.94),rgba(13,17,24,0.94))]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${isPro
                        ? 'border-[#ead6b5] bg-[#faf2df] text-[#9a7338] dark:border-amber-200/20 dark:bg-amber-400/10 dark:text-amber-200'
                        : 'border-[#eadcc9] bg-[#f7efe5] text-[#8d6d49] dark:border-slate-700/70 dark:bg-[#17202c] dark:text-slate-100'
                        }`}>
                        {isPro ? <Crown size={13} /> : <Sparkles size={13} />}
                        {isPro ? (t.credits.proUser || 'Pro 已启用') : (t.credits.noConfigNeeded || '默认体验已准备好')}
                    </div>
                    <h3 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] text-[#2e241b] dark:text-white">
                        {isPro ? (t.payment?.welcomePro || 'Pro 功能已经解锁') : (t.credits.welcomeTitle || '打开就能开始，不需要先折腾配置')}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[#7b6a58] dark:text-slate-300">
                        {isPro
                            ? (t.credits.proFeaturesUnlocked || '额度与高级能力都已经就绪，可以直接使用。')
                            : (t.credits.noConfigDesc || '默认额度已经备好，大多数情况下不必先研究设置。')}
                    </p>
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                    <UsageMetric
                        icon={MessageSquare}
                        label={t.credits.remainingCredits || '对话额度'}
                        value={chatCredits}
                    />
                    <UsageMetric
                        icon={Image}
                        label={t.credits.imageCredits || '图片额度'}
                        value={imageCredits}
                    />
                    <UsageMetric
                        icon={isPro ? Crown : Sparkles}
                        label={t.credits.plan || '当前模式'}
                        value={isPro ? (t.credits.proUser || 'Pro') : '默认'}
                    />
                </div>
            </div>
        </section>
    );
}
