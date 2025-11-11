import React, { useEffect, useState } from 'react';
import { BarChart3, Database, Layers, Zap, Activity, Clock, RefreshCw } from 'lucide-react';
import { checkCredits } from '../services/systemCredits/systemCreditsService';
import { useLanguage } from '../contexts/LanguageContext';
import { userStatsService } from '../services/stats/userStatsService';
import ActivityChart from './stats/ActivityChart';
import { useStore } from '../store/useStore';

export default function StatisticsView({ boardsList, user }) {
    const { t } = useLanguage();

    // Use store for system credits if available (Local First strategy)
    // We only fetch if we don't have them or user explicitly refreshes
    const storedCredits = useStore(state => state.systemCredits);
    const setSystemCredits = useStore(state => state.setSystemCredits);

    const [stats, setStats] = useState({
        totalBoards: 0,
        activeBoards: 0,
        trashBoards: 0,
        totalCards: 0,
        lastActive: null,
        credits: storedCredits, // Initialize from store
        loadingCredits: false,
        tokenStats: {
            totalChars: 0,
            todayChars: 0,
            yesterdayChars: 0,
            weeklyHistory: [],
            timeDistribution: { morning: 0, afternoon: 0, evening: 0, night: 0 },
            todaySessions: 0,
            streakDays: 0
        }
    });

    const refreshCredentials = () => {
        if (!user) return;
        setStats(prev => ({ ...prev, loadingCredits: true }));
        checkCredits()
            .then(data => {
                setStats(prev => ({ ...prev, credits: data, loadingCredits: false }));
                // Update store cache
                if (setSystemCredits) setSystemCredits(data);
            })
            .catch(() => {
                setStats(prev => ({ ...prev, loadingCredits: false }));
            });
    };

    useEffect(() => {
        // Calculate Board Stats (Purely Local)
        const active = boardsList.filter(b => !b.deletedAt).length;
        const trash = boardsList.filter(b => b.deletedAt).length;
        const totalCards = boardsList.reduce((acc, b) => acc + (b.cardCount || 0), 0);

        let lastActive = null;
        if (boardsList.length > 0) {
            const sorted = [...boardsList].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
            if (sorted[0].lastAccessedAt) {
                lastActive = new Date(sorted[0].lastAccessedAt).toLocaleDateString() + ' ' + new Date(sorted[0].lastAccessedAt).toLocaleTimeString();
            }
        }

        // Get local token stats (extended)
        const tokenStats = userStatsService.getExtendedStats();

        // Update local stats
        setStats(prev => ({
            ...prev,
            totalBoards: boardsList.length,
            activeBoards: active,
            trashBoards: trash,
            totalCards: totalCards,
            lastActive: lastActive,
            tokenStats: tokenStats
        }));

        // Note: We do NOT auto-fetch credits here to save sync quota.
        // We rely on storedCredits (passed to initial state).
        // If storedCredits is empty and user is logged in, we might do a lazy fetch, 
        // but user explicitly asked to be careful. Let's let them click refresh.

    }, [boardsList, user]);

    // Format utility
    const fmt = (n) => n?.toLocaleString() || '0';

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

                {/* Manual Refresh for Cloud Data */}
                {user && (
                    <button
                        onClick={refreshCredentials}
                        disabled={stats.loadingCredits}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={stats.loadingCredits ? "animate-spin" : ""} />
                        <span>{stats.loadingCredits ? (t.stats?.syncing || "Syncing...") : (t.stats?.refreshCloud || "Refresh Cloud Data")}</span>
                    </button>
                )}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

                {/* KPI Cards - Staggered Entry */}
                <div className="md:col-span-1 space-y-4">
                    {/* Boards KPI */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 flex items-center justify-between group hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 animate-slide-in" style={{ animationDelay: '0ms' }}>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors group-hover:text-indigo-500/70">{t.stats?.totalBoards || "Total Boards"}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white group-hover:scale-105 transition-transform origin-left">{stats.totalBoards}</h3>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            <Database size={24} />
                        </div>
                    </div>

                    {/* Cards KPI */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 flex items-center justify-between group hover:border-fuchsia-500/30 hover:shadow-lg hover:shadow-fuchsia-500/10 transition-all duration-300 animate-slide-in" style={{ animationDelay: '100ms' }}>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors group-hover:text-fuchsia-500/70">{t.stats?.totalElements || "Total Elements"}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white group-hover:scale-105 transition-transform origin-left">{stats.totalCards}</h3>
                        </div>
                        <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-500 rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                            <Layers size={24} />
                        </div>
                    </div>

                    {/* Activity KPI */}
                    <div className="p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 flex items-center justify-between group hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 animate-slide-in" style={{ animationDelay: '200ms' }}>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors group-hover:text-orange-500/70">{t.stats?.currentStreak || "Current Streak"}</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white group-hover:scale-105 transition-transform origin-left">{stats.tokenStats.streakDays} <span className="text-sm font-medium text-slate-400 font-sans">{t.stats?.days || "days"}</span></h3>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                            <Activity size={24} />
                        </div>
                    </div>
                </div>

                {/* Chart Section (Spans 2 cols usually) */}
                <div className="md:col-span-2 lg:col-span-2 animate-slide-in" style={{ animationDelay: '300ms' }}>
                    <div className="h-full p-6 bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 relative overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                        {t.stats?.dailyActivity || "Activity Volume"}
                                    </h3>
                                    <div className="text-xs text-slate-400 font-medium">{t.stats?.globalChars || "Character Generation"}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(stats.tokenStats.todayChars)}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">{t.stats?.today || "Today"}</div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="relative z-10">
                            <ActivityChart
                                weeklyHistory={stats.tokenStats.weeklyHistory || []}
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

                {/* Credits / Cloud Section (Right Col) */}
                <div className="md:col-span-3 lg:col-span-1 animate-slide-in" style={{ animationDelay: '400ms' }}>
                    <div className="h-full p-6 bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-900 dark:to-violet-950 rounded-3xl text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group border border-white/10 transition-all duration-500 hover:scale-[1.02]">

                        {/* Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/3 transition-colors duration-700 pointer-events-none"></div>

                        <div className="flex flex-col h-full relative z-10 justify-between gap-8">
                            <div>
                                <div className="flex items-center gap-3 mb-4 opacity-90">
                                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm shadow-inner">
                                        <Zap size={20} className="text-yellow-300" fill="currentColor" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-60 block">{t.stats?.neuralCloud || "Neural Cloud"}</span>
                                        <span className="text-lg font-bold text-white">{t.stats?.aiQuota || "AI Quota"}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-white/50 leading-relaxed">
                                    {t.stats?.cardsSubtitle || "Your capacity for high-performance AI models and cloud synchronization."}
                                </p>
                            </div>

                            <div className="">
                                {user ? (
                                    stats.loadingCredits ? (
                                        <div className="animate-pulse space-y-2">
                                            <div className="h-8 w-1/2 bg-white/20 rounded-lg"></div>
                                            <div className="h-2 w-full bg-white/10 rounded-full"></div>
                                        </div>
                                    ) : stats.credits ? (
                                        <div className="space-y-4">
                                            <div className="flex items-end gap-2">
                                                <div className="text-4xl font-black tracking-tight text-white drop-shadow-sm">
                                                    {stats.credits.credits?.toLocaleString()}
                                                </div>
                                                <div className="text-sm font-bold text-white/60 mb-1.5">{t.stats?.creditsRemaining || "credits left"}</div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/50">
                                                    <span>{t.stats?.creditsUsed || "Used"}</span>
                                                    <span>{Math.round((stats.credits.credits / stats.credits.initialCredits) * 100)}% {t.stats?.creditsRemaining || "Left"}</span>
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
                                            {t.stats?.syncUnknown || "Sync status unknown"}. <br />
                                            <span className="text-xs opacity-70">{t.stats?.clickToRefresh || "Click refresh to check quota."}</span>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                        <span className="text-sm font-medium text-white/60 mb-2">{t.stats?.guestMode || "Guest Mode"}</span>
                                        <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold">{t.stats?.localStorageOnly || "Local Storage Only"}</div>
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
                    {t.stats?.lastSnapshot || "Last Snapshot"}: {stats.lastActive || (t.stats?.today || "Just now")}
                </div>
            </div>
        </div>
    );
}
