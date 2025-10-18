import React, { useEffect, useState } from 'react';
import { BarChart3, X, Database, CreditCard, Clock, Layers, Zap } from 'lucide-react';
import { checkCredits } from '../services/systemCredits/systemCreditsService';
import { useLanguage } from '../contexts/LanguageContext';

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
        loadingCredits: false
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

        setStats(prev => ({
            ...prev,
            totalBoards: boardsList.length,
            activeBoards: active,
            trashBoards: trash,
            totalCards: totalCards,
            lastActive: lastActive
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

    // Calculate "Global Tokens" / Energy Used
    // Heuristic: Initial - Remaining. If undefined, show 0.
    const energyUsed = stats.credits
        ? (stats.credits.initialCredits || 0) - (stats.credits.credits || 0)
        : 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center font-sans p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 transform transition-all scale-100 animate-scale-in">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                            <BarChart3 size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.stats?.title || "Your Creative Journey"}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* General Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                            <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 mb-3">
                                <Database size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider opacity-80">{t.stats?.totalBoards || "Creative Universe"}</span>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                                {stats.totalBoards}
                            </div>
                            <div className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-2">
                                <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                                    {stats.activeBoards} {t.stats?.activeBoards || "Active"}
                                </span>
                                <span>•</span>
                                <span>{stats.trashBoards} {t.stats?.trashBoards || "Archived"}</span>
                            </div>
                        </div>

                        <div className="p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                            <div className="flex items-center gap-2 text-purple-500 dark:text-purple-400 mb-3">
                                <Layers size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider opacity-80">{t.stats?.totalCards || "Thoughts Captured"}</span>
                            </div>
                            <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                                {stats.totalCards}
                            </div>
                            <div className="text-xs font-medium text-slate-400 mt-2">
                                {t.stats?.cardsSubtitle || "Across your entire canvas"}
                            </div>
                        </div>
                    </div>

                    {/* AI Credits / Energy */}
                    <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-indigo-600 dark:to-purple-700 rounded-3xl text-white shadow-xl shadow-slate-900/10 dark:shadow-indigo-500/20 relative overflow-hidden group">

                        {/* Background Effect */}
                        <div className="absolute top-0 right-0 p-8 opacity-5 transform group-hover:scale-110 transition-transform duration-700">
                            <Zap size={120} />
                        </div>

                        <div className="flex flex-col h-full relative z-10">
                            <div className="flex items-center gap-2 mb-6 opacity-90">
                                <Zap size={18} className="text-yellow-400" fill="currentColor" />
                                <span className="text-sm font-bold uppercase tracking-wider">{t.stats?.aiCredits || "Neural Energy"}</span>
                            </div>

                            {user ? (
                                stats.loadingCredits ? (
                                    <div className="animate-pulse flex flex-col gap-2">
                                        <div className="h-8 w-32 bg-white/20 rounded-lg"></div>
                                        <div className="h-4 w-48 bg-white/10 rounded-lg"></div>
                                    </div>
                                ) : stats.credits ? (
                                    <div className="space-y-6">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className="text-4xl font-black tracking-tight flex items-baseline gap-2">
                                                    {stats.credits.credits?.toLocaleString()}
                                                    <span className="text-sm font-medium opacity-50 uppercase tracking-widest translate-y-[-4px]">{t.stats?.creditsRemaining || "Left"}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold opacity-90">{energyUsed.toLocaleString()}</div>
                                                <div className="text-[10px] uppercase tracking-wider opacity-60 font-bold">{t.stats?.globalTokens || "Context Processed"}</div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="relative pt-2">
                                            <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden backdrop-blur-sm">
                                                <div
                                                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                                                    style={{ width: `${Math.min(100, (stats.credits.credits / stats.credits.initialCredits) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-2 text-[10px] font-medium opacity-60 uppercase tracking-wider">
                                                <span>{t.stats?.creditsUsed || "Used"}: {Math.round(100 - (stats.credits.credits / stats.credits.initialCredits) * 100)}%</span>
                                                <span>Capacity: {stats.credits.initialCredits?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm py-4 text-center bg-white/5 rounded-xl border border-white/10">
                                        Unable to sync neural state.
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-6">
                                    <p className="font-medium text-white/90 mb-2">{t.stats?.signIn || "Sign in to view your neural stats"}</p>
                                    <div className="h-1 w-12 bg-white/20 mx-auto rounded-full"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Last Active */}
                    <div className="flex items-center gap-4 px-2 opacity-60 hover:opacity-100 transition-opacity">
                        <Clock size={14} />
                        <span className="text-xs font-medium uppercase tracking-wider">
                            {t.stats?.lastActive || "Last Brainstorm"}: <span className="font-bold text-slate-800 dark:text-white ml-1">{stats.lastActive || (t.stats?.never || "Not yet")}</span>
                        </span>
                    </div>

                </div>
            </div>
        </div>
    );
}
