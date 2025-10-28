import React from 'react';
import { Sun, Sunset, Moon, CloudMoon, Flame, Zap } from 'lucide-react';

/**
 * 7-Day Activity Chart Component
 * Displays a bar chart of the last 7 days of activity data
 */
export default function ActivityChart({ weeklyHistory, timeDistribution, streakDays, todaySessions, t }) {
    // Calculate max value for scaling bars
    const maxChars = Math.max(...weeklyHistory.map(d => d.chars), 1);

    // Day labels (short form)
    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

    // Get most active time period
    const getMostActiveTime = () => {
        const { morning, afternoon, evening, night } = timeDistribution;
        const total = morning + afternoon + evening + night;
        if (total === 0) return null;

        const periods = [
            { key: 'morning', value: morning, label: t?.stats?.morning || '早晨', icon: Sun, color: 'text-amber-500' },
            { key: 'afternoon', value: afternoon, label: t?.stats?.afternoon || '下午', icon: Sunset, color: 'text-orange-500' },
            { key: 'evening', value: evening, label: t?.stats?.evening || '晚上', icon: Moon, color: 'text-indigo-500' },
            { key: 'night', value: night, label: t?.stats?.night || '深夜', icon: CloudMoon, color: 'text-purple-500' }
        ];

        return periods.reduce((a, b) => a.value > b.value ? a : b);
    };

    const mostActive = getMostActiveTime();
    const totalTimeChars = timeDistribution.morning + timeDistribution.afternoon + timeDistribution.evening + timeDistribution.night;

    return (
        <div className="space-y-4">
            {/* 7-Day Bar Chart */}
            <div className="bg-slate-100/50 dark:bg-white/[0.02] rounded-2xl p-4 border border-slate-200/50 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t?.stats?.weeklyTrend || '7日趋势'}
                    </span>
                </div>

                {/* Bar Chart */}
                <div className="flex items-end justify-between gap-1 h-16">
                    {weeklyHistory.map((day, index) => {
                        const heightPercent = maxChars > 0 ? (day.chars / maxChars) * 100 : 0;
                        const isToday = index === weeklyHistory.length - 1;

                        return (
                            <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                                <div className="relative w-full h-14 flex items-end justify-center group">
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none">
                                        {day.chars.toLocaleString()}
                                    </div>
                                    {/* Bar */}
                                    <div
                                        className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 ease-out ${isToday
                                                ? 'bg-gradient-to-t from-orange-500 to-amber-400 shadow-lg shadow-orange-500/20'
                                                : day.chars > 0
                                                    ? 'bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-500'
                                                    : 'bg-slate-200/50 dark:bg-white/5'
                                            }`}
                                        style={{
                                            height: `${Math.max(heightPercent, day.chars > 0 ? 8 : 4)}%`,
                                            minHeight: day.chars > 0 ? '8px' : '4px'
                                        }}
                                    />
                                </div>
                                <span className={`text-[10px] font-bold ${isToday
                                        ? 'text-orange-500'
                                        : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                    {dayLabels[day.dayOfWeek]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
                {/* Streak */}
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 rounded-xl p-3 border border-orange-500/10 dark:border-orange-500/20">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Flame size={12} className="text-orange-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t?.stats?.streakDays || '连续'}
                        </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                        {streakDays}
                        <span className="text-xs font-bold text-slate-400 ml-1">{t?.stats?.days || '天'}</span>
                    </div>
                </div>

                {/* Sessions */}
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-xl p-3 border border-blue-500/10 dark:border-blue-500/20">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Zap size={12} className="text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t?.stats?.sessions || '会话'}
                        </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                        {todaySessions}
                        <span className="text-xs font-bold text-slate-400 ml-1">{t?.stats?.times || '次'}</span>
                    </div>
                </div>

                {/* Most Active Time */}
                <div className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 dark:from-purple-500/20 dark:to-fuchsia-500/20 rounded-xl p-3 border border-purple-500/10 dark:border-purple-500/20">
                    <div className="flex items-center gap-1.5 mb-1">
                        {mostActive ? (
                            <mostActive.icon size={12} className={mostActive.color} />
                        ) : (
                            <Sun size={12} className="text-slate-400" />
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

            {/* Time Distribution Bar */}
            {totalTimeChars > 0 && (
                <div className="bg-slate-100/50 dark:bg-white/[0.02] rounded-xl p-3 border border-slate-200/50 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t?.stats?.timeDistribution || '时间分布'}
                        </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-white/10">
                        {timeDistribution.morning > 0 && (
                            <div
                                className="h-full bg-amber-400 transition-all"
                                style={{ width: `${(timeDistribution.morning / totalTimeChars) * 100}%` }}
                                title={`${t?.stats?.morning || '早晨'}: ${timeDistribution.morning.toLocaleString()}`}
                            />
                        )}
                        {timeDistribution.afternoon > 0 && (
                            <div
                                className="h-full bg-orange-500 transition-all"
                                style={{ width: `${(timeDistribution.afternoon / totalTimeChars) * 100}%` }}
                                title={`${t?.stats?.afternoon || '下午'}: ${timeDistribution.afternoon.toLocaleString()}`}
                            />
                        )}
                        {timeDistribution.evening > 0 && (
                            <div
                                className="h-full bg-indigo-500 transition-all"
                                style={{ width: `${(timeDistribution.evening / totalTimeChars) * 100}%` }}
                                title={`${t?.stats?.evening || '晚上'}: ${timeDistribution.evening.toLocaleString()}`}
                            />
                        )}
                        {timeDistribution.night > 0 && (
                            <div
                                className="h-full bg-purple-600 transition-all"
                                style={{ width: `${(timeDistribution.night / totalTimeChars) * 100}%` }}
                                title={`${t?.stats?.night || '深夜'}: ${timeDistribution.night.toLocaleString()}`}
                            />
                        )}
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] font-medium text-slate-400">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span>{t?.stats?.morning || '早'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <span>{t?.stats?.afternoon || '午'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span>{t?.stats?.evening || '晚'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-purple-600" />
                            <span>{t?.stats?.night || '夜'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
