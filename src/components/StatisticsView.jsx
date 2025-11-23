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

            {/* Main Grid Layout - Zen Style */}
            <div className="space-y-6">

                {/* 1. Top Row: Hero & Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                    {/* Hero Card: Creative Power (Total Tokens/Chars) - Minimalist Typographic */}
                    <div className="md:col-span-2 p-8 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.05)] relative overflow-hidden group flex flex-col justify-between min-h-[180px]">
                        {/* Subtle background decoration - Zen Circle/Enso hint */}
                        <div className="absolute -right-10 -top-10 w-64 h-64 bg-slate-50 dark:bg-white/5 rounded-full blur-3xl pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-800 dark:bg-slate-200"></span>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                    {t.stats?.creativePower || "Creative Power"}
                                </p>
                            </div>

                            <div className="mt-2">
                                <h3 className="text-6xl sm:text-7xl font-light text-slate-800 dark:text-slate-100 tracking-tighter tabular-nums text-shadow-none">
                                    {fmt(stats.tokenStats.totalChars)}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs mt-1">
                                <Layers size={12} strokeWidth={2} />
                                <span>{t.stats?.totalElements || "Total Cards"} generated across all projects</span>
                            </div>
                        </div>
                    </div>

                    {/* Streak Card - Zen */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.05)] flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-hover:text-orange-900/60 dark:group-hover:text-orange-400 transition-colors">
                                    {t.stats?.currentStreak || "Active Streak"}
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-4xl font-light text-slate-800 dark:text-slate-100 tracking-tight">
                                        {stats.tokenStats.streakDays}
                                    </h3>
                                    <span className="text-sm text-slate-400 font-medium">{t.stats?.days || "days"}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-50 text-orange-400 dark:bg-orange-500/10 dark:text-orange-400 group-hover:bg-orange-100 transition-colors">
                                <Activity size={16} strokeWidth={2} />
                            </div>
                        </div>
                        <div className="w-full bg-slate-50 dark:bg-white/5 h-1 mt-4 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400/80 rounded-full w-1/3"></div> {/* Placeholder progress */}
                        </div>
                    </div>

                    {/* AI Quota Card - Zen */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.05)] flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-hover:text-emerald-900/60 dark:group-hover:text-emerald-400 transition-colors">
                                    {t.stats?.aiQuota || "AI Quota"}
                                </p>
                                <h3 className="text-4xl font-light text-slate-800 dark:text-slate-100 tracking-tight">
                                    {stats.credits?.credits?.toLocaleString() || 200}
                                </h3>
                            </div>
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 group-hover:bg-emerald-100 transition-colors">
                                <Zap size={16} fill="currentColor" className="opacity-80" />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-800 dark:bg-slate-200 rounded-full"
                                    style={{ width: `${Math.min(100, ((stats.credits?.credits || 0) / (stats.credits?.initialCredits || 1)) * 100)}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300">{Math.min(100, Math.round(((stats.credits?.credits || 0) / (stats.credits?.initialCredits || 1)) * 100))}%</span>
                        </div>
                    </div>
                </div>

                {/* Secondary Metrics Row (Boards, Cards) - Tiny Zen Cards */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Boards KPI */}
                    <div className="px-6 py-4 bg-white dark:bg-[#111] rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-slate-200 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-400">
                                <Database size={18} strokeWidth={1.5} />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{stats.totalBoards}</h3>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t.stats?.totalBoards || "Zenvases"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Cards KPI */}
                    <div className="px-6 py-4 bg-white dark:bg-[#111] rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-slate-200 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-400">
                                <Layers size={18} strokeWidth={1.5} />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{stats.totalCards}</h3>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t.stats?.totalElements || "Nodes"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Middle Row: Activity Chart - Zen Clean */}
                <div className="min-h-[320px] bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 relative overflow-hidden flex flex-col shadow-[0_4px_20px_-12px_rgba(0,0,0,0.05)]">
                    <div className="p-8 pb-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {/* Minimal Icon */}
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 dark:bg-white/5">
                                <BarChart3 size={16} strokeWidth={2} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 tracking-wide uppercase">
                                {t.stats?.dailyActivity || "Activity Flow"}
                            </h3>
                        </div>

                        {/* Minimal Toggle */}
                        <div className="flex bg-slate-50 dark:bg-white/5 rounded-full p-1">
                            {['week', 'month', 'year'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setChartViewMode(mode)}
                                    className={`
                                        px-4 py-1.5 text-[10px] font-bold rounded-full transition-all
                                        ${chartViewMode === mode
                                            ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
                                    `}
                                >
                                    {mode === 'week' ? (t.stats?.weeklyTrend || '本周') : mode === 'month' ? '本月' : '本年'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 flex-1 min-h-[240px] px-6 pb-6 mt-4">
                        <ActivityChart
                            data={getChartData()}
                            viewMode={chartViewMode}
                            timeDistribution={stats.tokenStats.timeDistribution || { morning: 0, afternoon: 0, evening: 0, night: 0 }}
                            t={t}
                            language={useLanguage().language}
                        />
                    </div>
                </div>

                {/* 3. Bottom Row: Detailed Insights - Zen Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sessions Card */}
                    <div className="p-8 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col justify-center items-center gap-2 group hover:shadow-lg transition-all duration-300">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-50/50 text-blue-400 dark:bg-blue-500/10 rounded-full mb-1">
                            <Zap size={18} strokeWidth={2} />
                        </div>
                        <h3 className="text-4xl font-light text-slate-800 dark:text-slate-100">
                            {stats.tokenStats.todaySessions || 0}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.stats?.sessions || "Sessions"}</span>
                    </div>

                    {/* Active Time Card */}
                    <div className="p-8 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col justify-center items-center gap-2 group hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 ${mostActive?.bg || 'bg-slate-50'}`}></div>
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full mb-1 transition-colors duration-300 ${mostActive ? mostActive.bg.replace('border-', '').replace('/10', '/30') : 'bg-slate-50 text-slate-400'}`}>
                            {mostActive ? (
                                <mostActive.icon size={18} strokeWidth={2} className={mostActive.color} />
                            ) : (
                                <Clock size={18} strokeWidth={2} />
                            )}
                        </div>

                        <h3 className="text-2xl font-medium text-slate-800 dark:text-slate-100">
                            {mostActive ? mostActive.label : (
                                <span className="text-slate-300">--</span>
                            )}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.stats?.activeTime || "Peak Time"}</span>
                    </div>

                    {/* Model Usage Card */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col group hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 flex items-center justify-center bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 rounded-full">
                                <Cpu size={12} strokeWidth={2} />
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Models</span>
                        </div>

                        <div className="flex-1 space-y-3">
                            {Object.entries(stats.tokenStats.modelUsage || {}).length === 0 ? (
                                <div className="text-xs text-slate-300 text-center py-4 italic">No data yet</div>
                            ) : (
                                Object.entries(stats.tokenStats.modelUsage).sort(([, a], [, b]) => b - a).slice(0, 3).map(([model, count]) => (
                                    <div key={model} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px] font-medium" title={model}>{model}</span>
                                        <div className="flex items-center gap-3 flex-1 ml-4 justify-end">
                                            <div className="w-16 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-800 dark:bg-slate-400 rounded-full opacity-60" style={{ width: `${(count / Math.max(...Object.values(stats.tokenStats.modelUsage))) * 100}%` }}></div>
                                            </div>
                                            <span className="font-mono text-slate-400 w-8 text-right">{count}</span>
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
