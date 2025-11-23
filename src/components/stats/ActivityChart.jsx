import React, { useState, useMemo } from 'react';
import { Sun, Sunset, Moon, CloudMoon, Flame, Zap, Trophy } from 'lucide-react';

/**
 * Premium Activity Chart Component
 * Supports Week, Month, and Year views with adaptive rendering.
 */
export default function ActivityChart({
    data = [],
    viewMode = 'week', // 'week' | 'month' | 'year'
    timeDistribution,
    streakDays,
    todaySessions,
    t,
    language = 'en'
}) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Dynamic Chart Configuration based on view mode
    const config = useMemo(() => {
        const isYear = viewMode === 'year';
        const isMonth = viewMode === 'month';

        return {
            height: 140,
            barWidth: isYear ? 16 : isMonth ? 6 : 24,
            gap: isYear ? 24 : isMonth ? 4 : 12,
            radius: isMonth ? 2 : 6
        };
    }, [viewMode]);

    // Calculate dimensions
    // For Month view, we might have ~30 items. 
    // width = (30 * 6) + (29 * 4) = 180 + 116 = ~300px
    // For Week view: (7 * 24) + (6 * 12) = 168 + 72 = 240px
    // For Year view: (12 * 16) + (11 * 24) = 192 + 264 = 456px
    // We want to fit strictly within container, so we might need to distribute width evenly.

    // Instead of fixed width, let's use percentage or viewBox mapping
    const CHART_WIDTH = 1000; // Virtual width for calculation
    const CHART_HEIGHT = config.height;

    // Calculate max value for scaling (min 10)
    const maxChars = Math.max(...data.map(d => d.chars), 10);
    const totalChars = useMemo(() => data.reduce((acc, curr) => acc + (curr.chars || 0), 0), [data]);



    const totalTimeChars = timeDistribution ? (timeDistribution.morning + timeDistribution.afternoon + timeDistribution.evening + timeDistribution.night) : 0;

    // Helper to get X position
    const getX = (index, totalItems) => {
        // Distribute bars evenly across CHART_WIDTH
        // padding: usage 90% of width centered
        const workingWidth = CHART_WIDTH * 0.95;
        const startX = (CHART_WIDTH - workingWidth) / 2;
        const step = workingWidth / totalItems;
        return startX + (step * index) + (step - config.barWidth) / 2; // Center bar in slot
    };

    // Helper to get dynamic Bar Width
    const getBarWidth = (totalItems) => {
        const workingWidth = CHART_WIDTH * 0.95;
        // Occupy 60% of slot width, max 40px
        return Math.min(40, (workingWidth / totalItems) * 0.6);
    };

    const calculatedBarWidth = getBarWidth(data.length);

    return (
        <div className="space-y-6 select-none w-full h-full flex flex-col">
            {/* 1. Main Chart Area */}
            <div className="bg-slate-50/50 dark:bg-white/[0.02] rounded-3xl p-5 border border-slate-200/60 dark:border-white/5 relative group/chart flex-1 min-h-[180px] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2 px-1 relative z-20">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Trophy size={12} />
                        {viewMode === 'week' ? (t?.stats?.weeklyTrend || '7日趋势') :
                            viewMode === 'month' ? (t?.stats?.monthlyTrend || '月度趋势') :
                                (t?.stats?.yearlyTrend || '年度趋势')}
                    </span>
                    {/* Dynamic Tooltip Display Area: Shows Total by default, Specific Day on hover */}
                    <div className="h-6 flex items-center justify-end transition-opacity duration-200">
                        {hoveredIndex !== null && data[hoveredIndex] ? (
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <span className="opacity-70">
                                    {viewMode === 'year'
                                        ? `${data[hoveredIndex].year}-${data[hoveredIndex].monthIndex + 1}`
                                        : data[hoveredIndex].date}
                                </span>
                                <div className="w-px h-3 bg-white/20 dark:bg-black/10"></div>
                                <span>{data[hoveredIndex].chars.toLocaleString()} Chars</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1 bg-transparent text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-bold">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t?.stats?.globalChars || '生成字符数'}</span>
                                <span className="text-slate-800 dark:text-slate-200 font-mono">{totalChars.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* SVG Chart */}
                <div className="relative w-full flex-1 flex items-end justify-center">
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 20}`}
                        preserveAspectRatio="none"
                        className="overflow-visible"
                    >
                        {/* Define Gradients */}
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="rgb(249 115 22)" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="rgb(251 191 36)" stopOpacity="0.9" />
                            </linearGradient>
                        </defs>

                        {/* Dashed Guideline (Midpoint) */}
                        <line x1="0" y1={CHART_HEIGHT / 2} x2={CHART_WIDTH} y2={CHART_HEIGHT / 2} stroke="currentColor" strokeOpacity="0.03" strokeDasharray="4 4" strokeWidth="1" />

                        {data.map((item, i) => {
                            const height = Math.max((item.chars / maxChars) * CHART_HEIGHT, 4); // Min height 4px
                            const x = getX(i, data.length);
                            const width = calculatedBarWidth;
                            const y = CHART_HEIGHT - height;

                            // Highlight logic
                            const isToday = viewMode === 'week' && i === data.length - 1; // Simplified logic, ideally check exact date
                            const isHovered = hoveredIndex === i;

                            // Label Logic
                            let label = '';
                            if (viewMode === 'week') {
                                label = new Intl.DateTimeFormat(language, { weekday: 'short' }).format(new Date(item.date));
                            } else if (viewMode === 'month') {
                                // Show every 5th day label to avoid clutter
                                if (item.day === 1 || item.day % 5 === 0) label = item.day;
                            } else if (viewMode === 'year') {
                                label = new Date(item.year, item.monthIndex).toLocaleDateString(language, { month: 'narrow' });
                            }

                            return (
                                <g
                                    key={i}
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className="transition-all duration-300 ease-out cursor-crosshair"
                                >
                                    {/* Interaction Catchment Area */}
                                    <rect
                                        x={getX(i, data.length) - (width / 2)}
                                        y="0"
                                        width={CHART_WIDTH / data.length}
                                        height={CHART_HEIGHT + 30}
                                        fill="transparent"
                                    />

                                    {/* The Bar - Zen Style */}
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        rx={viewMode === 'month' ? 2 : 4}
                                        className={`
                                            transition-all duration-500 ease-out
                                            ${isToday ? 'fill-emerald-500 dark:fill-emerald-400' : 'fill-slate-200 dark:fill-white/10'}
                                            ${isHovered ? 'opacity-80' : ''}
                                        `}
                                    />

                                    {/* Label */}
                                    <text
                                        x={x + width / 2}
                                        y={CHART_HEIGHT + 18}
                                        textAnchor="middle"
                                        className={`
                                            text-[10px] font-medium fill-slate-300 dark:fill-slate-600 transition-colors duration-300
                                            ${isToday ? 'fill-emerald-600 font-bold' : ''}
                                            ${isHovered ? 'fill-slate-800 dark:fill-white' : ''}
                                        `}
                                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                    >
                                        {label}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>



            {/* 3. Time Distribution Bar (Only show if we have data) */}
            {totalTimeChars > 0 && (
                <div className="pt-2">
                    <div className="h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-white/5">
                        <DistributionSegment value={timeDistribution.morning} total={totalTimeChars} color="bg-emerald-100/50" activeColor="bg-emerald-400" />
                        <DistributionSegment value={timeDistribution.afternoon} total={totalTimeChars} color="bg-teal-100/50" activeColor="bg-teal-500" />
                        <DistributionSegment value={timeDistribution.evening} total={totalTimeChars} color="bg-cyan-100/50" activeColor="bg-cyan-600" />
                        <DistributionSegment value={timeDistribution.night} total={totalTimeChars} color="bg-indigo-100/50" activeColor="bg-indigo-400" />
                    </div>
                </div>
            )}
        </div>
    );
}

const DistributionSegment = ({ value, total, activeColor }) => {
    if (value <= 0) return null;
    const width = (value / total) * 100;
    return (
        <div
            className={`h-full ${activeColor} first:rounded-l-full last:rounded-r-full hover:brightness-110 transition-all cursor-crosshair relative group`}
            style={{ width: `${width}%` }}
        >
            {/* Simple tooltip on hover for segments */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                {Math.round(width)}%
            </div>
        </div>
    );
};
