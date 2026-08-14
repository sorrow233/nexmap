import React from 'react';
import { BrainCircuit, Gauge, Timer } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const DEFAULT_COPY = {
    duration: 'Time',
    seconds: 's',
    speed: 'Speed',
    visibleSpeed: 'Answer speed',
    endToEndSpeed: 'End-to-end',
    firstToken: 'First token',
    queued: 'Queued',
    tokensPerSecond: 'tokens/s',
    total: 'Total',
    tokens: 'tokens',
    estimated: '≈ ',
    thinkingShare: 'Thinking',
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
    const visibleTokensPerSecond = metrics?.visibleTokensPerSecond === null || metrics?.visibleTokensPerSecond === undefined
        ? null
        : Number(metrics.visibleTokensPerSecond);
    const endToEndTokensPerSecond = metrics?.endToEndTokensPerSecond === null || metrics?.endToEndTokensPerSecond === undefined
        ? null
        : Number(metrics.endToEndTokensPerSecond);
    const firstVisibleChunkMs = metrics?.firstVisibleChunkMs === null || metrics?.firstVisibleChunkMs === undefined
        ? null
        : Number(metrics.firstVisibleChunkMs);
    const queueDurationMs = Number(metrics?.queueDurationMs || 0);
    const outputTokenCount = Number(metrics?.outputTokenCount);
    const thinkingPercentage = Number(metrics?.thinkingPercentage);

    if (
        !Number.isFinite(durationMs)
        || durationMs <= 0
        || !Number.isFinite(tokensPerSecond)
        || !Number.isFinite(outputTokenCount)
    ) {
        return null;
    }

    const estimatedPrefix = metrics?.tokenCountEstimated ? copy.estimated : '';
    const hasThinkingPercentage = metrics?.includesHiddenThinking === true
        && Number.isFinite(thinkingPercentage)
        && thinkingPercentage > 0;
    const thinkingEstimatedPrefix = metrics?.thinkingTokenCountEstimated ? copy.estimated : '';
    const hasVisibleSpeed = Number.isFinite(visibleTokensPerSecond) && visibleTokensPerSecond > 0;
    const hasEndToEndSpeed = Number.isFinite(endToEndTokensPerSecond) && endToEndTokensPerSecond >= 0;
    const hasFirstToken = Number.isFinite(firstVisibleChunkMs) && firstVisibleChunkMs >= 0;
    const hasQueueDelay = Number.isFinite(queueDurationMs) && queueDurationMs >= 100;

    return (
        <div
            className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400 dark:border-white/5 dark:text-slate-500"
            aria-label={copy.ariaLabel}
        >
            <span className="inline-flex items-center gap-1.5">
                <Timer size={12} aria-hidden="true" />
                {copy.duration} {formatMetric(durationMs / 1000)} {copy.seconds}
            </span>
            {hasFirstToken && (
                <span>
                    {copy.firstToken} {formatMetric(firstVisibleChunkMs / 1000)} {copy.seconds}
                </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-indigo-500/90 dark:text-indigo-300/90">
                <Gauge size={12} aria-hidden="true" />
                {hasVisibleSpeed
                    ? `${copy.visibleSpeed} ${estimatedPrefix}${formatMetric(visibleTokensPerSecond)} ${copy.tokensPerSecond}`
                    : `${copy.speed} ${estimatedPrefix}${formatMetric(tokensPerSecond)} ${copy.tokensPerSecond}`}
            </span>
            {hasVisibleSpeed && hasEndToEndSpeed && (
                <span>
                    {copy.endToEndSpeed} {formatMetric(endToEndTokensPerSecond)} {copy.tokensPerSecond}
                </span>
            )}
            {hasQueueDelay && (
                <span>
                    {copy.queued} {formatMetric(queueDurationMs / 1000)} {copy.seconds}
                </span>
            )}
            <span>
                {copy.total} {estimatedPrefix}{formatMetric(outputTokenCount, 0)} {copy.tokens}
            </span>
            {metrics?.includesHiddenThinking === true && (
                <span className="inline-flex items-center gap-1.5" title={copy.includesThinking}>
                    <BrainCircuit size={12} aria-hidden="true" />
                    {hasThinkingPercentage
                        ? `${copy.thinkingShare} ${thinkingEstimatedPrefix}${formatMetric(thinkingPercentage, 0)}%`
                        : copy.includesThinking}
                </span>
            )}
        </div>
    );
}
