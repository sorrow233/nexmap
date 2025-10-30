import React, { useState, useMemo } from 'react';
import { Sun, Sunset, Moon, CloudMoon, Flame, Zap, Trophy } from 'lucide-react';

/**
 * Premium Activity Chart Component
 * Uses SVG for pixel-perfect rendering and React state for precise interactions.
 */
export default function ActivityChart({ weeklyHistory, timeDistribution, streakDays, todaySessions, t, language = 'en' }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    // Calculate chart dimensions and data scaling
    const CHART_HEIGHT = 120;
    const BAR_WIDTH = 24;
    const GAP = 12;
    const width = weeklyHistory.length * (BAR_WIDTH + GAP);

    // Find max value for scaling (min 10 to avoid flat lines for low data)
    const maxChars = Math.max(...weeklyHistory.map(d => d.chars), 10);

    // Dynamic localized day labels (Sun, Mon / 日, 月)
    const dayLabels = useMemo(() => {
        const labels = [];
        const baseDate = new Date('2024-01-07'); // A known Sunday
        for (let i = 0; i < 7; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            labels.push(new Intl.DateTimeFormat(language, { weekday: 'short' }).format(d));
        }
        return labels;
    }, [language]);

    // Most active time calculation
    const mostActive = useMemo(() => {
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

    const totalTimeChars = timeDistribution.morning + timeDistribution.afternoon + timeDistribution.evening + timeDistribution.night;

    return (
        <div className="space-y-6 select-none">
            {/* 1. Main Chart Area */}
            <div className="bg-slate-50/50 dark:bg-white/[0.02] rounded-3xl p-5 border border-slate-200/60 dark:border-white/5 relative group/chart">
                <div className="flex items-center justify-between mb-6 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Trophy size={12} />
                        {t?.stats?.weeklyTrend || '7日趋势'}
                    </span>
                    {/* Dynamic Tooltip Display Area */}
                    <div className={`h-6 flex items-center justify-end transition-opacity duration-200 ${hoveredIndex !== null ? 'opacity-100' : 'opacity-0'}`}>
                        {hoveredIndex !== null && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-bold shadow-xl animate-scale-in">
                                <span className="opacity-70">{weeklyHistory[hoveredIndex].date}</span>
                                <div className="w-px h-3 bg-white/20 dark:bg-black/10"></div>
                                <span>{weeklyHistory[hoveredIndex].chars.toLocaleString()} Chars</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* SVG Chart */}
                <div className="relative h-[140px] w-full flex justify-center cursor-crosshair">
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${CHART_HEIGHT + 20}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
                        {/* Define Gradients */}
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="rgb(249 115 22)" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="rgb(251 191 36)" stopOpacity="0.9" />
                            </linearGradient>
                            <linearGradient id="barGradientInactive" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Grid Lines (Optional, subtle) */}
                        <line x1="0" y1={CHART_HEIGHT} x2={width} y2={CHART_HEIGHT} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
                        <line x1="0" y1="0" x2={width} y2="0" stroke="currentColor" strokeOpacity="0.05" strokeDasharray="4 4" strokeWidth="1" />

                        {weeklyHistory.map((day, i) => {
                            const height = Math.max((day.chars / maxChars) * CHART_HEIGHT, 4); // Min height 4px
                            const x = i * (BAR_WIDTH + GAP);
                            const y = CHART_HEIGHT - height;
                            const isToday = i === weeklyHistory.length - 1;
                            const isHovered = hoveredIndex === i;

                            return (
                                <g
                                    key={day.date}
                                    transform={`translate(${x}, 0)`}
                                    onMouseEnter={() => setHoveredIndex(i)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className="transition-all duration-300 ease-out"
                                    style={{ opacity: hoveredIndex !== null && !isHovered ? 0.4 : 1 }}
                                >
                                    {/* Interaction Hit Area (Invisible but tall) */}
                                    <rect x="-3" y="0" width={BAR_WIDTH + 6} height={CHART_HEIGHT + 30} fill="transparent" />

                                    {/* The Bar */}
                                    <rect
                                        x="0"
                                        y={y}
                                        width={BAR_WIDTH}
                                        height={height}
                                        rx="6"
                                        fill={isToday ? "url(#barGradient)" : "currentColor"}
                                        className={`text-slate-300 dark:text-slate-600 transition-all duration-500 ease-spring ${isToday ? 'filter drop-shadow-lg shadow-orange-500/20' : ''}`}
                                        style={{
                                            transformOrigin: `center ${CHART_HEIGHT}px`,
                                            transform: isHovered ? 'scaleY(1.05) scaleX(1.1)' : 'scaleY(1)',
                                        }}
                                    />

                                    {/* Top Sparkle for active bars */}
                                    {isHovered && day.chars > 0 && (
                                        <circle cx={BAR_WIDTH / 2} cy={y} r="3" fill="white" className="animate-ping" />
                                    )}

                                    {/* X-Axis Label */}
                                    <text
                                        x={BAR_WIDTH / 2}
                                        y={CHART_HEIGHT + 18}
                                        textAnchor="middle"
                                        className={`text-[10px] font-bold fill-slate-400 dark:fill-slate-500 transition-colors ${isToday ? 'fill-orange-500' : ''} ${isHovered ? 'fill-slate-800 dark:fill-white scale-110' : ''}`}
                                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                    >
                                        {dayLabels[day.dayOfWeek]}
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

            {/* 3. Time Distribution Bar (Enhanced) */}
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
    <div className={`rounded-2xl p-4 border bg-gradient-to-br ${bg} ${border} transition-transform hover:scale-[1.02]`}>
        <div className="flex flex-col h-full justify-between gap-2">
            <div className="flex items-center gap-1.5 opacity-80">
                <Icon size={14} className={color} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {value}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{unit}</span>
            </div>
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
