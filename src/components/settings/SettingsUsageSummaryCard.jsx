import React from 'react';
import { Crown, Image, MessageSquare, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';

function UsageMetric({ icon: Icon, label, value }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white px-3.5 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                <Icon size={13} />
                {label}
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
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
        <section className="rounded-[28px] border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${isPro
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200'
                        : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                        }`}>
                        {isPro ? <Crown size={13} /> : <Sparkles size={13} />}
                        {isPro ? (t.credits.proUser || 'Pro 已启用') : (t.credits.noConfigNeeded || '默认体验已准备好')}
                    </div>
                    <h3 className="mt-3 text-xl font-light text-gray-900 dark:text-white">
                        {isPro ? (t.payment?.welcomePro || 'Pro 功能已经解锁') : (t.credits.welcomeTitle || '打开就能开始，不需要先折腾配置')}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-gray-400 dark:text-gray-500">
                        {isPro
                            ? (t.credits.proFeaturesUnlocked || '额度与高级能力都已经就绪，可以直接使用。')
                            : (t.credits.noConfigDesc || '默认额度已经备好，大多数情况下不必先研究设置。')}
                    </p>
                </div>

                <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-[430px]">
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
