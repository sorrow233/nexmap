import React, { useEffect, useState } from 'react';
import { BarChart3, Database, Layers, Zap, Activity, Clock, Cpu, Sun, Sunset, Moon, CloudMoon } from 'lucide-react';
import { checkCredits } from '../services/systemCredits/systemCreditsService';
import { useLanguage } from '../contexts/LanguageContext';
import { userStatsService } from '../services/stats/userStatsService';
import ActivityChart from './stats/ActivityChart';
import { useStore } from '../store/useStore';

export default function StatisticsView({ boardsList, user }) {
    const { t } = useLanguage();

    // Use store for system credits if available (Local First strategy)
    const storedCredits = useStore(state => state.systemCredits);
    const setSystemCredits = useStore(state => state.setSystemCredits);

    const [chartViewMode, setChartViewMode] = useState('week'); // 'week' | 'month' | 'year'
    const [stats, setStats] = useState({
        totalBoards: 0,
        activeBoards: 0,
        trashBoards: 0,
        totalCards: 0,
        lastActive: null,
        credits: storedCredits,
        loadingCredits: false,
        tokenStats: {
            totalChars: 0,
            todayChars: 0,
            yesterdayChars: 0,
            weeklyHistory: [],
            monthlyHistory: [],
            yearlyHistory: [],
            timeDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
            todaySessions: 0,
            streakDays: 0,
            modelUsage: {}
        }
    });

    const refreshCredentials = () => {
        if (!user) return;
        setStats(prev => ({ ...prev, loadingCredits: true }));
        checkCredits()
            .then(data => {
                setStats(prev => ({ ...prev, credits: data, loadingCredits: false }));
                if (setSystemCredits) setSystemCredits(data);
            })
            .catch(() => {
                setStats(prev => ({ ...prev, loadingCredits: false }));
            });
    };

    useEffect(() => {
        // Calculate Board Stats
        const activeBoards = boardsList.filter(b => !b.deletedAt);
        const activeCount = activeBoards.length;
        const trash = boardsList.filter(b => b.deletedAt).length;
        const totalCards = activeBoards.reduce((acc, b) => acc + (b.cardCount || 0), 0);

        let lastActive = null;
        if (boardsList.length > 0) {
            const sorted = [...boardsList].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
            if (sorted[0].lastAccessedAt) {
                lastActive = new Date(sorted[0].lastAccessedAt).toLocaleDateString() + ' ' + new Date(sorted[0].lastAccessedAt).toLocaleTimeString();
            }
        }

        // Get local stats
        const basicStats = userStatsService.getExtendedStats();
        const modelUsage = userStatsService.getModelUsageStats();

        // Prepare chart data based on view mode (though we fetch all for now for simplicity, 
        // normally we'd fetch on view change if expensive)
        // We'll calculate month/year data here or in the service. 
        // For this view, let's fetch on render.
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthlyData = userStatsService.getDataForMonth(currentYear, currentMonth);
        const yearlyData = userStatsService.getDataForYear(currentYear);

        setStats(prev => ({
            ...prev,
            totalBoards: activeCount, // User specifically asked for "Canvas" count, usually means active ones
            activeBoards: activeCount,
            trashBoards: trash,
            totalCards: totalCards,
            lastActive: lastActive,
            tokenStats: {
                ...basicStats,
                monthlyHistory: monthlyData,
                yearlyHistory: yearlyData,
                modelUsage: modelUsage
            }
        }));

        if (user && !storedCredits) {
            refreshCredentials();
        }

    }, [boardsList, user]); // Note: chartViewMode doesn't need to re-trigger this, we have all data or fetch on demand

    // Format utility
    const fmt = (n) => n?.toLocaleString() || '0';

    // Get chart data based on mode
    const getChartData = () => {
        switch (chartViewMode) {
            case 'month': return stats.tokenStats.monthlyHistory || [];
            case 'year': return stats.tokenStats.yearlyHistory || [];
            case 'week':
            default: return stats.tokenStats.weeklyHistory || [];
        }
    };

    // Most active time calculation (Moved from ActivityChart)
    const timeDistribution = stats.tokenStats.timeDistribution;
    const mostActive = React.useMemo(() => {
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
        // Note: Dynamic imports for icons inside useMemo might be tricky if we want synchronous render.
        // Simplified approach below reusing imported icons since we imported them at top level but let's check imports.
        // We have Sun, Sunset, Moon, CloudMoon available from 'lucide-react'? 
        // No, current imports are: BarChart3, Database, Layers, Zap, Activity, Clock, Cpu. 
        // Need to add imports for Sun, Sunset, Moon, CloudMoon.
    }, [timeDistribution, t]);

    return (
        <div className="w-full animate-fade-in-up">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t.stats?.dataInsights || "Data & Insights"}</h2>
                        <span className="mb-2 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-500/20">Local First</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                        {t.stats?.description || "Analyze your creative habits and resource usage."}
                    </p>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div className="space-y-6">

                {/* 1. Top Row: Mixed Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                    {/* Hero Card: Creative Power (Total Tokens/Chars) - Spans 2 cols on md, full on mobile if needed */}
                    <div className="md:col-span-2 p-6 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 dark:from-indigo-600 dark:via-purple-700 dark:to-indigo-900 rounded-3xl text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group border border-white/10 flex flex-col justify-between min-h-[160px]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2 transition-all duration-700 group-hover:scale-110 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500/20 blur-[50px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <Zap size={16} fill="currentColor" className="text-yellow-300" />
                                    </div>
                                    <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest text-shadow-sm">
                                        {t.stats?.creativePower || "Creative Power"}
                                    </p>
                                </div>
                                <h3 className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-md">
                                    {fmt(stats.tokenStats.totalChars)}
                                </h3>
                            </div>
                        </div>

                        <div className="relative z-10 mt-4 flex items-center gap-2 text-indigo-100/80 text-xs font-medium">
                            <span className="bg-white/10 px-2 py-0.5 rounded text-white border border-white/10">
                                {t.stats?.globalChars || "Characters Generated"}
                            </span>
                            <span>across all projects</span>
                        </div>
                    </div>

                    {/* Right Side Grid of 4 small cards (2x2) occupying the other 2 cols? No, let's do 2 big cards or 1 big + 2 small. */}
                    {/* Let's try: Hero (2 cols) + Stroke/AI Quota (2 cols vertical or horizontal?) */}
                    {/* Actually, let's keep the row height consistent. */}

                    {/* Column 3: Stats Group 1 (Boards & Cards) - Stacked vertically or just one card? */}
                    {/* Let's put Streak and AI Quota here as significant metrics */}

                    {/* Streak Card */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200/60 dark:border-white/5 flex flex-col justify-between group hover:border-orange-500/30 transition-all duration-300 relative overflow-hidden">
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-orange-500 transition-colors">
                                    {t.stats?.currentStreak || "Active Streak"}
                                </p>
                                <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                    {stats.tokenStats.streakDays}
                                    <span className="text-sm ml-1 text-slate-400 font-medium tracking-normal opacity-60"> {t.stats?.days || "days"}</span>
                                </h3>
                            </div>
                            <div className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-500 dark:bg-orange-500/20 rounded-xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                                <Activity size={20} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                            <span>Best: 12 days</span>
                            <span className="text-orange-500 font-bold">Keep it up!</span>
                        </div>
                    </div>

                    {/* AI Quota Card */}
                    <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-900 dark:to-teal-950 rounded-3xl text-white shadow-lg shadow-emerald-500/10 relative overflow-hidden group border border-white/10 flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[30px] rounded-full translate-x-1/2 -translate-y-1/3 transition-colors duration-700 pointer-events-none"></div>

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">
                                    {t.stats?.aiQuota || "AI Quota"}
                                </p>
                                <h3 className="text-3xl font-black text-white tracking-tight">
                                    {stats.credits?.credits?.toLocaleString() || 200}
                                </h3>
                            </div>
                            <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl backdrop-blur-md">
                                <Database size={18} className="text-white" />
                            </div>
                        </div>

                        <div className="relative z-10 mt-4">
                            <div className="flex justify-between text-[10px] font-bold text-emerald-100 mb-1">
                                <span>Used</span>
                                <span>{Math.min(100, Math.round(((stats.credits?.credits || 0) / (stats.credits?.initialCredits || 1)) * 100))}%</span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                    style={{ width: `${Math.min(100, ((stats.credits?.credits || 0) / (stats.credits?.initialCredits || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Secondary Stats (Boards & Cards) - Now integrated or a thin row? */}
                    {/* Let's just add them as 2 more cards in this grid, making it a 2-row grid for the 'Top Section'? */}
                    {/* Actually, user said 'Generated Token' is THE stimulus. So it should be HUGE. */}
                    {/* Let's make the 'Creative Power' card HUGE and maybe push others to a smaller row below. */}
                </div>

                {/* Secondary Metrics Row (Boards, Cards) */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Boards KPI */}
                    <div className="p-5 bg-white dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 dark:bg-white/5 dark:text-slate-500 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors duration-300">
                                <Layers size={22} strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.totalBoards}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.stats?.totalBoards || "Files"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cards KPI */}
                    <div className="p-5 bg-white dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5 flex items-center justify-between group hover:border-fuchsia-500/30 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 dark:bg-white/5 dark:text-slate-500 rounded-2xl group-hover:bg-fuchsia-50 group-hover:text-fuchsia-500 transition-colors duration-300">
                                <Database size={22} strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.totalCards}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.stats?.totalElements || "Nodes"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Middle Row: Activity Chart (Full Width) */}
                <div className="min-h-[320px] bg-white dark:bg-[#111] rounded-3xl border border-slate-200/60 dark:border-white/5 relative overflow-hidden flex flex-col shadow-sm group">
                    {/* Header & Controls */}
                    <div className="p-6 pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between relative z-10 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-500 dark:bg-orange-500/20 rounded-xl">
                                <BarChart3 size={18} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                    {t.stats?.dailyActivity || "Activity Volume"}
                                </h3>
                                {/* Total Count is now in the tooltip area */}
                            </div>
                        </div>

                        {/* Legend / Helper Text */}
                        <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                            {t.stats?.hoverForDetails || "Hover for details"}
                        </div>

                        {/* View Mode Switcher */}
                        <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                            {['week', 'month', 'year'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setChartViewMode(mode)}
                                    className={`
                                        px-3 py-1.5 text-xs font-bold rounded-md transition-all
                                        ${chartViewMode === mode
                                            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
                                    `}
                                >
                                    {mode === 'week' ? '本周' : mode === 'month' ? '本月' : '本年'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 flex-1 min-h-[240px] px-6 pb-6">
                        <ActivityChart
                            data={getChartData()}
                            viewMode={chartViewMode}
                            timeDistribution={stats.tokenStats.timeDistribution || { morning: 0, afternoon: 0, evening: 0, night: 0 }}
                            t={t}
                            language={useLanguage().language}
                        />
                    </div>
                    {/* Decor */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                {/* 3. Bottom Row: Detailed Insights (3 Cols) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sessions Card */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200/60 dark:border-white/5 flex flex-col justify-between group hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-500 dark:bg-blue-500/20 rounded-xl">
                                <Zap size={18} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.stats?.sessions || '会话'}</span>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                {stats.tokenStats.todaySessions || 0}
                            </h3>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.stats?.today || "今日"}</span>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    </div>

                    {/* Active Time Card */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200/60 dark:border-white/5 flex flex-col justify-between group hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-300 ${mostActive ? mostActive.bg.replace('border-', '') : 'bg-amber-50 text-amber-500 dark:bg-amber-500/20'}`}>
                                {mostActive ? (
                                    <mostActive.icon size={18} strokeWidth={2.5} className={mostActive.color} />
                                ) : (
                                    <Clock size={18} strokeWidth={2.5} />
                                )}
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.stats?.activeTime || '活跃时段'}</span>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1 truncate">
                                {mostActive ? mostActive.label : (
                                    <span className="text-slate-300 dark:text-slate-700 text-2xl">--</span>
                                )}
                            </h3>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.stats?.timeDistribution || "分布"}</span>
                        </div>
                        <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-colors duration-500 ${mostActive ? mostActive.bg.split(' ')[0].replace('/10', '/20') : 'bg-amber-500/10'}`}></div>
                    </div>

                    {/* Model Usage Card */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200/60 dark:border-white/5 relative overflow-hidden flex flex-col shadow-sm group hover:border-emerald-500/30 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-500 dark:bg-emerald-500/20 rounded-xl">
                                <Cpu size={18} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">模型偏好</span>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[120px] custom-scrollbar">
                            {Object.entries(stats.tokenStats.modelUsage || {}).length === 0 ? (
                                <div className="text-xs text-slate-400 opacity-60">暂无数据</div>
                            ) : (
                                Object.entries(stats.tokenStats.modelUsage).sort(([, a], [, b]) => b - a).slice(0, 3).map(([model, count]) => (
                                    <div key={model} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]" title={model}>{model}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(count / Math.max(...Object.values(stats.tokenStats.modelUsage))) * 100}%` }}></div>
                                            </div>
                                            <span className="font-mono text-slate-500">{count}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Last Active Footer */}
            <div className="mt-8 flex justify-center opacity-40 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <Clock size={12} />
                    {t.stats?.lastSnapshot || "最后更新"}: {stats.lastActive || (t.stats?.today || "刚刚")}
                </div>
            </div>
        </div>
    );
}
