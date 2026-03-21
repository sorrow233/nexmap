import React, { useState, useMemo } from 'react';
import { Trophy } from 'lucide-react';

/**
 * Neural Clay Activity Chart Component
 * Soft, tactile, pastel aesthetic.
 */
export default function ActivityChart({
    data = [],
    viewMode = 'week', // 'week' | 'month' | 'year'
    timeDistribution,
    t,
    language = 'en'
}) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Dynamic Chart Configuration based on view mode
    const config = useMemo(() => {
        const isYear = viewMode === 'year';
        const isMonth = viewMode === 'month';

        return {
            height: 240,
            barWidth: isYear ? 24 : isMonth ? 8 : 48,
            gap: isYear ? 32 : isMonth ? 6 : 24,
            radius: isMonth ? 4 : 16
        };
    }, [viewMode]);

    const CHART_WIDTH = 1000;
    const CHART_HEIGHT = config.height;

    const maxChars = Math.max(...data.map(d => d.chars), 10);
    const totalChars = useMemo(() => data.reduce((acc, curr) => acc + (curr.chars || 0), 0), [data]);
    const totalTimeChars = timeDistribution ? (timeDistribution.morning + timeDistribution.afternoon + timeDistribution.evening + timeDistribution.night) : 0;

    // Check if chartData is valid, if not use prop data
    // In previous code `chartData` was undefined in the render map loop! 
    // It should differ to `data` prop.
    // Let's ensure we use `data` prop correctly.
    const chartData = data;

    // Helper to calculate container dimensions if we needed responsive SVG, 
    // but here we use viewBox so virtual dimensions are fine.
    const containerDimensions = { width: CHART_WIDTH, height: CHART_HEIGHT };

    // Format Date Label helper
    const formatDateLabel = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (viewMode === 'week') {
            return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date);
        } else if (viewMode === 'month') {
            // Show day number, but sparsely if needed (handled in logic below or CSS)
            const d = date.getDate();
            return d === 1 || d % 5 === 0 ? d : '';
        } else {
            // Year mode, dateStr usually 'YYYY-MM' or we handle month index
            return new Intl.DateTimeFormat(language, { month: 'narrow' }).format(date);
        }
    };

    return (
        <div className="space-y-4 select-none w-full h-full flex flex-col">
            {/* 1. Main Chart Area - Clean & Empty container, visuals are in SVG */}
            <div className="relative group/chart flex-1 min-h-[320px] flex flex-col justify-between">

                {/* Header / Tooltip Area */}
                <div className="flex items-end justify-between mb-6 px-2 relative z-20 h-10">
                    <span className="text-sm font-bold tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Trophy size={16} className="text-indigo-400" />
                        {viewMode === 'week' ? (t?.stats?.weeklyTrend || '7日趋势') :
                            viewMode === 'month' ? (t?.stats?.monthlyTrend || '月度趋势') :
                                (t?.stats?.yearlyTrend || '年度趋势')}
                    </span>

                    {/* Dynamic Tooltip */}
                    <div className="flex items-center justify-end transition-opacity duration-200">
                        {hoveredIndex !== null && chartData[hoveredIndex] ? (
                            <div className="flex items-center gap-3 px-5 py-2 bg-white dark:bg-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-full text-sm font-bold border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-slate-500 dark:text-slate-400">
                                    {chartData[hoveredIndex].date}
                                </span>
                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                                <span className="text-indigo-500 dark:text-indigo-400">{chartData[hoveredIndex].chars.toLocaleString()} 字</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end px-2 py-1 bg-transparent text-slate-500 dark:text-slate-400">
                                <span className="uppercase tracking-widest text-[10px] font-bold opacity-60">{t?.stats?.global || 'TOTAL'}</span>
                                <span className="text-slate-700 dark:text-white font-black text-lg">{totalChars.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* SVG Chart */}
                <div className="relative w-full flex-1 flex items-end justify-center mt-2">
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 40}`}
                        preserveAspectRatio="none"
                        className="overflow-visible"
                    >
                        <defs>
                            {/* Neural Clay Gradients (Pastel) */}
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" /> {/* Violet-400 */}
                                <stop offset="100%" stopColor="#818cf8" /> {/* Indigo-400 */}
                            </linearGradient>

                            <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#c084fc" /> {/* Purple-400 */}
                                <stop offset="100%" stopColor="#818cf8" /> {/* Indigo-400 */}
                            </linearGradient>

                            {/* Soft Drop Shadow for Clay effect */}
                            <filter id="clayShadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#818cf8" floodOpacity="0.25" />
                            </filter>
                            <filter id="clayShadowToday" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#c084fc" floodOpacity="0.35" />
                            </filter>
                        </defs>

                        {/* Guide Line */}
                        <line x1="0" y1={CHART_HEIGHT / 2} x2={CHART_WIDTH} y2={CHART_HEIGHT / 2} stroke="#e2e8f0" strokeDasharray="6 6" strokeWidth="1.5" className="dark:stroke-slate-700" />

                        {chartData.map((item, index) => {
                            const x = index * (CHART_WIDTH / chartData.length);
                            const width = (CHART_WIDTH / chartData.length) * 0.65; // Slightly thinner for elegance
                            
                            // Scale max height to 80% of CHART_HEIGHT to leave safe space for labels at the top
                            const MAX_BAR_HEIGHT = CHART_HEIGHT * 0.8;
                            const height = item.chars > 0 ? Math.max((item.chars / maxChars) * MAX_BAR_HEIGHT, 16) : 16; 
                            const y = CHART_HEIGHT - height;

                            const isToday = item.isToday;
                            const isHovered = hoveredIndex === index;

                            // CRITICAL FIX: Cap barRadius to both half-width AND half-height to prevent WebKit/Safari bloat bug
                            const barRadius = Math.min(width / 2, height / 2, 20);

                            return (
                                <g
                                    key={item.date || index}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className="cursor-pointer group"
                                >
                                    {/* Hover Interaction Zone (Invisible but wider) */}
                                    <rect
                                        x={x - width / 2}
                                        y="-40"
                                        width={width * 2}
                                        height={CHART_HEIGHT + 80}
                                        fill="transparent"
                                    />

                                    {/* The Bar */}
                                    <rect
                                        x={x + (CHART_WIDTH / chartData.length - width) / 2}
                                        y={y}
                                        width={width}
                                        height={height}
                                        rx={barRadius}
                                        ry={barRadius}
                                        fill={isToday ? "url(#barGradientToday)" : "url(#barGradient)"}
                                        fillOpacity={isHovered ? 1 : 0.9} 
                                        filter={isToday ? "url(#clayShadowToday)" : "url(#clayShadow)"}
                                        className={`transition-all duration-500 ease-out ${isHovered ? 'scale-y-[1.05]' : ''}`}
                                        style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
                                    />

                                    {/* Value Label (Always Visible) */}
                                    <text
                                        x={x + (CHART_WIDTH / chartData.length) / 2}
                                        y={y - 14}
                                        textAnchor="middle"
                                        className={`
                                            text-[11px] font-bold transition-all duration-300
                                            ${isToday ? 'fill-indigo-500 dark:fill-indigo-400' : 'fill-slate-400 dark:fill-slate-500'}
                                            ${isHovered ? 'scale-110 fill-indigo-600 dark:fill-indigo-300' : ''}
                                        `}
                                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                    >
                                        {item.chars > 0 ? (item.chars >= 1000 ? (item.chars / 1000).toFixed(1) + 'k' : item.chars) : ''}
                                    </text>

                                    {/* X-Axis Label */}
                                    <text
                                        x={x + (CHART_WIDTH / chartData.length) / 2}
                                        y={CHART_HEIGHT + 28}
                                        textAnchor="middle"
                                        className={`
                                            text-sm font-medium fill-slate-500 dark:fill-slate-400 transition-colors duration-300
                                            ${isToday ? 'fill-indigo-500 dark:fill-indigo-400 font-bold' : ''}
                                            ${isHovered ? 'fill-indigo-600 dark:fill-indigo-300' : ''}
                                        `}
                                    >
                                        {formatDateLabel(item.date)}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* 3. Time Distribution Bar - Pastel Segments */}
            {totalTimeChars > 0 && (
                <div className="pt-2 px-2 relative z-10">
                    <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700/50 shadow-inner">
                        <DistributionSegment value={timeDistribution.morning} total={totalTimeChars} color="bg-[#FDE68A] dark:bg-amber-300" />
                        <DistributionSegment value={timeDistribution.afternoon} total={totalTimeChars} color="bg-[#FDBA74] dark:bg-orange-300" />
                        <DistributionSegment value={timeDistribution.evening} total={totalTimeChars} color="bg-[#A5B4FC] dark:bg-indigo-400" />
                        <DistributionSegment value={timeDistribution.night} total={totalTimeChars} color="bg-[#D8B4FE] dark:bg-purple-400" />
                    </div>

                    {/* Legend */}
                    <div className="flex justify-between mt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#FDE68A] dark:bg-amber-300 shadow-sm"></div>{t.stats?.morning || "早晨"}</div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#FDBA74] dark:bg-orange-300 shadow-sm"></div>{t.stats?.afternoon || "下午"}</div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#A5B4FC] dark:bg-indigo-400 shadow-sm"></div>{t.stats?.evening || "晚上"}</div>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#D8B4FE] dark:bg-purple-400 shadow-sm"></div>{t.stats?.night || "深夜"}</div>
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
            className={`h-full ${color} first:rounded-l-full last:rounded-r-full transition-all relative`}
            style={{ width: `${width}%` }}
        >
        </div>
    );
};
