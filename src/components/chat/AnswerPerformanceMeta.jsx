import React from 'react';
import { BrainCircuit, Gauge, Timer } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const DEFAULT_COPY = {
    duration: 'Time',
    seconds: 's',
    speed: 'Speed',
    tokensPerSecond: 'tokens/s',
    total: 'Total',
    tokens: 'tokens',
    estimated: '≈ ',
    includesThinking: 'hidden thinking included',
    ariaLabel: 'AI response performance'
};

const formatMetric = (value, maximumFractionDigits = 1) => new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
}).format(value);

export default function AnswerPerformanceMeta({ metrics }) {
    const { t } = useLanguage();
    const copy = t?.chat?.answerPerformance || DEFAULT_COPY;
    const durationMs = Number(metrics?.durationMs);
    const tokensPerSecond = Number(metrics?.tokensPerSecond);
    const outputTokenCount = Number(metrics?.outputTokenCount);

    if (
        !Number.isFinite(durationMs)
        || durationMs <= 0
        || !Number.isFinite(tokensPerSecond)
        || !Number.isFinite(outputTokenCount)
    ) {
        return null;
    }

    const estimatedPrefix = metrics?.tokenCountEstimated ? copy.estimated : '';

    return (
        <div
            className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400 dark:border-white/5 dark:text-slate-500"
            aria-label={copy.ariaLabel}
        >
            <span className="inline-flex items-center gap-1.5">
                <Timer size={12} aria-hidden="true" />
                {copy.duration} {formatMetric(durationMs / 1000)} {copy.seconds}
            </span>
            <span className="inline-flex items-center gap-1.5 text-indigo-500/90 dark:text-indigo-300/90">
                <Gauge size={12} aria-hidden="true" />
                {copy.speed} {estimatedPrefix}{formatMetric(tokensPerSecond)} {copy.tokensPerSecond}
            </span>
            <span>
                {copy.total} {estimatedPrefix}{formatMetric(outputTokenCount, 0)} {copy.tokens}
            </span>
            {metrics?.includesHiddenThinking === true && (
                <span className="inline-flex items-center gap-1.5" title={copy.includesThinking}>
                    <BrainCircuit size={12} aria-hidden="true" />
                    {copy.includesThinking}
                </span>
            )}
        </div>
    );
}
