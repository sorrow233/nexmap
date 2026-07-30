import React from 'react';
import { Crown, Image, MessageSquare, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';

function UsageMetric({ icon: Icon, label, value }) {
    return (
        <div className="settings-jp-usage-metric">
            <div>
                <Icon size={13} strokeWidth={1.7} />
                {label}
            </div>
            <strong>{value}</strong>
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
        <section className="settings-jp-usage">
            <div className="settings-jp-usage-copy">
                <div className={`settings-jp-plan${isPro ? ' is-pro' : ''}`}>
                    {isPro ? <Crown size={13} strokeWidth={1.7} /> : <Sparkles size={13} strokeWidth={1.7} />}
                    <span>
                        {isPro ? (t.credits.proUser || 'Pro 已启用') : '当前用量'}
                    </span>
                </div>
                <h3>
                    {isPro ? (t.payment?.welcomePro || 'Pro 功能已经解锁') : '额度概览'}
                </h3>
                <p>
                    {isPro
                        ? (t.credits.proFeaturesUnlocked || '额度与高级能力都已经就绪，可以直接使用。')
                        : '查看当前可用的对话与图片生成额度。'}
                </p>
            </div>

            <div className="settings-jp-usage-metrics">
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
        </section>
    );
}
