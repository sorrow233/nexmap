import React from 'react';
import { Crown, Image, MessageSquare, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';

function SummaryPill({ icon: Icon, label, value }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e8dccd] bg-[#fffaf3] px-3 py-1.5 text-xs text-[#6e5e4d] dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
            <Icon size={12} />
            <span>{label}</span>
            <span className="font-semibold text-[#2f241a] dark:text-white">{value}</span>
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
    const title = isPro ? (t.credits.proUser || 'Pro 已启用') : (t.credits.noConfigNeeded || '默认体验已准备好');
    const desc = isPro
        ? '已解锁'
        : '可直接用';

    return (
        <section className="rounded-[16px] border border-[#e9decf] bg-[#fffdf8] px-3 py-2.5 dark:border-white/10 dark:bg-white/6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#2f241a] dark:text-white">
                        {isPro ? <Crown size={15} className="text-[#a1763c] dark:text-amber-200" /> : <Sparkles size={15} className="text-[#8d6d49] dark:text-slate-200" />}
                        {title}
                        <span className="text-[#9a8771] dark:text-slate-300/70">·</span>
                        {desc}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <SummaryPill
                        icon={MessageSquare}
                        label={t.credits.remainingCredits || '对话额度'}
                        value={chatCredits}
                    />
                    <SummaryPill
                        icon={Image}
                        label={t.credits.imageCredits || '图片额度'}
                        value={imageCredits}
                    />
                    <SummaryPill
                        icon={isPro ? Crown : Sparkles}
                        label={t.credits.plan || '当前模式'}
                        value={isPro ? (t.credits.proUser || 'Pro') : '默认'}
                    />
                </div>
            </div>
        </section>
    );
}
