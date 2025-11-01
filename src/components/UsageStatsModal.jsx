import React, { useEffect, useState } from 'react';
import { BarChart3, X, Database, CreditCard, Clock, Layers, Zap, Activity, Sparkles, TrendingUp } from 'lucide-react';
import { checkCredits } from '../services/systemCredits/systemCreditsService';
import { useLanguage } from '../contexts/LanguageContext';
import { userStatsService } from '../services/stats/userStatsService';
import ActivityChart from './stats/ActivityChart';

import { useStore } from '../store/useStore';

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

    // Get active config to check for custom API key
    const activeConfig = useStore(state => state.getActiveConfig());
    const hasCustomKey = activeConfig?.apiKey && activeConfig.apiKey.length > 0;

    useEffect(() => {
        if (!isOpen) return;

        // ... (existing stats logic) ...
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

        // Fetch Credits if user is logged in AND no custom key
        if (user && !hasCustomKey) {
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

    // ...

    {
        user ? (
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
                    <div className="text-xs text-white/50 bg-white/5 p-2 rounded-lg">{t.stats?.syncUnknown || "Status Unknown"}</div>
                )
        ) : (
            <div className="text-xs font-medium text-center py-2 bg-white/10 rounded-xl cursor-default">
                {t.stats?.signIn || "Sign In"}
            </div>
        )
    }
                                </div >
                            </div >
                        </div >
                    </div >

                </div >

        {/* Footer */ }
        < div className = "px-8 pb-6 flex justify-center opacity-60 hover:opacity-100 transition-opacity" >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full">
                <Clock size={12} />
                {t.stats?.lastActive}: {stats.lastActive || "Just now"}
            </div>
                </div >

            </div >
        </div >
    );
}
