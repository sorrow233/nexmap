import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Gift, Zap, Infinity, Image, Ticket, Lock, Loader2, Crown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { isLikelyChinaUser } from '../../utils/regionCheck';
import { redeemCode } from '../../services/redeemService';
import PaymentModal from '../PaymentModal';
import AdminCodePanel from '../AdminCodePanel';
import ProBadge from '../ProBadge';

/**
 * SettingsCreditsTab
 * 
 * A tab in Settings modal showing free trial credits info.
 * Designed to be user-friendly without exposing API configuration details.
 */
export default function SettingsCreditsTab({ onOpenAdvanced }) {
    const systemCredits = useStore(state => state.systemCredits);
    const systemImageCredits = useStore(state => state.systemImageCredits);
    const systemTotalCredits = useStore(state => state.systemTotalCredits); // New Selector
    const isPro = useStore(state => state.isPro); // Pro Status
    const loadSystemCredits = useStore(state => state.loadSystemCredits);
    const setSystemCredits = useStore(state => state.setSystemCredits); // New Action
    const setSystemTotalCredits = useStore(state => state.setSystemTotalCredits); // New Action
    const setIsPro = useStore(state => state.setIsPro); // Update Pro status locally
    const { t } = useLanguage();
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isChinaUser, setIsChinaUser] = useState(false);

    // Redeem State
    const [redeemInput, setRedeemInput] = useState('');
    const [redeemStatus, setRedeemStatus] = useState('idle'); // idle, loading, success, error
    const [redeemMessage, setRedeemMessage] = useState('');

    // Admin State
    const [showAdmin, setShowAdmin] = useState(false);

    useEffect(() => {
        setIsChinaUser(isLikelyChinaUser());
    }, []);

    const handleRedeem = async () => {
        if (!redeemInput.trim()) return;

        setRedeemStatus('loading');
        setRedeemMessage('');

        try {
            const result = await redeemCode(redeemInput);
            setRedeemStatus('success');
            setRedeemMessage(result.message);

            // Handle Pro Upgrade
            if (result.isPro) {
                setIsPro(true);
            }

            // Optimistic Update
            if (result.addedCredits) {
                const current = typeof systemCredits === 'number' ? systemCredits : 0;
                setSystemCredits(current + result.addedCredits);
                // Also update the total cap
                setSystemTotalCredits((systemTotalCredits || 200) + result.addedCredits);
            }

            // Reload credits to show new balance/status
            loadSystemCredits();
            setRedeemInput('');
        } catch (error) {
            setRedeemStatus('error');
            setRedeemMessage(error.message);
        }
    };

    // Default to 200 if undefined (weekly conversation limit)
    const creditsValue = typeof systemCredits === 'number' ? systemCredits : 200;
    // Calculate percentage based on total available credits (limit + bonus)
    const totalCap = systemTotalCredits || 200;
    const creditsPercent = Math.max(0, Math.min(100, (creditsValue / totalCap) * 100));

    // Image credits: default to 20 if undefined (weekly image limit)
    const imageCreditsValue = typeof systemImageCredits === 'number' ? systemImageCredits : 20;
    const imageCreditsPercent = Math.max(0, Math.min(100, (imageCreditsValue / 20) * 100));

    return (
        <div className="space-y-6">
            {/* Main Welcome Card */}
            <div className={`relative overflow-hidden rounded-3xl text-white shadow-2xl p-8 group transition-all duration-500
                ${isPro ? 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600' : 'bg-gradient-to-br from-indigo-600 to-violet-700'}
            `}>
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/15 transition-colors duration-700"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-900/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                {isPro && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />}

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/30 relative">
                        {isPro ? (
                            <>
                                <Crown size={32} className="text-white drop-shadow-md" />
                                <div className="absolute -top-1 -right-1">
                                    <Sparkles size={16} className="text-yellow-200 animate-pulse" />
                                </div>
                            </>
                        ) : (
                            <CheckCircle2 size={32} className="text-white" />
                        )}
                    </div>

                    {isPro ? (
                        <>
                            <h2 className="text-3xl font-black mb-2 tracking-tight flex items-center gap-3">
                                <span className="drop-shadow-sm">PRO USER</span>
                                <ProBadge size="md" className="shadow-lg" />
                            </h2>
                            <p className="text-orange-100 text-lg max-w-md mx-auto mb-8 font-medium">
                                You have unlocked premium features. Enjoy standard priority and exclusive access.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold mb-4">{t.credits.noConfigNeeded}</h2>
                            <p className="text-indigo-100 text-lg max-w-md mx-auto mb-8 leading-relaxed">
                                {t.credits.readyToUse} <strong className="text-white border-b-2 border-white/30">{totalCap}</strong> {t.credits.conversations}
                            </p>
                        </>
                    )}

                    {/* Usage Stats */}
                    <div className="w-full max-w-sm space-y-4">
                        {/* Conversation Credits */}
                        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex justify-between items-end mb-2">
                                <span className={`${isPro ? 'text-orange-200' : 'text-indigo-200'} text-sm font-medium`}>{t.credits.remainingCredits}</span>
                                <span className="text-2xl font-bold font-mono">{creditsValue} <span className={`text-sm ${isPro ? 'text-orange-300' : 'text-indigo-300'}`}>/ {totalCap}</span></span>
                            </div>
                            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full relative ${isPro ? 'bg-gradient-to-r from-yellow-300 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'}`}
                                    style={{ width: `${creditsPercent}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/30 animate-pulse-slow"></div>
                                </div>
                            </div>
                        </div>

                        {/* Image Credits */}
                        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex justify-between items-end mb-2">
                                <span className={`${isPro ? 'text-orange-200' : 'text-indigo-200'} text-sm font-medium flex items-center gap-2`}>
                                    <Image size={14} />
                                    {t.credits.imageCredits || '图片生成'}
                                </span>
                                <span className="text-2xl font-bold font-mono">{imageCreditsValue}<span className={`text-sm ${isPro ? 'text-orange-300' : 'text-indigo-300'}`}>/20</span></span>
                            </div>
                            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-pink-400 to-orange-400 rounded-full relative"
                                    style={{ width: `${imageCreditsPercent}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/30 animate-pulse-slow"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Redeem Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Ticket size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">兑换码</h3>
                        <p className="text-xs text-slate-500">使用兑换码获取额外积分</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={redeemInput}
                        onChange={(e) => setRedeemInput(e.target.value)}
                        placeholder="请输入兑换码 (XXXX-XXXX-XXXX)"
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                    />
                    <button
                        onClick={handleRedeem}
                        disabled={redeemStatus === 'loading' || !redeemInput.trim()}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {redeemStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : '兑换'}
                    </button>
                </div>

                {/* Redeem Feedback */}
                {redeemMessage && (
                    <div className={`mt-3 text-sm p-3 rounded-xl flex items-center gap-2 ${redeemStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                        : 'bg-red-50 text-red-600 dark:bg-red-900/20'
                        }`}>
                        {redeemStatus === 'success' ? <CheckCircle2 size={16} /> : <Zap size={16} />}
                        {redeemMessage}
                    </div>
                )}
            </div>

            {/* Admin Toggle (Secret) */}
            <div className="flex justify-center">
                <button
                    onClick={() => setShowAdmin(!showAdmin)}
                    className="text-xs text-slate-300 dark:text-slate-700 hover:text-slate-400 transition-colors uppercase font-bold tracking-widest flex items-center gap-1"
                >
                    <Lock size={10} />
                    {showAdmin ? 'Hide Admin Tools' : 'Admin Area'}
                </button>
            </div>

            {showAdmin && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <AdminCodePanel />
                </div>
            )}

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

            {/* Info Box - HIDDEN FOR CHINA USERS */}
            {!isChinaUser && (
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
            )}

            {!isChinaUser && <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />}
        </div>
    );
}
