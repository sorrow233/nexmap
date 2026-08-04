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

    const heroTheme = {
        wrapper: `settings-jp-credits-hero${isPro ? ' is-pro' : ''}`,
        glowPrimary: 'settings-jp-credits-glow is-primary',
        glowSecondary: 'settings-jp-credits-glow is-secondary',
        texture: '',
        iconBox: 'settings-jp-credits-icon',
        description: 'settings-jp-feature-description',
        highlightPill: 'settings-jp-status-pill',
        meterContainer: 'settings-jp-credit-meter',
        meterLabel: 'settings-jp-credit-meter-label',
        meterValue: 'settings-jp-credit-meter-value',
        meterTotal: 'settings-jp-credit-meter-total',
        meterTrack: 'settings-jp-credit-meter-track',
        conversationBar: 'settings-jp-credit-meter-bar',
        imageBar: 'settings-jp-credit-meter-bar is-image'
    };

    return (
        <div className="settings-jp-feature settings-jp-credits">
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
                                    <Crown size={32} />
                                    <div className="absolute -right-1 -top-1">
                                        <Sparkles size={16} className="animate-pulse" />
                                    </div>
                                </>
                            ) : (
                                <CheckCircle2 size={32} />
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
                                    {t.credits.readyToUse} <strong>{totalCap}</strong> {t.credits.conversations}
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
            <div className="settings-jp-feature-panel settings-jp-redeem-panel">
                <div className="flex items-center gap-3 mb-4">
                    <div className="settings-jp-feature-icon">
                        <Ticket size={20} />
                    </div>
                    <div>
                        <h3>{t.credits.redeemCode}</h3>
                        <p>{t.credits.redeemCodeDesc}</p>
                    </div>
                </div>

                <div className="settings-jp-inline-form">
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
                            className="settings-jp-feature-field is-mono"
                        />
                        <button
                            onClick={handleRedeem}
                            disabled={redeemStatus === 'loading' || !redeemInput.trim()}
                            className="settings-jp-feature-button is-primary"
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
                            className="settings-jp-feature-button is-quiet is-compact"
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
            <div className="settings-jp-benefit-grid">
                <CreditBenefitCard
                    icon={Zap}
                    title={t.credits.fastResponse}
                    description={t.credits.fastResponseDesc}
                    containerClassName="settings-jp-benefit-card"
                    iconWrapClassName="settings-jp-feature-icon"
                />
                <CreditBenefitCard
                    icon={Infinity}
                    title={t.credits.longLasting}
                    description={t.credits.longLastingDesc}
                    containerClassName="settings-jp-benefit-card"
                    iconWrapClassName="settings-jp-feature-icon"
                />
            </div>

            {/* Info Box - HIDDEN FOR CHINA USERS */}
            {!isChinaUser && (
                <div className="space-y-4 text-center">
                    <div className="settings-jp-feature-panel is-compact">
                        <button
                            onClick={() => setIsPaymentOpen(true)}
                            className="settings-jp-feature-button is-primary"
                        >
                            <Gift size={20} />
                            {t.credits.getMore}
                        </button>

                        <p className="settings-jp-feature-footnote">
                            {t.credits.advancedNote}{' '}
                            <button type="button" className="settings-jp-inline-link" onClick={onOpenAdvanced}>
                                {t.credits.advancedLink}
                            </button>{' '}
                            {t.credits.toConfig}
                        </p>
                    </div>
                </div>
            )}

            {!isChinaUser && <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />}
        </div>
    );
}
