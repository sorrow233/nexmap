import React, { useEffect, useState } from 'react';
import { BarChart3, Database, Layers, Zap, Activity, Clock, Cpu, Flame, Sun, Sunset, Moon, CloudMoon, LayoutGrid, StickyNote } from 'lucide-react';
import { checkCredits } from '../services/systemCredits/systemCreditsService';
import { useLanguage } from '../contexts/LanguageContext';
import { userStatsService } from '../services/stats/userStatsService';
import ActivityChart from './stats/ActivityChart';
import { useStore } from '../store/useStore';
import AchievementModal from '../components/AchievementModal';
import { getPlanetTexture, usePlanetTiers } from '../utils/planetDefinitions';


export default function StatisticsView({ boardsList, user }) {
    const { t } = useLanguage();

    const [showAchievements, setShowAchievements] = useState(false);

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


    // ... inside the component

    // DEV MODE: Manual Tier Override for Testing
    const [devTierIndex, setDevTierIndex] = useState(null); // null = use real data, number = forced index

    // Planetary Logic (Lifted State & Localized)
    const totalTokens = stats.tokenStats.totalChars;
    const tiers = usePlanetTiers(t);

    // Use override if set, otherwise calculate from tokens
    const calculatedTierIndex = tiers.findIndex(t => totalTokens < t.limit);
    const currentTierIndex = devTierIndex !== null ? devTierIndex : (calculatedTierIndex === -1 ? tiers.length - 1 : calculatedTierIndex);
    const currentTier = tiers[currentTierIndex] || tiers[tiers.length - 1];

    // DEV MODE: Navigation handlers
    const handlePrevTier = () => {
        setDevTierIndex(prev => {
            const current = prev !== null ? prev : currentTierIndex;
            return Math.max(0, current - 1);
        });
    };
    const handleNextTier = () => {
        setDevTierIndex(prev => {
            const current = prev !== null ? prev : currentTierIndex;
            return Math.min(tiers.length - 1, current + 1);
        });
    };

    // Progress for Ring
    const prevLimit = currentTierIndex > 0 ? tiers[currentTierIndex - 1].limit : 0;
    const nextLimit = currentTier.limit;
    const progress = Math.min(100, Math.max(0, ((totalTokens - prevLimit) / (nextLimit - prevLimit)) * 100));
    const radius = 185;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Get texture for current tier (Using imported utility)
    const texture = getPlanetTexture(currentTier.id || currentTier.name);

    return (
        <div className="w-full relative min-h-screen text-slate-600 dark:text-slate-300 overflow-hidden font-sans">
            {/* Soft Pastel Background */}
            <div className="absolute inset-0 bg-[#f8fafc] dark:bg-slate-900 -z-20"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-indigo-100/40 dark:bg-indigo-900/20 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-normal"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-blue-100/40 dark:bg-blue-900/20 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-normal"></div>
            <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] rounded-full bg-pink-100/40 dark:bg-purple-900/20 blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-normal"></div>

            {/* Content Container */}
            <div className="relative z-10 p-6 sm:p-10 max-w-7xl mx-auto flex flex-col gap-12">

                {/* Header - Clean & Minimal */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.displayName || 'Creator'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            Here's your creative brain activity today.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-[8px_8px_16px_#e2e8f0,-8px_-8px_16px_#ffffff] dark:shadow-[4px_4px_12px_rgba(0,0,0,0.4)] flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer group">
                            <Database size={20} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-[8px_8px_16px_#e2e8f0,-8px_-8px_16px_#ffffff] dark:shadow-[4px_4px_12px_rgba(0,0,0,0.4)] flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer group">
                            <Layers size={20} className="group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                </div>

                {/* Main "Neural Core" Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                    {/* Left Column: Quick Stats */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Streak Card */}
                        <div className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] dark:shadow-[8px_8px_24px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Flame size={64} className="text-orange-400" />
                            </div>
                            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">{t.stats?.currentStreak || "STREAK"}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-black text-slate-800 dark:text-white">{stats.tokenStats.streakDays}</span>
                                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">Days</span>
                            </div>
                            {/* Mini Sparkline */}
                            <div className="h-12 mt-4 flex items-end gap-1 opacity-50">
                                {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                                    <div key={i} className="flex-1 bg-orange-300 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                        </div>

                        {/* Efficiency/Pulse Card */}
                        <div className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] dark:shadow-[8px_8px_24px_rgba(0,0,0,0.4)] flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-500 flex items-center justify-center shadow-inner">
                                <Activity size={24} />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{t.stats?.sessions || "SESSIONS"}</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.tokenStats.totalSessions || stats.tokenStats.todaySessions}</span>
                            </div>
                        </div>

                        {/* Canvas Count Card */}
                        <div className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] dark:shadow-[8px_8px_24px_rgba(0,0,0,0.4)] flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/50 text-blue-500 flex items-center justify-center shadow-inner">
                                <LayoutGrid size={24} />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{t.stats?.canvas || "CANVAS"}</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalBoards}</span>
                            </div>
                        </div>

                        {/* Cards Count Card */}
                        <div className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] dark:shadow-[8px_8px_24px_rgba(0,0,0,0.4)] flex items-center gap-4 group hover:scale-[1.02] transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/50 text-purple-500 flex items-center justify-center shadow-inner">
                                <StickyNote size={24} />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{t.stats?.cards || "CARDS"}</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalCards}</span>
                            </div>
                        </div>
                    </div>

                    {/* Center: Planetary System (Token Evolution) */}
                    <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[500px]">

                        {/* Orbital Rings Background - Animated */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-visible">
                            {/* Ring 1 - Slow Clockwise */}
                            <div className="w-[550px] h-[300px] border border-slate-300/40 dark:border-slate-600/30 rounded-[100%] absolute animate-[spin_60s_linear_infinite]"></div>
                            {/* Ring 2 - Slow Counter-Clockwise */}
                            <div className="w-[550px] h-[300px] border border-slate-300/40 dark:border-slate-600/30 rounded-[100%] absolute animate-[spin_80s_linear_infinite_reverse]"></div>
                            {/* Ring 3 - Tilted & Slower */}
                            <div className="w-[600px] h-[350px] border border-slate-200/30 dark:border-slate-700/20 rounded-[100%] absolute animate-[spin_100s_linear_infinite] delay-1000"></div>
                        </div>

                        {/* Planet Container */}
                        <div
                            onClick={() => setShowAchievements(true)}
                            className="relative w-96 h-96 group cursor-pointer flex items-center justify-center transition-transform active:scale-95 aspect-square"
                        >

                            {/* Progress Ring SVG */}
                            <div className="absolute inset-0 -m-6">
                                <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 400 400">
                                    {/* Track */}
                                    <circle cx="200" cy="200" r={radius} stroke="#f1f5f9" className="dark:stroke-slate-700" strokeWidth="4" fill="none" />
                                    {/* Progress */}
                                    <circle
                                        cx="200" cy="200" r={radius}
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        className={`transition-all duration-1000 ease-out text-${currentTier.color}-400 drop-shadow-md`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>

                            {/* The Planet (Ethereal 3D) */}
                            <div className="relative w-full h-full aspect-square group transition-transform duration-700 ease-out hover:scale-105 z-10 flex items-center justify-center perspective-[1000px]">

                                {/* Texture Layer */}
                                <div className="absolute inset-0 rounded-full">
                                    {/* Planet Surface (Clipped for clean edges + Glow) */}
                                    <div className={`
                                        absolute inset-0 rounded-full overflow-hidden
                                        transition-all duration-1000 ease-in-out
                                        ${texture.shadow}
                                    `}
                                        style={{ background: texture.background }}
                                    >
                                        {/* Noise/Overlay */}
                                        {texture.overlay && <div className={`absolute inset-0 ${texture.overlay}`}></div>}
                                        {/* Ethereal Details */}
                                        {texture.detail}
                                    </div>

                                    {/* Saturn Ring Special Case (Unclipped) */}
                                    {(currentTier.id === 'saturn' || currentTier.name === 'Saturn') && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220%] h-[50%] border-[24px] border-[#fde047]/30 rounded-[100%] rotate-[-12deg] shadow-xl pointer-events-none mix-blend-plus-lighter blur-[1px]"></div>
                                    )}
                                </div>

                                {/* Data Content inside Planet */}
                                <div className="text-center relative z-20 text-white drop-shadow-md transform translate-z-10">
                                    <span className="block text-xs font-bold opacity-80 uppercase tracking-widest mb-1">
                                        {currentTier.name} Phase
                                    </span>
                                    <span className="block text-4xl font-black tracking-tighter">
                                        {fmt(totalTokens)}
                                    </span>
                                    <span className="block text-[10px] font-bold opacity-60 mt-1 uppercase tracking-wider">
                                        Total Tokens
                                    </span>
                                </div>
                            </div>


                            {/* Planet Name Label */}
                            <div className="absolute -bottom-12 flex items-center justify-center z-40">
                                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-slate-200/50 dark:border-slate-700/50 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <span className={`text-${currentTier.color}-500`}>{currentTier.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Base Pedestal reflection */}
                        <div className={`w-40 h-10 rounded-[100%] blur-2xl mt-[-50px] opacity-40 bg-${currentTier.color}-400 transition-colors duration-1000`}></div>
                    </div>

                    {/* Right Column: Quota & Peak */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Token/Quota Card */}
                        <div className="p-6 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] dark:shadow-[8px_8px_24px_rgba(0,0,0,0.4)] hover:scale-[1.02] transition-transform duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.stats?.aiQuota || "AI QUOTA"}</span>
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-500">
                                    <Zap size={18} fill="currentColor" />
                                </div>
                            </div>
                            <h3 className="text-4xl font-black text-slate-800 dark:text-white mb-2">
                                {Math.min(100, Math.round(((stats.credits?.credits || 0) / (stats.credits?.initialCredits || 1)) * 100))}%
                            </h3>
                            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-300 to-emerald-400 rounded-full"
                                    style={{ width: `${Math.min(100, ((stats.credits?.credits || 0) / (stats.credits?.initialCredits || 1)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Peak Time - Circular Dial */}
                        <div className="p-6 rounded-[2.5rem] bg-indigo-500 dark:bg-indigo-600 text-white shadow-[20px_20px_60px_#cbd5e1,-20px_-20px_60px_#ffffff] dark:shadow-[8px_8px_24px_rgba(0,0,0,0.4)] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
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
                                    <span className="text-xs text-indigo-200">{t.stats?.mostActiveTime || "Most active time"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Activity Chart (Soft dashboard) */}
                <div className="w-full p-8 rounded-[3rem] bg-white dark:bg-slate-800 shadow-[20px_20px_60px_#d1d5db,-20px_-20px_60px_#ffffff] dark:shadow-[8px_8px_24px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.stats?.activityFlow || "Activity Flow"}</h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500">{t.stats?.activityFlowDesc || "Your creative output over time"}</p>
                        </div>

                        {/* Soft Switch */}
                        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-700 rounded-2xl shadow-inner">
                            {['week', 'month', 'year'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setChartViewMode(mode)}
                                    className={`
                                        px-6 py-2 text-xs font-bold rounded-xl transition-all duration-300 uppercase tracking-wider
                                        ${chartViewMode === mode
                                            ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-md'
                                            : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
                                    `}
                                >
                                    {mode === 'week' ? t.stats?.weeklyTrend || 'WEEK' : mode === 'month' ? t.stats?.month || 'MONTH' : t.stats?.year || 'YEAR'}
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

            {/* Achievement Modal */}
            <AchievementModal
                isOpen={showAchievements}
                onClose={() => setShowAchievements(false)}
                currentTierName={currentTier.name}
                currentTotal={totalTokens}
                tiers={tiers}
                t={t}
            />
        </div>
    );
}
