import React, { useEffect, useState } from 'react';
import { BarChart3, X, Database, CreditCard, Clock, Layers, Zap, Activity, Star, TrendingUp } from 'lucide-react';
import { checkCredits } from '../services/systemCredits/systemCreditsService';
import { useLanguage } from '../contexts/LanguageContext';
import { userStatsService } from '../services/stats/userStatsService';
import ActivityChart from './stats/ActivityChart';

export default function UsageStatsModal({ isOpen, onClose, boardsList, user }) {
    if (!isOpen) return null;

    const { t } = useLanguage();

    const [stats, setStats] = useState({
        totalBoards: 0,
        activeBoards: 0,
        trashBoards: 0,
        totalCards: 0,
        lastActive: null,
        credits: null,
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

    useEffect(() => {
        if (!isOpen) return;

        // Calculate Board Stats
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

        setStats(prev => ({
            ...prev,
            totalBoards: boardsList.length,
            activeBoards: active,
            trashBoards: trash,
            totalCards: totalCards,
            lastActive: lastActive,
            tokenStats: tokenStats
        }));

        // Fetch Credits if user is logged in
        if (user) {
            setStats(prev => ({ ...prev, loadingCredits: true }));
            checkCredits()
                .then(data => {
                    setStats(prev => ({ ...prev, credits: data, loadingCredits: false }));
                })
                .catch(() => {
                    setStats(prev => ({ ...prev, credits: null, loadingCredits: false }));
                });
        }

    }, [isOpen, boardsList, user]);

    // Format utility
    const fmt = (n) => n?.toLocaleString() || '0';

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-lg z-[100] flex items-center justify-center font-sans p-4 animate-fade-in transition-all duration-300">
            {/* Main Container - Modern Glass/Flat hybrid */}
            <div className="bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-2xl w-full max-w-2xl rounded-[32px] shadow-2xl shadow-black/20 overflow-hidden border border-white/20 dark:border-white/5 transform transition-all scale-100 animate-scale-in ring-1 ring-black/5 dark:ring-white/5">

                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
                            <BarChart3 size={22} className="" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t.stats?.title || "Your Creative Journey"}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t.stats?.loading ? t.stats.loading.replace('...', '') : "Insights & Metrics"}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-all text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Bento Grid Content */}
                <div className="p-8 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                    {/* Top Row: Daily Activity (Hero Section) */}
                    <div className="md:col-span-2 lg:col-span-3">
                        <div className="p-6 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100/80 dark:hover:bg-white/[0.04] rounded-[24px] border border-slate-200/50 dark:border-white/5 transition-all relative overflow-hidden group">
                            {/* Decorative blurred blob */}
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-400/10 dark:bg-orange-400/20 blur-[60px] rounded-full group-hover:bg-orange-400/15 transition-colors pointer-events-none"></div>

                            <div className="relative z-10">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                                {t.stats?.dailyActivity || "Daily Activity"}
                                            </h3>
                                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                    {fmt(stats.tokenStats.todayChars)}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chars Today</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Summary Pills */}
                                    <div className="flex gap-2">
                                        <div className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                            Total: {fmt(stats.tokenStats.totalChars)}
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Chart Component (Full Width) */}
                                <div className="mt-2">
                                    <ActivityChart
                                        weeklyHistory={stats.tokenStats.weeklyHistory || []}
                                        timeDistribution={stats.tokenStats.timeDistribution || { morning: 0, afternoon: 0, evening: 0, night: 0 }}
                                        streakDays={stats.tokenStats.streakDays || 0}
                                        todaySessions={stats.tokenStats.todaySessions || 0}
                                        t={t}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Stats & Credits */}

                    {/* Left: Basic Stats (Compact) */}
                    <div className="space-y-4">
                        {/* Boards Card */}
                        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-2xl border border-slate-200/50 dark:border-white/5 transition-all group duration-300 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                    <Database size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-0.5">{stats.totalBoards}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.stats?.totalBoards || "Boards"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cards Card */}
                        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-2xl border border-slate-200/50 dark:border-white/5 transition-all group duration-300 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-fuchsia-500/10 rounded-lg text-fuchsia-500 dark:text-fuchsia-400 group-hover:scale-110 transition-transform">
                                    <Layers size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-0.5">{stats.totalCards}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.stats?.totalCards || "Cards"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: AI Energy (Compact & Premium) */}
                    <div className="md:col-span-1 lg:col-span-2">
                        <div className="h-full p-5 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-white/[0.08] dark:to-white/[0.02] rounded-[24px] text-white shadow-lg relative overflow-hidden group border border-slate-800 dark:border-white/10">

                            {/* Animated Background Mesh (Subtle) */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/3 group-hover:bg-indigo-500/30 transition-colors duration-700 pointer-events-none"></div>

                            <div className="flex flex-col h-full relative z-10 justify-between">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 mb-2 opacity-90">
                                        <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                                            <Zap size={16} className="text-yellow-300" fill="currentColor" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-wider opacity-60 block">{t.stats?.aiCredits || "Neural Energy"}</span>
                                            <span className="text-sm font-medium text-white/90">{t.stats?.cardsSubtitle || "Creative Power"}</span>
                                        </div>
                                    </div>

                                    {/* Action Button (Optional placeholder) */}
                                    {/* <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                                        <CreditCard size={14} />
                                    </button> */}
                                </div>

                                <div className="mt-4">
                                    {user ? (
                                        stats.loadingCredits ? (
                                            <div className="animate-pulse space-y-2">
                                                <div className="h-8 w-24 bg-white/20 rounded-lg"></div>
                                                <div className="h-1.5 w-full bg-white/10 rounded-full"></div>
                                            </div>
                                        ) : stats.credits ? (
                                            <div className="space-y-4">
                                                <div className="flex items-baseline justify-between">
                                                    <div className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                                                        {stats.credits.credits?.toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                                        {Math.round((stats.credits.credits / stats.credits.initialCredits) * 100)}% Left
                                                    </div>
                                                </div>

                                                {/* Modern Progress Bar */}
                                                <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden backdrop-blur-sm ring-1 ring-white/10">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-yellow-300 to-amber-500 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.3)] transition-all duration-1000 ease-out"
                                                        style={{ width: `${Math.min(100, (stats.credits.credits / stats.credits.initialCredits) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-white/50 bg-white/5 p-2 rounded-lg">Unable to sync</div>
                                        )
                                    ) : (
                                        <div className="text-xs font-medium text-center py-2 bg-white/10 rounded-xl cursor-default">
                                            {t.stats?.signIn || "Sign In"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-8 pb-6 flex justify-center opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full">
                        <Clock size={12} />
                        {t.stats?.lastActive}: {stats.lastActive || "Just now"}
                    </div>
                </div>

            </div>
        </div>
    );
}
