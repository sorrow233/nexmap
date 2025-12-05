import React, { useEffect, useState } from 'react';
import { BarChart3, Database, Layers, Zap, Activity, Clock, Cpu } from 'lucide-react';
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

            {/* Main Grid - Revised Layout to 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

                {/* Left Column: KPI Stats (Stacked) */}
                <div className="md:col-span-1 space-y-4">
                    {/* Boards KPI -> "Canvas" */}
                    <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-white/5 dark:to-white/0 rounded-3xl border border-slate-200/60 dark:border-white/10 flex items-center justify-between group hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors group-hover:text-indigo-500">
                                {t.stats?.totalBoards || "画布总数"} {/* Canvas */}
                            </p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{stats.totalBoards}</h3>
                        </div>
                        <div className="w-12 h-12 flex items-center justify-center bg-indigo-50 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            <Database size={20} strokeWidth={2.5} />
                        </div>
                    </div>

                    {/* Cards KPI -> "Cards" */}
                    <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-white/5 dark:to-white/0 rounded-3xl border border-slate-200/60 dark:border-white/10 flex items-center justify-between group hover:border-fuchsia-500/30 hover:shadow-xl hover:shadow-fuchsia-500/5 transition-all duration-300">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors group-hover:text-fuchsia-500">
                                {t.stats?.totalElements || "卡片总数"} {/* Cards */}
                            </p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{stats.totalCards}</h3>
                        </div>
                        <div className="w-12 h-12 flex items-center justify-center bg-fuchsia-50 text-fuchsia-500 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                            <Layers size={20} strokeWidth={2.5} />
                        </div>
                    </div>

                    {/* Activity KPI -> "Consecutive Active Days" */}
                    <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-white/5 dark:to-white/0 rounded-3xl border border-slate-200/60 dark:border-white/10 flex items-center justify-between group hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors group-hover:text-orange-500">
                                {t.stats?.currentStreak || "连续在线天数"} {/* Consecutive Active Days */}
                            </p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{stats.tokenStats.streakDays} <span className="text-sm font-medium text-slate-400 font-sans tracking-normal">{t.stats?.days || "天"}</span></h3>
                        </div>
                        <div className="w-12 h-12 flex items-center justify-center bg-orange-50 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                            <Activity size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Middle & Right: Main Content Area */}
                <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Activity Chart (Spans full width of this sub-grid, effectively 2 cols) */}
                    <div className="lg:col-span-2 min-h-[400px]">
                        <div className="h-full p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200/60 dark:border-white/5 relative overflow-hidden flex flex-col shadow-sm">
                            {/* Header & Controls */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 relative z-10 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 flex items-center justify-center bg-orange-50 text-orange-500 dark:bg-orange-500/20 rounded-xl">
                                        <BarChart3 size={18} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                            {t.stats?.dailyActivity || "Activity Volume"}
                                        </h3>
                                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                            {t.stats?.globalChars || "Character Generation"}: <span className="text-slate-600 dark:text-slate-300 font-bold">{getChartData().reduce((acc, item) => acc + (item.chars || 0), 0).toLocaleString()}</span>
                                        </div>
                                    </div>
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

                            {/* Chart */}
                            <div className="relative z-10 flex-1 min-h-[240px]">
                                <ActivityChart
                                    data={getChartData()}
                                    viewMode={chartViewMode}
                                    timeDistribution={stats.tokenStats.timeDistribution || { morning: 0, afternoon: 0, evening: 0, night: 0 }}
                                    streakDays={stats.tokenStats.streakDays || 0}
                                    todaySessions={stats.tokenStats.todaySessions || 0}
                                    t={t}
                                    language={useLanguage().language}
                                />
                            </div>

                            {/* Decor */}
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                        </div>
                    </div>

                    {/* Bottom Row of Middle: Model Usage */}
                    <div className="h-full p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200/60 dark:border-white/5 relative overflow-hidden flex flex-col shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-500 dark:bg-blue-500/20 rounded-xl">
                                <Cpu size={18} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 leading-tight">模型使用分布</h3>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Model Usage</div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[220px] custom-scrollbar">
                            {Object.entries(stats.tokenStats.modelUsage || {}).length === 0 ? (
                                <div className="text-sm text-slate-400 text-center py-8 opacity-60">
                                    暂无模型使用数据
                                </div>
                            ) : (
                                Object.entries(stats.tokenStats.modelUsage).sort(([, a], [, b]) => b - a).map(([model, count], idx) => {
                                    const maxVal = Math.max(...Object.values(stats.tokenStats.modelUsage));
                                    const percent = (count / maxVal) * 100;
                                    return (
                                        <div key={model} className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                                <span>{model}</span>
                                                <span>{count}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full opacity-80"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Bottom Row of Middle: AI Quota (Resized to Medium) */}
                    <div className="h-full p-6 bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-900 dark:to-violet-950 rounded-3xl text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group border border-white/10 transition-all duration-500 hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/3 transition-colors duration-700 pointer-events-none"></div>

                        <div className="flex flex-col h-full relative z-10 justify-between gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm shadow-inner">
                                        <Zap size={20} className="text-yellow-300" fill="currentColor" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-60 block">{t.stats?.neuralCloud || "Cloud Sync"}</span>
                                        <span className="text-lg font-bold text-white">{t.stats?.aiQuota || "AI Quota"}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
                                        {stats.credits?.credits?.toLocaleString() || 200}
                                    </div>
                                    <div className="text-[10px] font-bold text-white/60">{t.stats?.creditsRemaining || "剩余"}</div>
                                </div>
                            </div>

                            <div className="">
                                {user ? (
                                    stats.loadingCredits ? (
                                        <div className="animate-pulse space-y-2">
                                            <div className="h-2 w-full bg-white/10 rounded-full"></div>
                                        </div>
                                    ) : stats.credits ? (
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/50">
                                                    <span>{t.stats?.creditsUsed || "已使用"}</span>
                                                    <span>{Math.round((stats.credits.credits / stats.credits.initialCredits) * 100)}% {t.stats?.creditsRemaining || "剩余"}</span>
                                                </div>
                                                {/* Modern Progress Bar */}
                                                <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-md ring-1 ring-white/10 p-0.5">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-white to-indigo-100 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-1000 ease-out relative"
                                                        style={{ width: `${Math.min(100, (stats.credits.credits / stats.credits.initialCredits) * 100)}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-white/50 bg-white/5 p-4 rounded-xl border border-white/5">
                                            {t.stats?.syncUnknown || "状态位置"}. <br />
                                        </div>
                                    )
                                ) : (
                                    <div className="flex items-center gap-2 py-2 px-3 bg-white/10 rounded-lg border border-white/5">
                                        <span className="text-xs font-medium text-white/80">{t.stats?.localStorageOnly || "纯本地模式"}</span>
                                    </div>
                                )}
                            </div>
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
