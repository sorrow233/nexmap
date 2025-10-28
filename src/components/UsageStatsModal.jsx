import React, { useEffect, useState } from 'react';
import { BarChart3, X, Database, CreditCard, Clock, Layers, Zap, Activity, Sparkles, TrendingUp } from 'lucide-react';
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
                <div className="p-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Left Column: Stats Cards */}
                    <div className="space-y-5">
                        {/* Boards & Cards Row */}
                        <div className="grid grid-cols-2 gap-5">
                            {/* Boards Card */}
                            <div className="p-5 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-3xl border border-slate-200/50 dark:border-white/5 transition-all group duration-300">
                                <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 mb-3 group-hover:scale-105 transition-transform origin-left">
                                    <Database size={18} />
                                </div>
                                <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                                    {stats.totalBoards}
                                </div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t.stats?.totalBoards || "Boards"}
                                </div>
                            </div>

                            {/* Cards Card */}
                            <div className="p-5 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-3xl border border-slate-200/50 dark:border-white/5 transition-all group duration-300">
                                <div className="flex items-center gap-2 text-fuchsia-500 dark:text-fuchsia-400 mb-3 group-hover:scale-105 transition-transform origin-left">
                                    <Layers size={18} />
                                </div>
                                <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                                    {stats.totalCards}
                                </div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {t.stats?.totalCards || "Cards"}
                                </div>
                            </div>
                        </div>

                        {/* Daily Activity Card - Enhanced */}
                        <div className="p-5 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100/80 dark:hover:bg-white/[0.04] rounded-3xl border border-slate-200/50 dark:border-white/5 transition-all relative overflow-hidden group">
                            {/* Decorative blurred blob */}
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-400/10 dark:bg-orange-400/20 blur-2xl rounded-full group-hover:bg-orange-400/20 transition-colors"></div>

                            <div className="relative z-10">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-orange-500">
                                        <div className="p-1.5 bg-orange-500/10 rounded-lg">
                                            <Activity size={16} />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.stats?.dailyActivity || "Daily Activity"}</span>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold flex items-center gap-1">
                                        <TrendingUp size={10} />
                                        Today
                                    </div>
                                </div>

                                {/* Today's Stats */}
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-lg font-bold text-orange-500/80 mr-1">+</span>
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {fmt(stats.tokenStats.todayChars)}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Chars</span>
                                </div>

                                {/* Activity Chart Component */}
                                <ActivityChart
                                    weeklyHistory={stats.tokenStats.weeklyHistory || []}
                                    timeDistribution={stats.tokenStats.timeDistribution || { morning: 0, afternoon: 0, evening: 0, night: 0 }}
                                    streakDays={stats.tokenStats.streakDays || 0}
                                    todaySessions={stats.tokenStats.todaySessions || 0}
                                    t={t}
                                />

                                {/* Footer stats */}
                                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    <div>Yesterday: <span className="text-slate-700 dark:text-slate-300">{fmt(stats.tokenStats.yesterdayChars)}</span></div>
                                    <div>{t.stats?.globalChars || 'Total'}: <span className="text-slate-700 dark:text-slate-300">{fmt(stats.tokenStats.totalChars)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: AI Energy */}
                    <div className="flex flex-col gap-5">
                        <div className="flex-1 p-7 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 dark:from-violet-600 dark:via-indigo-600 dark:to-purple-700 rounded-[30px] text-white shadow-xl shadow-indigo-500/25 relative overflow-hidden group">

                            {/* Animated Background Mesh */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/3 group-hover:scale-110 transition-transform duration-1000 ease-out pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500/20 blur-[50px] rounded-full -translate-x-1/3 translate-y-1/3 group-hover:scale-110 transition-transform duration-1000 ease-out pointer-events-none"></div>

                            {/* Icon overlay */}
                            <div className="absolute top-6 right-6 p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                                <Sparkles size={24} className="text-yellow-300" />
                            </div>

                            <div className="flex flex-col h-full relative z-10 justify-between min-h-[220px]">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 opacity-90">
                                        <Zap size={18} className="text-yellow-300" fill="currentColor" />
                                        <span className="text-sm font-bold uppercase tracking-wider opacity-80">{t.stats?.aiCredits || "Neural Energy"}</span>
                                    </div>
                                    <h3 className="text-lg font-medium text-white/80 leading-relaxed max-w-[80%]">
                                        {t.stats?.cardsSubtitle || "Powering your creative engine"}
                                    </h3>
                                </div>

                                {user ? (
                                    stats.loadingCredits ? (
                                        <div className="animate-pulse space-y-3">
                                            <div className="h-10 w-32 bg-white/20 rounded-xl"></div>
                                            <div className="h-2 w-full bg-white/10 rounded-full"></div>
                                        </div>
                                    ) : stats.credits ? (
                                        <div className="space-y-6">
                                            <div>
                                                <div className="text-5xl font-black tracking-tighter flex items-baseline gap-2 text-white drop-shadow-sm">
                                                    {stats.credits.credits?.toLocaleString()}
                                                </div>
                                                <div className="text-sm font-medium text-indigo-100 mt-1">
                                                    {t.stats?.creditsRemaining || "Remaining available credits"}
                                                </div>
                                            </div>

                                            {/* Modern Progress Bar */}
                                            <div className="space-y-2">
                                                <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/5 ring-1 ring-white/10">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full shadow-[0_0_15px_rgba(253,224,71,0.5)] transition-all duration-1000 ease-out"
                                                        style={{ width: `${Math.min(100, (stats.credits.credits / stats.credits.initialCredits) * 100)}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/60">
                                                    <span>Used: {Math.round(100 - (stats.credits.credits / stats.credits.initialCredits) * 100)}%</span>
                                                    <span>Max: {stats.credits.initialCredits?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md text-sm">
                                            Unable to sync credits.
                                        </div>
                                    )
                                ) : (
                                    <div className="p-6 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md text-center">
                                        <p className="font-semibold">{t.stats?.signIn || "Sign In"}</p>
                                        <p className="text-xs opacity-70 mt-1">View your energy stats</p>
                                    </div>
                                )}
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
