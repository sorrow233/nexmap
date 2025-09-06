import React from 'react';
import { Sparkles, CheckCircle2, Gift, Zap, Infinity } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';

import PaymentModal from '../PaymentModal';

/**
 * SettingsCreditsTab
 * 
 * A tab in Settings modal showing free trial credits info.
 * Designed to be user-friendly without exposing API configuration details.
 */
export default function SettingsCreditsTab({ onOpenAdvanced }) {
    const systemCredits = useStore(state => state.systemCredits);
    const { t } = useLanguage();
    const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);

    // Default to 100 if undefined, clamp between 0 and 100
    const creditsValue = typeof systemCredits === 'number' ? systemCredits : 100;
    const creditsPercent = Math.max(0, Math.min(100, creditsValue));

    // Calculate usage status
    const isLow = creditsValue < 20;

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Main Welcome Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl p-8 group">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/15 transition-colors duration-700"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-900/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/30">
                        <CheckCircle2 size={32} className="text-white" />
                    </div>

                    <h2 className="text-3xl font-bold mb-4">{t.credits.noConfigNeeded}</h2>
                    <p className="text-indigo-100 text-lg max-w-md mx-auto mb-8 leading-relaxed">
                        {t.credits.readyToUse} <strong className="text-white border-b-2 border-white/30">{t.credits.interactions}</strong> {t.credits.conversations}
                    </p>

                    {/* Usage Stats (Simplified) */}
                    <div className="w-full max-w-sm bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-indigo-200 text-sm font-medium">{t.credits.remainingCredits}</span>
                            <span className="text-2xl font-bold font-mono">{creditsValue.toFixed(1)}</span>
                        </div>
                        <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full relative"
                                style={{ width: `${creditsPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/30 animate-pulse-slow"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{t.credits.fastResponse}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.credits.fastResponseDesc}</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
                        <Infinity size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">{t.credits.longLasting}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.credits.longLastingDesc}</p>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="text-center space-y-4">
                <button
                    onClick={() => setIsPaymentOpen(true)}
                    className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-lg hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                >
                    <Gift size={20} />
                    {t.credits.getMore || "Get More Credits / Pro"}
                </button>

                <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
                    {t.credits.advancedNote} <span className="text-slate-600 dark:text-slate-300 font-bold cursor-pointer hover:underline" onClick={onOpenAdvanced}>{t.credits.advancedLink}</span> {t.credits.toConfig}
                </p>
            </div>

            <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
        </div>
    );
}
