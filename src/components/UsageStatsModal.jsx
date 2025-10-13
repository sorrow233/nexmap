import React, { useEffect, useState } from 'react';
import { BarChart3, X, Database, CreditCard, Clock, Layers } from 'lucide-react';
import { checkCredits } from '../services/systemCredits/systemCreditsService';
import { useLanguage } from '../contexts/LanguageContext';

export default function UsageStatsModal({ isOpen, onClose, boardsList, user }) {
    if (!isOpen) return null;

    const [stats, setStats] = useState({
        totalBoards: 0,
        activeBoards: 0,
        trashBoards: 0,
        totalCards: 0,
        lastActive: null,
        credits: null,
        loadingCredits: false
    });

    const { t } = useLanguage();

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

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center font-sans p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 transform transition-all scale-100 animate-scale-in">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                            <BarChart3 size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Usage Statistics</h2>
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
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                                <Database size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Total Boards</span>
                            </div>
                            <div className="text-2xl font-black text-slate-800 dark:text-white">
                                {stats.totalBoards}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {stats.activeBoards} Active / {stats.trashBoards} Trash
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                                <Layers size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Total Cards</span>
                            </div>
                            <div className="text-2xl font-black text-slate-800 dark:text-white">
                                {stats.totalCards}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                Across all boards
                            </div>
                        </div>
                    </div>

                    {/* AI Credits */}
                    <div className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <CreditCard size={64} />
                        </div>

                        <div className="flex items-center gap-2 mb-3 opacity-80">
                            <CreditCard size={18} />
                            <span className="text-sm font-bold uppercase tracking-wider">AI System Credits</span>
                        </div>

                        {user ? (
                            stats.loadingCredits ? (
                                <div className="animate-pulse h-8 w-24 bg-white/20 rounded"></div>
                            ) : stats.credits ? (
                                <div>
                                    <div className="text-3xl font-black mb-1">
                                        {stats.credits.credits?.toLocaleString()} <span className="text-lg font-medium opacity-70">/ {stats.credits.initialCredits?.toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs opacity-70">
                                        Free credits replenish periodically.
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="mt-4 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white/90 rounded-full"
                                            style={{ width: `${Math.min(100, (stats.credits.credits / stats.credits.initialCredits) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm opacity-90">
                                    Unable to load credits info.
                                </div>
                            )
                        ) : (
                            <div className="text-sm opacity-90">
                                Sign in to view and use your free AI credits.
                            </div>
                        )}
                    </div>

                    {/* Last Active */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <Clock size={18} />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Active</div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {stats.lastActive || 'Never'}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
