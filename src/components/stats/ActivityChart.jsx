import React, { useState, useMemo } from 'react';
import { Activity, BarChart3, Clock3, Trophy } from 'lucide-react';
import {
    buildActivityChartData,
    formatCompactNumber,
    getActivityInsights,
    getTimeDistributionSegments
} from './activityChartMetrics';

/**
 * Neural Clay Activity Chart Component
 * Soft, tactile, pastel aesthetic.
 */
export default function ActivityChart({
    data = [],
    weeklyHistory = [],
    viewMode = 'week', // 'week' | 'month' | 'year'
    timeDistribution,
    t,
    language = 'en'
}) {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const sourceData = data.length > 0 ? data : weeklyHistory;

    const safeLanguage = useMemo(() => {
        if (!language) return 'en';
        if (language === 'zh') return 'zh-CN';
        return language;
    }, [language]);

    const config = useMemo(() => {
        const isYear = viewMode === 'year';
        const isMonth = viewMode === 'month';

        return {
            height: 150,
            radius: isMonth ? 4 : 10,
            slotRatio: isYear ? 0.48 : isMonth ? 0.5 : 0.58
        };
    }, [viewMode]);

    const CHART_WIDTH = 1000;
    const CHART_HEIGHT = config.height;
    const chartData = useMemo(
        () => buildActivityChartData(sourceData, viewMode, safeLanguage),
        [sourceData, viewMode, safeLanguage]
    );

    const insights = useMemo(
        () => getActivityInsights({ data: chartData, timeDistribution }),
        [chartData, timeDistribution]
    );

    const timeSegments = useMemo(
        () => getTimeDistributionSegments(timeDistribution, t),
        [timeDistribution, t]
    );

    const maxChars = useMemo(
        () => Math.max(...chartData.map(item => item.chars || 0), 10),
        [chartData]
    );
    const averageLineY = insights.averageChars > 0
        ? CHART_HEIGHT - (insights.averageChars / maxChars) * CHART_HEIGHT
        : null;
    const hoveredItem = hoveredIndex !== null ? chartData[hoveredIndex] : null;
    const hoveredShare = hoveredItem && insights.totalChars > 0
        ? hoveredItem.chars / insights.totalChars
        : 0;
    const hoveredDelta = hoveredItem ? hoveredItem.chars - insights.averageChars : 0;
    const activeLabel = viewMode === 'year'
        ? (t?.stats?.activeMonths || '活跃月份')
        : (t?.stats?.activeDaysLabel || '活跃天数');
    const averageLabel = viewMode === 'year'
        ? (t?.stats?.averagePerMonth || '月均产出')
        : (t?.stats?.averagePerDay || '日均产出');
    const peakLabel = viewMode === 'year'
        ? (t?.stats?.peakMonth || '峰值月份')
        : (t?.stats?.peakDay || '峰值日期');
    const activityRateLabel = t?.stats?.activityRate || '活跃率';
    const totalOutputLabel = t?.stats?.totalOutput || '累计产出';
    const averageBenchmarkLabel = t?.stats?.averageBenchmark || '区间均值';
    const dominantTimeLabel = t?.stats?.dominantTimeWindow || '主力时段';
    const dominantSegment = timeSegments.find(item => item.key === insights.dominantTimeKey) || null;

    const overviewCards = [
        {
            icon: BarChart3,
            label: totalOutputLabel,
            value: insights.totalChars.toLocaleString(safeLanguage),
            hint: `${chartData.length} ${viewMode === 'year' ? (t?.stats?.months || 'months') : (t?.stats?.days || '天')}`
        },
        {
            icon: Activity,
            label: activeLabel,
            value: `${insights.activePeriods}/${insights.totalPeriods || 0}`,
            hint: `${Math.round(insights.activeRate * 100)}% ${activityRateLabel}`
        },
        {
            icon: Trophy,
            label: averageLabel,
            value: formatCompactNumber(insights.activeAverageChars, safeLanguage),
            hint: insights.averageChars > 0
                ? `${averageBenchmarkLabel} ${formatCompactNumber(insights.averageChars, safeLanguage)}`
                : (t?.stats?.noActivityData || '暂无有效数据')
        },
        {
            icon: Clock3,
            label: peakLabel,
            value: insights.peakItem?.detailLabel || '--',
            hint: insights.peakItem?.chars > 0
                ? `${formatCompactNumber(insights.peakItem.chars, safeLanguage)} · ${Math.round(insights.peakShare * 100)}%`
                : (t?.stats?.noActivityData || '暂无有效数据')
        }
    ];

    return (
        <div className="space-y-6 select-none w-full h-full flex flex-col">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {overviewCards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div
                            key={card.label}
                            className="rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3 shadow-[0_12px_30px_rgba(148,163,184,0.08)]"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                                    {card.label}
                                </span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-indigo-400 shadow-sm">
                                    <Icon size={16} />
                                </div>
                            </div>
                            <div className="mt-3 text-2xl font-black tracking-tight text-slate-800">
                                {card.value}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-400">
                                {card.hint}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="relative group/chart flex-1 min-h-[180px] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 px-2 relative z-20 h-8">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Trophy size={14} className="text-indigo-300" />
                        {viewMode === 'week' ? (t?.stats?.weeklyTrend || 'Weekly Trend') :
                            viewMode === 'month' ? (t?.stats?.monthlyTrend || 'Monthly Trend') :
                                (t?.stats?.yearlyTrend || 'Yearly Trend')}
                    </span>

                    <div className="flex items-center justify-end transition-opacity duration-200">
                        {hoveredItem ? (
                            <div className="flex items-center gap-3 px-4 py-1.5 bg-white shadow-[4px_4px_12px_rgba(0,0,0,0.05),-4px_-4px_12px_#ffffff] rounded-full text-xs font-bold border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-slate-400">
                                    {hoveredItem.detailLabel || hoveredItem.date}
                                </span>
                                <div className="w-px h-3 bg-slate-200"></div>
                                <span className="text-indigo-500">
                                    {hoveredItem.chars.toLocaleString(safeLanguage)}
                                </span>
                                <span className="text-slate-300">/</span>
                                <span className={hoveredDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                                    {hoveredDelta >= 0 ? '+' : ''}{formatCompactNumber(hoveredDelta, safeLanguage)}
                                </span>
                                <span className="text-slate-400">
                                    {Math.round(hoveredShare * 100)}%
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1 bg-transparent text-slate-400 rounded-full text-xs font-bold">
                                <span className="uppercase tracking-wider opacity-70">{dominantTimeLabel}</span>
                                <span className="text-slate-600 font-mono">
                                    {dominantSegment?.label || '--'}
                                </span>
                                <span className="text-slate-400">
                                    {dominantSegment
                                        ? `${Math.round((dominantSegment.percentage || 0) * 100)}%`
                                        : ''}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative w-full flex-1 flex items-end justify-center">
                    {chartData.length === 0 ? (
                        <div className="flex h-full w-full items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/60 text-sm font-medium text-slate-400">
                            {t?.stats?.noActivityData || '暂无有效数据'}
                        </div>
                    ) : (
                        <svg
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 44}`}
                            preserveAspectRatio="none"
                            className="overflow-visible"
                        >
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#818cf8" />
                                    <stop offset="100%" stopColor="#c084fc" />
                                </linearGradient>

                                <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>

                                <filter id="clayShadow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#818cf8" floodOpacity="0.18" />
                                </filter>
                            </defs>

                            <line
                                x1="0"
                                y1={CHART_HEIGHT}
                                x2={CHART_WIDTH}
                                y2={CHART_HEIGHT}
                                stroke="#e2e8f0"
                                strokeWidth="1"
                            />
                            {averageLineY !== null && (
                                <>
                                    <line
                                        x1="0"
                                        y1={averageLineY}
                                        x2={CHART_WIDTH}
                                        y2={averageLineY}
                                        stroke="#cbd5e1"
                                        strokeDasharray="4 4"
                                        strokeWidth="1"
                                        opacity="0.75"
                                    />
                                    <text
                                        x={CHART_WIDTH - 8}
                                        y={Math.max(12, averageLineY - 8)}
                                        textAnchor="end"
                                        className="fill-slate-400 text-[10px] font-bold"
                                    >
                                        {averageBenchmarkLabel} {formatCompactNumber(insights.averageChars, safeLanguage)}
                                    </text>
                                </>
                            )}

                            {chartData.map((item, index) => {
                                const slotWidth = CHART_WIDTH / chartData.length;
                                const width = Math.min(slotWidth * config.slotRatio, viewMode === 'month' ? 18 : 64);
                                const x = index * slotWidth + (slotWidth - width) / 2;
                                const height = item.chars > 0
                                    ? Math.max((item.chars / maxChars) * CHART_HEIGHT, 6)
                                    : 0;
                                const y = CHART_HEIGHT - height;
                                const isToday = item.isToday;
                                const isHovered = hoveredIndex === index;
                                const barRadius = Math.min(width / 2, config.radius);

                                return (
                                    <g
                                        key={item.key}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        className="cursor-pointer group"
                                    >
                                        <rect
                                            x={x - Math.max(6, slotWidth * 0.15)}
                                            y="0"
                                            width={width + Math.max(12, slotWidth * 0.3)}
                                            height={CHART_HEIGHT + 44}
                                            fill="transparent"
                                        />

                                        {item.chars > 0 && (
                                            <>
                                                <rect
                                                    x={x}
                                                    y={y}
                                                    width={width}
                                                    height={height}
                                                    rx={barRadius}
                                                    ry={barRadius}
                                                    fill={isToday ? 'url(#barGradientToday)' : 'url(#barGradient)'}
                                                    fillOpacity={isHovered ? 1 : 0.9}
                                                    filter="url(#clayShadow)"
                                                    className={`transition-all duration-300 ${isHovered ? 'opacity-100' : ''}`}
                                                />
                                                <text
                                                    x={x + width / 2}
                                                    y={Math.max(12, y - 10)}
                                                    textAnchor="middle"
                                                    className={`text-[10px] font-bold transition-all duration-300 ${isHovered ? 'fill-indigo-600' : 'fill-slate-400'}`}
                                                >
                                                    {formatCompactNumber(item.chars, safeLanguage)}
                                                </text>
                                            </>
                                        )}

                                        <text
                                            x={x + width / 2}
                                            y={CHART_HEIGHT + 26}
                                            textAnchor="middle"
                                            className={`text-[10px] font-medium transition-colors duration-300 ${isHovered ? 'fill-indigo-500' : 'fill-slate-400'}`}
                                        >
                                            {item.axisLabel}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    )}
                </div>
            </div>

            {insights.distributionTotal > 0 && (
                <div className="pt-2 px-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                            {t?.stats?.timeDistribution || 'Time Distribution'}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                            {dominantTimeLabel}: {dominantSegment?.label || '--'}
                        </div>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
                        {timeSegments.map((segment) => (
                            <DistributionSegment
                                key={segment.key}
                                value={segment.value}
                                total={insights.distributionTotal}
                                color={segment.softColor}
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
                        {timeSegments.map((segment) => {
                            const isDominant = segment.key === insights.dominantTimeKey;

                            return (
                                <div
                                    key={segment.key}
                                    className={`rounded-2xl border px-3 py-3 transition-colors ${isDominant ? 'border-indigo-200 bg-indigo-50/80' : 'border-slate-200 bg-white/80'}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ backgroundColor: segment.color }}
                                            ></div>
                                            <span className="text-sm font-bold text-slate-700">{segment.label}</span>
                                        </div>
                                        <span className={`text-sm font-black ${isDominant ? 'text-indigo-600' : 'text-slate-700'}`}>
                                            {Math.round(segment.percentage * 100)}%
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs font-medium text-slate-400">
                                        {segment.rangeLabel}
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-slate-500">
                                        {formatCompactNumber(segment.value, safeLanguage)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

const DistributionSegment = ({ value, total, color }) => {
    if (value <= 0) return null;
    const width = (value / total) * 100;
    return (
        <div
            className="h-full first:rounded-l-full last:rounded-r-full hover:brightness-105 transition-all cursor-crosshair relative group"
            style={{ width: `${width}%`, backgroundColor: color }}
        >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-slate-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-[10px] font-bold rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                {Math.round(width)}%
            </div>
        </div>
    );
};
