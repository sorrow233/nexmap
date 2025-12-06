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
            height: 140,
            barWidth: isYear ? 16 : isMonth ? 6 : 24,
            gap: isYear ? 24 : isMonth ? 4 : 12,
            radius: isMonth ? 2 : 6
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
        <div className="space-y-6 select-none w-full h-full flex flex-col">
            {/* 1. Main Chart Area - Clean & Empty container, visuals are in SVG */}
            <div className="relative group/chart flex-1 min-h-[180px] flex flex-col justify-between">

                {/* Header / Tooltip Area */}
                <div className="flex items-center justify-between mb-4 px-2 relative z-20 h-8">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Trophy size={14} className="text-indigo-300" />
                        {viewMode === 'week' ? (t?.stats?.weeklyTrend || 'Weekly Trend') :
                            viewMode === 'month' ? (t?.stats?.monthlyTrend || 'Monthly Trend') :
                                (t?.stats?.yearlyTrend || 'Yearly Trend')}
                    </span>

                    {/* Dynamic Tooltip */}
                    <div className="flex items-center justify-end transition-opacity duration-200">
                        {hoveredIndex !== null && chartData[hoveredIndex] ? (
                            <div className="flex items-center gap-3 px-4 py-1.5 bg-white shadow-[4px_4px_12px_rgba(0,0,0,0.05),-4px_-4px_12px_#ffffff] rounded-full text-xs font-bold border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-slate-400">
                                    {chartData[hoveredIndex].date}
                                </span>
                                <div className="w-px h-3 bg-slate-200"></div>
                                <span className="text-indigo-500">{chartData[hoveredIndex].chars.toLocaleString()} Chars</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1 bg-transparent text-slate-400 rounded-full text-xs font-bold">
                                <span className="uppercase tracking-wider opacity-70">{t?.stats?.global || 'TOTAL'}</span>
                                <span className="text-slate-600 font-mono">{totalChars.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* SVG Chart */}
                <div className="relative w-full flex-1 flex items-end justify-center">
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
                                <stop offset="0%" stopColor="#818cf8" /> {/* Indigo-400 */}
                                <stop offset="100%" stopColor="#c084fc" /> {/* Purple-400 */}
                            </linearGradient>

                            <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f472b6" /> {/* Pink-400 */}
                                <stop offset="100%" stopColor="#fb7185" /> {/* Rose-400 */}
                            </linearGradient>

                            {/* Soft Drop Shadow for Clay effect */}
                            <filter id="clayShadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#818cf8" floodOpacity="0.3" />
                            </filter>
                            <filter id="clayShadowToday" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#f472b6" floodOpacity="0.4" />
                            </filter>
                        </defs>

                        {/* Guide Line */}
                        <line x1="0" y1={CHART_HEIGHT / 2} x2={CHART_WIDTH} y2={CHART_HEIGHT / 2} stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" opacity="0.5" />

                        {chartData.map((item, index) => {
                            const x = index * (CHART_WIDTH / chartData.length);
                            const width = (CHART_WIDTH / chartData.length) * 0.6; // 60% bar width
                            const height = item.chars > 0 ? Math.max((item.chars / maxChars) * CHART_HEIGHT, 8) : 8; // Min height 8px for visibility
                            const y = CHART_HEIGHT - height;

                            const isToday = item.isToday;
                            const isHovered = hoveredIndex === index;

                            // Calculate Bar Radius based on width (capped)
                            const barRadius = Math.min(width / 2, 12);

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
                                        y="0"
                                        width={width * 2}
                                        height={CHART_HEIGHT + 40}
                                        fill="transparent"
                                    />

                                    {/* The Bar */}
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        rx={barRadius}
                                        ry={barRadius}
                                        fill={isToday ? "url(#barGradientToday)" : "url(#barGradient)"}
                                        fillOpacity={isHovered ? 1 : 0.85} // Slightly transparent for glass feel
                                        filter={isToday ? "url(#clayShadowToday)" : "url(#clayShadow)"}
                                        className={`transition-all duration-500 ease-spring ${isHovered ? 'scale-y-105 -translate-y-1' : ''}`}
                                        style={{ transformOrigin: 'bottom' }}
                                    />

                                    {/* Value Label (Visible on hover or if significant) */}
                                    <text
                                        x={x + width / 2}
                                        y={y - 12}
                                        textAnchor="middle"
                                        className={`
                                            text-[10px] font-bold fill-slate-400 transition-all duration-300
                                            ${isToday ? 'fill-pink-400' : ''}
                                            ${isHovered ? 'fill-indigo-500 scale-110' : 'opacity-0'}
                                        `}
                                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                    >
                                        {item.chars > 0 ? (item.chars >= 1000 ? (item.chars / 1000).toFixed(1) + 'k' : item.chars) : ''}
                                    </text>

                                    {/* X-Axis Label */}
                                    <text
                                        x={x + width / 2}
                                        y={CHART_HEIGHT + 24}
                                        textAnchor="middle"
                                        className={`
                                            text-[10px] font-medium fill-slate-400 transition-colors duration-300
                                            ${isToday ? 'fill-pink-400 font-bold' : ''}
                                            ${isHovered ? 'fill-indigo-500' : ''}
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
                <div className="pt-2 px-2">
                    <div className="h-3 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
                        <DistributionSegment value={timeDistribution.morning} total={totalTimeChars} color="bg-amber-200" />
                        <DistributionSegment value={timeDistribution.afternoon} total={totalTimeChars} color="bg-orange-300" />
                        <DistributionSegment value={timeDistribution.evening} total={totalTimeChars} color="bg-indigo-300" />
                        <DistributionSegment value={timeDistribution.night} total={totalTimeChars} color="bg-purple-300" />
                    </div>

                    {/* Legend */}
                    <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-200 shadow-sm"></div>{t.stats?.morning || "MORN"}</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-300 shadow-sm"></div>{t.stats?.afternoon || "NOON"}</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-300 shadow-sm"></div>{t.stats?.evening || "EVE"}</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-300 shadow-sm"></div>{t.stats?.night || "NIGHT"}</div>
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
            className={`h-full ${color} first:rounded-l-full last:rounded-r-full hover:brightness-105 transition-all cursor-crosshair relative group`}
            style={{ width: `${width}%` }}
        >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-slate-600 shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-[10px] font-bold rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                {Math.round(width)}%
            </div>
        </div>
    );
};
