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

    // Get active config to check for custom API key
    const activeConfig = useStore(state => state.getActiveConfig());
    const hasCustomKey = activeConfig?.apiKey && activeConfig.apiKey.length > 0;

    const refreshCredentials = () => {
        if (!user || hasCustomKey) return; // Don't fetch if custom key active
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
        // ... (existing stats logic)
    }, [boardsList, user]);

    // ...

    <div className="">
        {user ? (
            /* 1. Check Custom API Key First */
            hasCustomKey ? (
                <div className="space-y-4">
                    <div className="flex items-end gap-2">
                        <div className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                            ∞
                        </div>
                        <div className="text-sm font-bold text-white/60 mb-1.5">{t.stats?.unlimited || "Unlimited"}</div>
                    </div>
                    <div className="px-3 py-2 bg-white/10 rounded-lg border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            Custom Key Active
                        </div>
                    </div>
                </div>
            ) :
                /* 2. Loading State */
                stats.loadingCredits ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-8 w-1/2 bg-white/20 rounded-lg"></div>
                        <div className="h-2 w-full bg-white/10 rounded-full"></div>
                    </div>
                ) :
                    /* 3. Credits State */
                    stats.credits ? (
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
                        /* 4. Fallback (Error/Unknown) */
                        <div className="text-sm text-white/50 bg-white/5 p-4 rounded-xl border border-white/5">
                            {t.stats?.syncUnknown || "Sync status unknown"}. <br />
                            <span className="text-xs opacity-70">{t.stats?.clickToRefresh || "Click refresh to check quota."}</span>
                        </div>
                    )
        ) : (
            /* 5. Guest Mode */
            <div className="flex flex-col items-center justify-center py-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <span className="text-sm font-medium text-white/60 mb-2">{t.stats?.guestMode || "Guest Mode"}</span>
                <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold">{t.stats?.localStorageOnly || "Local Storage Only"}</div>
            </div>
        )}
    </div>
                        </div >
                    </div >
                </div >

            </div >

        {/* Last Active Footer */ }
        < div className = "mt-8 flex justify-center opacity-40 hover:opacity-100 transition-opacity" >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Clock size={12} />
                {t.stats?.lastSnapshot || "Last Snapshot"}: {stats.lastActive || (t.stats?.today || "Just now")}
            </div>
            </div >
        </div >
    );
}
