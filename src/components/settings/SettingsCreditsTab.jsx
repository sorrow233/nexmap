import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, Gift, Zap, Infinity, Image, Ticket, Lock, Loader2, Crown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { isLikelyChinaUser } from '../../utils/regionCheck';
import { redeemCode } from '../../services/redeemService';
import PaymentModal from '../PaymentModal';
import AdminCodePanel from '../AdminCodePanel';
import ProBadge from '../ProBadge';
import CreditMeterCard from './CreditMeterCard';
import CreditBenefitCard from './CreditBenefitCard';

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
    const isAdmin = useStore(state => state.isAdmin); // Admin Status
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
    const imageCreditsCap = 20;
    const imageCreditsValue = typeof systemImageCredits === 'number' ? systemImageCredits : imageCreditsCap;
    const imageCreditsPercent = Math.max(0, Math.min(100, (imageCreditsValue / imageCreditsCap) * 100));

    const heroTheme = isPro
        ? {
            wrapper: 'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600',
            glowPrimary: 'bg-amber-100/25',
            glowSecondary: 'bg-orange-900/35',
            texture: 'bg-[url(\'https://grainy-gradients.vercel.app/noise.svg\')] opacity-20',
            iconBox: 'bg-white/20 ring-white/35',
            description: 'text-orange-100/95',
            highlightPill: 'border-white/30 bg-white/15 text-orange-50',
            meterContainer: 'border-white/20 bg-black/20',
            meterLabel: 'text-orange-100',
            meterValue: 'text-white',
            meterTotal: 'text-orange-200',
            meterTrack: 'bg-black/25',
            conversationBar: 'bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-300',
            imageBar: 'bg-gradient-to-r from-pink-200 via-rose-200 to-amber-200'
        }
        : {
            wrapper: 'bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800',
            glowPrimary: 'bg-cyan-100/25',
            glowSecondary: 'bg-indigo-900/35',
            texture: '',
            iconBox: 'bg-white/15 ring-white/35',
            description: 'text-cyan-100/95',
            highlightPill: 'border-white/25 bg-white/10 text-cyan-50',
            meterContainer: 'border-white/15 bg-slate-950/20',
            meterLabel: 'text-cyan-100',
            meterValue: 'text-white',
            meterTotal: 'text-cyan-200',
            meterTrack: 'bg-slate-950/35',
            conversationBar: 'bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300',
            imageBar: 'bg-gradient-to-r from-fuchsia-300 via-pink-300 to-amber-300'
        };

    return (
        <div className="space-y-6">
            {/* Main Welcome Card */}
            <div className={`relative overflow-hidden rounded-[30px] border border-white/10 p-6 text-white shadow-2xl transition-all duration-500 sm:p-8 ${heroTheme.wrapper}`}>
                <div className={`pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl ${heroTheme.glowPrimary}`} />
                <div className={`pointer-events-none absolute -bottom-24 -left-14 h-72 w-72 rounded-full blur-3xl ${heroTheme.glowSecondary}`} />
                {isPro && <div className={`pointer-events-none absolute inset-0 ${heroTheme.texture}`} />}

                <div className="relative z-10 grid gap-7 lg:grid-cols-[1.2fr_1fr] lg:items-end">
                    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                        <div className={`relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl backdrop-blur-md ring-1 shadow-inner ${heroTheme.iconBox}`}>
                            {isPro ? (
                                <>
                                    <Crown size={32} className="text-white drop-shadow-md" />
                                    <div className="absolute -right-1 -top-1">
                                        <Sparkles size={16} className="animate-pulse text-yellow-100" />
                                    </div>
                                </>
                            ) : (
                                <CheckCircle2 size={32} className="text-white" />
                            )}
                        </div>

                        {isPro ? (
                            <>
                                <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight">
                                    <span>{t.credits.proUser}</span>
                                    <ProBadge size="md" className="shadow-lg" />
                                </h2>
                                <p className={`mt-2 max-w-lg text-lg font-medium leading-relaxed ${heroTheme.description}`}>
                                    {t.credits.proFeaturesUnlocked}
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-3xl font-black tracking-tight sm:text-[34px]">{t.credits.noConfigNeeded}</h2>
                                <p className={`mt-2 max-w-lg text-lg leading-relaxed ${heroTheme.description}`}>
                                    {t.credits.readyToUse} <strong className="border-b-2 border-white/35 text-white">{totalCap}</strong> {t.credits.conversations}
                                </p>
                            </>
                        )}

                        <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide ${heroTheme.highlightPill}`}>
                            <Sparkles size={14} />
                            {t.credits.remainingCredits}: {Math.round(creditsPercent)}%
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CreditMeterCard
                            label={t.credits.remainingCredits}
                            value={creditsValue}
                            total={totalCap}
                            percent={creditsPercent}
                            containerClassName={heroTheme.meterContainer}
                            labelClassName={heroTheme.meterLabel}
                            valueClassName={heroTheme.meterValue}
                            totalClassName={heroTheme.meterTotal}
                            progressTrackClassName={heroTheme.meterTrack}
                            progressBarClassName={heroTheme.conversationBar}
                        />
                        <CreditMeterCard
                            icon={Image}
                            label={t.credits.imageCredits || 'Image Generation'}
                            value={imageCreditsValue}
                            total={imageCreditsCap}
                            percent={imageCreditsPercent}
                            containerClassName={heroTheme.meterContainer}
                            labelClassName={heroTheme.meterLabel}
                            valueClassName={heroTheme.meterValue}
                            totalClassName={heroTheme.meterTotal}
                            progressTrackClassName={heroTheme.meterTrack}
                            progressBarClassName={heroTheme.imageBar}
                        />
                    </div>
                </div>
            </div>

            {/* Redeem Section */}
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:from-slate-900 dark:to-slate-900/70 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Ticket size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{t.credits.redeemCode}</h3>
                        <p className="text-xs text-slate-500">{t.credits.redeemCodeDesc}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-1.5 dark:border-white/10 dark:bg-slate-900/60">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            type="text"
                            value={redeemInput}
                            onChange={(e) => setRedeemInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRedeem();
                                }
                            }}
                            placeholder={t.credits.enterCodePlaceholder}
                            className="flex-1 rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-sm uppercase text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400/40 focus:bg-white dark:text-slate-200 dark:focus:bg-slate-800/80 font-mono"
                        />
                        <button
                            onClick={handleRedeem}
                            disabled={redeemStatus === 'loading' || !redeemInput.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-2.5 font-bold text-white shadow-[0_8px_30px_rgba(79,70,229,0.35)] transition-all hover:from-indigo-500 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {redeemStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : t.credits.redeem}
                        </button>
                    </div>
                </div>

                {/* Redeem Feedback */}
                {redeemMessage && (
                    <div className={`mt-3 rounded-xl p-3 text-sm flex items-center gap-2 ${redeemStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                        {redeemStatus === 'success' ? <CheckCircle2 size={16} /> : <Zap size={16} />}
                        {redeemMessage}
                    </div>
                )}
            </div>

            {/* Admin Panel - Only visible to admins */}
            {isAdmin && (
                <>
                    <div className="flex justify-center">
                        <button
                            onClick={() => setShowAdmin(!showAdmin)}
                            className="inline-flex items-center gap-1 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-500 transition-colors hover:text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:text-indigo-200"
                        >
                            <Lock size={10} />
                            {showAdmin ? t.credits.hideAdminTools : t.credits.adminTools}
                        </button>
                    </div>

                    {showAdmin && (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <AdminCodePanel />
                        </div>
                    )}
                </>
            )}

            {/* Features Info */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CreditBenefitCard
                    icon={Zap}
                    title={t.credits.fastResponse}
                    description={t.credits.fastResponseDesc}
                    containerClassName="border-slate-200/70 bg-slate-50/80 dark:border-white/10 dark:bg-slate-800/65"
                    iconWrapClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
                />
                <CreditBenefitCard
                    icon={Infinity}
                    title={t.credits.longLasting}
                    description={t.credits.longLastingDesc}
                    containerClassName="border-slate-200/70 bg-slate-50/80 dark:border-white/10 dark:bg-slate-800/65"
                    iconWrapClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
                />
            </div>

            {/* Info Box - HIDDEN FOR CHINA USERS */}
            {!isChinaUser && (
                <div className="space-y-4 text-center">
                    <div className="mx-auto max-w-xl rounded-2xl border border-cyan-200/40 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 p-4 dark:border-cyan-300/20 dark:from-cyan-500/10 dark:via-slate-900/90 dark:to-indigo-500/10 sm:p-5">
                        <button
                            onClick={() => setIsPaymentOpen(true)}
                            className="mx-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3 font-bold text-white shadow-[0_10px_36px_rgba(6,182,212,0.35)] transition-all hover:from-cyan-400 hover:to-indigo-500 active:scale-95"
                        >
                            <Gift size={20} />
                            {t.credits.getMore}
                        </button>

                        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {t.credits.advancedNote}{' '}
                            <span className="cursor-pointer font-bold text-slate-700 hover:underline dark:text-slate-200" onClick={onOpenAdvanced}>
                                {t.credits.advancedLink}
                            </span>{' '}
                            {t.credits.toConfig}
                        </p>
                    </div>
                </div>
            )}

            {!isChinaUser && <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />}
        </div>
    );
}
