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

    // Most active time calculation
    const mostActive = useMemo(() => {
        if (!timeDistribution) return null;
        const { morning, afternoon, evening, night } = timeDistribution;
        const total = morning + afternoon + evening + night;
        if (total === 0) return null;

        const periods = [
            { key: 'morning', value: morning, label: t?.stats?.morning || '早晨', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
            { key: 'afternoon', value: afternoon, label: t?.stats?.afternoon || '下午', icon: Sunset, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
            { key: 'evening', value: evening, label: t?.stats?.evening || '晚上', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20' },
            { key: 'night', value: night, label: t?.stats?.night || '深夜', icon: CloudMoon, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' }
        ];

        return periods.reduce((a, b) => a.value > b.value ? a : b);
    }, [timeDistribution, t]);

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
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                            <Trophy size={12} />
                            {viewMode === 'week' ? (t?.stats?.weeklyTrend || '7日趋势') :
                                viewMode === 'month' ? (t?.stats?.monthlyTrend || '月度趋势') :
                                    (t?.stats?.yearlyTrend || '年度趋势')}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 pl-[19px]">
                            {t?.stats?.globalChars || '生成字符数'}: <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{totalChars.toLocaleString()}</span>
                        </span>
                    </div>
                    {/* Dynamic Tooltip Display Area */}
                    <div className={`h-6 flex items-center justify-end transition-opacity duration-200 ${hoveredIndex !== null ? 'opacity-100' : 'opacity-0'}`}>
                        {hoveredIndex !== null && data[hoveredIndex] && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <span className="opacity-70">
                                    {viewMode === 'year'
                                        ? `${data[hoveredIndex].year}-${data[hoveredIndex].monthIndex + 1}`
                                        : data[hoveredIndex].date}
                                </span>
                                <div className="w-px h-3 bg-white/20 dark:bg-black/10"></div>
                                <span>{data[hoveredIndex].chars.toLocaleString()} Chars</span>
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

                                    {/* The Bar */}
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        rx={viewMode === 'month' ? 2 : 4}
                                        fill={isToday ? "url(#barGradient)" : "currentColor"}
                                        className={`
                                            transition-all duration-500 ease-out
                                            ${isToday ? 'filter drop-shadow-lg shadow-orange-500/20' : 'text-slate-300 dark:text-slate-700/50'}
                                            ${isHovered ? 'opacity-100 text-slate-800 dark:text-slate-200' : ''}
                                        `}
                                    />

                                    {/* Label */}
                                    <text
                                        x={x + width / 2}
                                        y={CHART_HEIGHT + 18}
                                        textAnchor="middle"
                                        className={`
                                            text-[10px] font-bold fill-slate-400/50 dark:fill-slate-600 transition-colors duration-300
                                            ${isToday ? 'fill-orange-500' : ''}
                                            ${isHovered ? 'fill-slate-800 dark:fill-white scale-110' : ''}
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

            {/* 2. Stats Cards Grid */}
            <div className="grid grid-cols-3 gap-3">
                <StatBox
                    icon={Flame}
                    label={t?.stats?.streakDays || '连续'}
                    value={streakDays}
                    unit={t?.stats?.days || '天'}
                    color="text-orange-500"
                    bg="from-orange-500/10 to-red-500/10"
                    border="border-orange-500/10"
                />
                <StatBox
                    icon={Zap}
                    label={t?.stats?.sessions || '会话'}
                    value={todaySessions}
                    unit={t?.stats?.times || '次'}
                    color="text-blue-500"
                    bg="from-blue-500/10 to-indigo-500/10"
                    border="border-blue-500/10"
                />
                {/* Most Active Time Box */}
                <div className={`rounded-2xl p-4 border transition-all duration-300 bg-gradient-to-br ${mostActive ? mostActive.bg : 'from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 border-slate-200 dark:border-white/5'}`}>
                    <div className="flex flex-col h-full justify-between">
                        <div className="flex items-center gap-2 mb-1">
                            {mostActive ? (
                                <mostActive.icon size={14} className={mostActive.color} />
                            ) : (
                                <Sun size={14} className="text-slate-400" />
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t?.stats?.activeTime || '活跃'}
                            </span>
                        </div>
                        <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {mostActive ? mostActive.label : '--'}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Time Distribution Bar (Only show if we have data) */}
            {totalTimeChars > 0 && (
                <div className="pt-2">
                    <div className="h-3 rounded-full overflow-hidden flex shadow-inner ring-1 ring-black/5 dark:ring-white/5">
                        <DistributionSegment value={timeDistribution.morning} total={totalTimeChars} color="bg-amber-400" />
                        <DistributionSegment value={timeDistribution.afternoon} total={totalTimeChars} color="bg-orange-500" />
                        <DistributionSegment value={timeDistribution.evening} total={totalTimeChars} color="bg-indigo-500" />
                        <DistributionSegment value={timeDistribution.night} total={totalTimeChars} color="bg-purple-600" />
                    </div>
                    {/* Legend */}
                    <div className="flex justify-between mt-3 px-1 text-[10px] font-medium text-slate-400">
                        <LegendItem color="bg-amber-400" label={t?.stats?.morning || '早'} value={timeDistribution.morning} total={totalTimeChars} />
                        <LegendItem color="bg-orange-500" label={t?.stats?.afternoon || '午'} value={timeDistribution.afternoon} total={totalTimeChars} />
                        <LegendItem color="bg-indigo-500" label={t?.stats?.evening || '晚'} value={timeDistribution.evening} total={totalTimeChars} />
                        <LegendItem color="bg-purple-600" label={t?.stats?.night || '夜'} value={timeDistribution.night} total={totalTimeChars} />
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-components for cleaner code
const StatBox = ({ icon: Icon, label, value, unit, color, bg, border }) => (
    <div className={`rounded-2xl p-4 border bg-gradient-to-br ${bg} ${border} transition-transform hover:scale-[1.02] flex flex-col justify-between min-h-[90px]`}>
        <div className="flex items-center gap-1.5 opacity-90">
            <div className={`p-1 rounded-md ${color.replace('text-', 'bg-').replace('500', '500/10')}`}>
                <Icon size={14} className={color} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
            </span>
        </div>
        <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {value}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{unit}</span>
        </div>
    </div>
);

const DistributionSegment = ({ value, total, color }) => {
    if (value <= 0) return null;
    const width = (value / total) * 100;
    return (
        <div
            className={`h-full ${color} first:rounded-l-full last:rounded-r-full hover:brightness-110 transition-all cursor-crosshair relative group`}
            style={{ width: `${width}%` }}
        >
            {/* Simple tooltip on hover for segments */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                {Math.round(width)}%
            </div>
        </div>
    );
};

const LegendItem = ({ color, label, value, total }) => (
    <div className="flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default" title={`${Math.round((value / total) * 100)}%`}>
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span>{label}</span>
    </div>
);
