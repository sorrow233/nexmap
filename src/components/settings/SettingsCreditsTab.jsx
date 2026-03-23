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
import {
    settingsDarkChip,
    settingsDarkFieldSoft,
    settingsDarkIcon,
    settingsDarkSurfaceGradient,
    settingsDarkSurfaceStrong,
    settingsDarkTrack
} from './themeClasses';

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
            wrapper: 'border border-[#ead6b5] bg-[linear-gradient(135deg,rgba(255,248,235,0.96),rgba(248,237,221,0.94))] text-[#2f241a] shadow-[0_22px_54px_rgba(168,124,54,0.10)] dark:border-amber-200/15 dark:bg-[linear-gradient(135deg,rgba(39,28,12,0.92),rgba(29,22,14,0.96))] dark:text-white dark:shadow-[0_24px_60px_rgba(2,6,23,0.45)]',
            glowPrimary: 'bg-[#f6dea7]/40 dark:bg-amber-300/10',
            glowSecondary: 'bg-[#f1c9b2]/30 dark:bg-orange-300/10',
            texture: '',
            iconBox: 'bg-[#f5e2bf] ring-[#ebcf9b] dark:bg-amber-300/15 dark:ring-amber-200/20',
            description: 'text-[#7b6751] dark:text-amber-50/80',
            highlightPill: 'border-[#ead6b5] bg-[#fff8ec] text-[#9a7338] dark:border-amber-200/15 dark:bg-amber-300/10 dark:text-amber-100',
            meterContainer: `border-[#eadcc9] bg-white/85 ${settingsDarkSurfaceStrong}`,
            meterLabel: 'text-[#8f7d69] dark:text-slate-300/75',
            meterValue: 'text-[#2f241a] dark:text-white',
            meterTotal: 'text-[#a88b68] dark:text-slate-400',
            meterTrack: `bg-[#f5eee5] ${settingsDarkTrack}`,
            conversationBar: 'bg-gradient-to-r from-[#f3c97b] to-[#e59f6b]',
            imageBar: 'bg-gradient-to-r from-[#d7c5e9] to-[#a9bfd8]'
        }
        : {
            wrapper: 'border border-[#eee3d7] bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(246,240,234,0.94))] text-[#2f241a] shadow-[0_22px_54px_rgba(95,74,50,0.08)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(20,24,31,0.94),rgba(12,17,24,0.94))] dark:text-white dark:shadow-[0_24px_60px_rgba(2,6,23,0.45)]',
            glowPrimary: 'bg-[#efe1f7]/45 dark:bg-violet-300/10',
            glowSecondary: 'bg-[#dfe8ef]/45 dark:bg-cyan-300/10',
            texture: '',
            iconBox: `bg-[#f0e7da] ring-[#ebddca] ${settingsDarkIcon} dark:ring-slate-700/70`,
            description: 'text-[#7b6a58] dark:text-slate-300',
            highlightPill: `border-[#eadcc9] bg-[#fffaf3] text-[#8d6d49] ${settingsDarkChip}`,
            meterContainer: `border-[#eadcc9] bg-white/85 ${settingsDarkSurfaceStrong}`,
            meterLabel: 'text-[#8f7d69] dark:text-slate-300/75',
            meterValue: 'text-[#2f241a] dark:text-white',
            meterTotal: 'text-[#a88b68] dark:text-slate-400',
            meterTrack: `bg-[#f5eee5] ${settingsDarkTrack}`,
            conversationBar: 'bg-gradient-to-r from-[#f3c97b] to-[#e59f6b]',
            imageBar: 'bg-gradient-to-r from-[#d7c5e9] to-[#a9bfd8]'
        };

    return (
        <div className="space-y-6">
            {/* Main Welcome Card */}
            <div className={`relative overflow-hidden rounded-[30px] p-6 transition-all duration-500 sm:p-8 ${heroTheme.wrapper}`}>
                <div className={`pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl ${heroTheme.glowPrimary}`} />
                <div className={`pointer-events-none absolute -bottom-24 -left-14 h-72 w-72 rounded-full blur-3xl ${heroTheme.glowSecondary}`} />
                {isPro && <div className={`pointer-events-none absolute inset-0 ${heroTheme.texture}`} />}

                <div className="relative z-10 grid gap-7 lg:grid-cols-[1.2fr_1fr] lg:items-end">
                    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                        <div className={`relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl backdrop-blur-md ring-1 shadow-inner ${heroTheme.iconBox}`}>
                            {isPro ? (
                                <>
                                    <Crown size={32} className="text-[#9a7338] drop-shadow-md" />
                                    <div className="absolute -right-1 -top-1">
                                        <Sparkles size={16} className="animate-pulse text-[#d89e47] dark:text-amber-200" />
                                    </div>
                                </>
                            ) : (
                                <CheckCircle2 size={32} className="text-[#8d6d49] dark:text-slate-100" />
                            )}
                        </div>

                        {isPro ? (
                            <>
                                <h2 className="flex items-center gap-3 text-3xl font-semibold tracking-[-0.02em]">
                                    <span>{t.credits.proUser}</span>
                                    <ProBadge size="md" className="shadow-lg" />
                                </h2>
                                <p className={`mt-2 max-w-lg text-lg font-medium leading-relaxed ${heroTheme.description}`}>
                                    {t.credits.proFeaturesUnlocked}
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-[34px]">{t.credits.noConfigNeeded}</h2>
                                <p className={`mt-2 max-w-lg text-lg leading-relaxed ${heroTheme.description}`}>
                                    {t.credits.readyToUse} <strong className="border-b-2 border-[#ead6b5] text-[#2f241a] dark:border-amber-200/30 dark:text-white">{totalCap}</strong> {t.credits.conversations}
                                </p>
                            </>
                        )}

                        <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide ${heroTheme.highlightPill}`}>
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
            <div className={`rounded-[28px] border border-[#eee3d7] bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(248,243,237,0.92))] p-5 shadow-[0_10px_40px_rgba(95,74,50,0.07)] ${settingsDarkSurfaceGradient} sm:p-6`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`rounded-2xl bg-[#f3e7d2] p-2 text-[#af7c36] ${settingsDarkIcon}`}>
                        <Ticket size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[#3b3025] dark:text-white">{t.credits.redeemCode}</h3>
                        <p className="text-xs text-[#8f7e6b] dark:text-slate-400">{t.credits.redeemCodeDesc}</p>
                    </div>
                </div>

                <div className="rounded-[24px] border border-[#eee3d7] bg-[rgba(255,252,247,0.88)] p-1.5 dark:border-slate-700/80 dark:bg-[#101924]/92">
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
                            className={`flex-1 rounded-2xl border border-transparent bg-transparent px-4 py-2.5 text-sm uppercase text-[#4e4237] outline-none transition-all placeholder:text-[#b0a08e] focus:border-[#e7d4bb] focus:bg-white dark:focus:bg-[#0f1722] font-mono ${settingsDarkFieldSoft}`}
                        />
                        <button
                            onClick={handleRedeem}
                            disabled={redeemStatus === 'loading' || !redeemInput.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#efb65a] px-6 py-2.5 font-semibold text-[#322515] shadow-[0_10px_26px_rgba(226,174,92,0.26)] transition-all hover:bg-[#f3bf6c] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {redeemStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : t.credits.redeem}
                        </button>
                    </div>
                </div>

                {/* Redeem Feedback */}
                {redeemMessage && (
                    <div className={`mt-3 rounded-xl p-3 text-sm flex items-center gap-2 ${redeemStatus === 'success'
                        ? 'bg-[#edf5ee] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'bg-[#fbefef] text-rose-700 dark:bg-red-900/20 dark:text-red-300'
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
                            className={`inline-flex items-center gap-1 rounded-full border border-[#eadfce] bg-[#fffaf4] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#8d6d49] transition-colors hover:text-[#6d5d4d] dark:hover:text-white ${settingsDarkChip}`}
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
                    containerClassName={`border-[#eee3d7] bg-[rgba(255,252,247,0.9)] ${settingsDarkSurfaceStrong}`}
                    iconWrapClassName={`bg-[#f8f2e8] text-[#8d6d49] ${settingsDarkIcon}`}
                />
                <CreditBenefitCard
                    icon={Infinity}
                    title={t.credits.longLasting}
                    description={t.credits.longLastingDesc}
                    containerClassName={`border-[#eee3d7] bg-[rgba(255,252,247,0.9)] ${settingsDarkSurfaceStrong}`}
                    iconWrapClassName={`bg-[#ece6f7] text-[#776496] ${settingsDarkIcon}`}
                />
            </div>

            {/* Info Box - HIDDEN FOR CHINA USERS */}
            {!isChinaUser && (
                <div className="space-y-4 text-center">
                    <div className={`mx-auto max-w-xl rounded-[28px] border border-[#eee3d7] bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(248,243,237,0.92))] p-4 ${settingsDarkSurfaceGradient} sm:p-5`}>
                        <button
                            onClick={() => setIsPaymentOpen(true)}
                            className="mx-auto flex items-center gap-2 rounded-2xl bg-[#efb65a] px-6 py-3 font-semibold text-[#322515] shadow-[0_10px_32px_rgba(226,174,92,0.24)] transition-all hover:bg-[#f3bf6c] active:scale-95"
                        >
                            <Gift size={20} />
                            {t.credits.getMore}
                        </button>

                        <p className="mt-3 text-xs leading-relaxed text-[#8f7e6b] dark:text-slate-400">
                            {t.credits.advancedNote}{' '}
                            <span className="cursor-pointer font-semibold text-[#5b4c3d] hover:underline dark:text-slate-200" onClick={onOpenAdvanced}>
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
