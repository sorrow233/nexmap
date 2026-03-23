import React from 'react';
import { Crown, Image, MessageSquare, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';

function UsageMetric({ icon: Icon, label, value }) {
    return (
        <div className="rounded-2xl border border-[#ece0d2] bg-white/85 px-4 py-3 dark:border-white/10 dark:bg-white/8">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[#8b7a68] dark:text-slate-300/70">
                <Icon size={13} />
                {label}
            </div>
            <div className="mt-1.5 text-xl font-semibold text-[#2e241b] dark:text-white">
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
        <section className="rounded-[26px] border border-[#ece0d2] bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(251,247,241,0.96))] p-4 shadow-[0_12px_30px_rgba(94,75,50,0.06)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(19,24,33,0.9),rgba(13,17,24,0.9))]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isPro
                        ? 'border-[#ead6b5] bg-[#faf2df] text-[#9a7338] dark:border-amber-200/20 dark:bg-amber-400/10 dark:text-amber-200'
                        : 'border-[#eadcc9] bg-[#f7efe5] text-[#8d6d49] dark:border-white/10 dark:bg-white/8 dark:text-slate-200'
                        }`}>
                        {isPro ? <Crown size={13} /> : <Sparkles size={13} />}
                        {isPro ? (t.credits.proUser || 'Pro 已启用') : (t.credits.noConfigNeeded || '默认体验已准备好')}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[#2e241b] dark:text-white">
                        {isPro ? (t.payment?.welcomePro || 'Pro 功能已经解锁') : (t.credits.welcomeTitle || '打开就能开始，不需要先折腾配置')}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#7b6a58] dark:text-slate-300">
                        {isPro
                            ? (t.credits.proFeaturesUnlocked || '额度与高级能力都已经就绪，可以直接使用。')
                            : (t.credits.noConfigDesc || '默认额度已经备好，大多数情况下不必先研究设置。')}
                    </p>
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-[460px]">
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
