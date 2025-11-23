import React, { useEffect, useState } from 'react';
import { BarChart3, Database, Layers, Zap, Activity, Clock, Cpu, Flame, Sun, Sunset, Moon, CloudMoon } from 'lucide-react';
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

        const maxPeriod = periods.reduce((prev, current) => (prev.value > current.value ? prev : current));
        return maxPeriod;
    }, [timeDistribution, t]);

    return (
        <div className="w-full relative min-h-screen text-slate-600 overflow-hidden font-sans">
            {/* Soft Pastel Background */}
            <div className="absolute inset-0 bg-[#f8fafc] -z-20"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none mix-blend-multiply"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none mix-blend-multiply"></div>
            <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] rounded-full bg-pink-100/40 blur-[100px] pointer-events-none mix-blend-multiply"></div>

            {/* Content Container */}
            <div className="relative z-10 p-6 sm:p-10 max-w-7xl mx-auto flex flex-col gap-12">

                {/* Header - Clean & Minimal */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.displayName || 'Creator'}
                        </h2>
                        <p className="text-slate-500 font-medium mt-1">
                            Here's your creative brain activity today.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-[8px_8px_16px_#e2e8f0,-8px_-8px_16px_#ffffff] flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer group">
                            <Database size={20} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-[8px_8px_16px_#e2e8f0,-8px_-8px_16px_#ffffff] flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer group">
                            <Layers size={20} className="group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                </div>

                {/* Main "Neural Core" Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                    {/* Left Column: Quick Stats */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Streak Card */}
                        <div className="p-6 rounded-[2.5rem] bg-white shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Flame size={64} className="text-orange-400" />
                            </div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-2">{t.stats?.currentStreak || "STREAK"}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-black text-slate-800">{stats.tokenStats.streakDays}</span>
                                <span className="text-sm font-bold text-slate-400">Days</span>
                            </div>
                            {/* Mini Sparkline */}
                            <div className="h-12 mt-4 flex items-end gap-1 opacity-50">
                                {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                                    <div key={i} className="flex-1 bg-orange-300 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                        </div>

                        {/* Efficiency/Pulse Card */}
                        <div className="p-6 rounded-[2.5rem] bg-white shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-inner">
                                <Activity size={24} />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">{t.stats?.sessions || "SESSIONS"}</span>
                                <span className="text-2xl font-black text-slate-800">{stats.tokenStats.todaySessions}</span>
                            </div>
                        </div>
                    </div>

                    {/* Center: The Neural Core (3D Brain Representation) */}
                    <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[400px]">
                        {/* Orbital Rings */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[500px] h-[300px] border border-slate-200 rounded-[100%] absolute rotate-[15deg] opacity-60"></div>
                            <div className="w-[500px] h-[300px] border border-slate-200 rounded-[100%] absolute -rotate-[15deg] opacity-60"></div>
                        </div>

                        {/* 3D Sphere (CSS only) */}
                        <div className="relative w-64 h-64 group cursor-pointer perspective-1000">
                            {/* Glow behind */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-300 to-purple-300 blur-3xl opacity-40 animate-pulse-slow"></div>

                            {/* The Sphere */}
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-100 via-white to-purple-100 shadow-[inset_-20px_-20px_60px_rgba(0,0,0,0.1),_inset_20px_20px_60px_rgba(255,255,255,1),_20px_20px_60px_rgba(0,0,0,0.1)] flex items-center justify-center relative z-10 transition-transform duration-700 hover:scale-105">
                                {/* Surface Texture details */}
                                <div className="absolute inset-0 rounded-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjY2NjIi8+PC9zdmc+')] mix-blend-overlay"></div>

                                <div className="text-center transform translate-z-10">
                                    <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">{t.stats?.creativePower || "TOTAL TOKENS"}</span>
                                    <span className="block text-5xl sm:text-6xl font-black text-slate-800 tracking-tighter">
                                        {fmt(stats.tokenStats.totalChars)}
                                    </span>
                                </div>
                            </div>

                            {/* Floating Particles */}
                            <div className="absolute top-0 right-10 w-8 h-8 rounded-full bg-blue-200 shadow-lg animate-float-slow"></div>
                            <div className="absolute bottom-10 left-0 w-6 h-6 rounded-full bg-pink-200 shadow-lg animate-float-slow delay-700"></div>
                            <div className="absolute top-1/2 -right-10 w-4 h-4 rounded-full bg-indigo-300 shadow-md animate-float-slow delay-300"></div>
                        </div>

                        {/* Base Pedestal */}
                        <div className="w-48 h-12 bg-gradient-to-b from-slate-100 to-transparent rounded-[100%] blur-md mt-[-20px] opacity-50"></div>
                    </div>

                    {/* Right Column: Quota & Peak */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Token/Quota Card */}
                        <div className="p-6 rounded-[2.5rem] bg-white shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] hover:scale-[1.02] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.stats?.aiQuota || "AI QUOTA"}</span>
                                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-500">
                                    <Zap size={18} fill="currentColor" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-slate-800 mb-2">
                                {Math.min(100, Math.round(((stats.credits?.credits || 0) / (stats.credits?.initialCredits || 1)) * 100))}%
                            </h3>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-300 to-emerald-400 rounded-full"
                                    style={{ width: `${Math.min(100, ((stats.credits?.credits || 0) / (stats.credits?.initialCredits || 1)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Peak Time - Circular Dial */}
                        <div className="p-6 rounded-[2.5rem] bg-indigo-500 text-white shadow-[20px_20px_60px_#cbd5e1,-20px_-20px_60px_#ffffff] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>

                            <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest block mb-4">{t.stats?.activeTime || "PEAK PERFORMANCE"}</span>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full border-2 border-indigo-300 flex items-center justify-center">
                                    {mostActive ? <mostActive.icon size={20} /> : <Clock size={20} />}
                                </div>
                                <div>
                                    <span className="text-2xl font-black block leading-none">
                                        {mostActive ? mostActive.label : "--"}
                                    </span>
                                    <span className="text-xs text-indigo-200">Most active time</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Activity Chart (Soft dashboard) */}
                <div className="w-full p-8 rounded-[3rem] bg-white shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Activity Flow</h3>
                            <p className="text-sm text-slate-400">Your creative output over time</p>
                        </div>

                        {/* Soft Switch */}
                        <div className="flex p-1.5 bg-slate-100 rounded-2xl shadow-inner">
                            {['week', 'month', 'year'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setChartViewMode(mode)}
                                    className={`
                                        px-6 py-2 text-xs font-bold rounded-xl transition-all duration-300 uppercase tracking-wider
                                        ${chartViewMode === mode
                                            ? 'bg-white text-slate-800 shadow-md'
                                            : 'text-slate-400 hover:text-slate-600'}
                                    `}
                                >
                                    {mode === 'week' ? t.stats?.weeklyTrend || 'WEEK' : mode === 'month' ? 'MONTH' : 'YEAR'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[280px]">
                        <ActivityChart
                            data={getChartData()}
                            viewMode={chartViewMode}
                            timeDistribution={stats.tokenStats.timeDistribution || { morning: 0, afternoon: 0, evening: 0, night: 0 }}
                            t={t}
                            language={useLanguage().language}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
