import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Star, Key, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { auth } from '../../../services/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isLikelyChinaUser } from '../../../utils/regionCheck';

export default function PricingSection({ showTitle = true }) {
    const navigate = useNavigate();
    const { language, setLanguage, t } = useLanguage();
    const pricing = t.pricing;
    const [loadingProduct, setLoadingProduct] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        setIsBlocked(isLikelyChinaUser());
    }, []);

    // Pricing Configurations
    const pricingConfig = {
        en: {
            currency: '$',
            pro: '10',
            packs: { starter: '0.99', standard: '3.99', power: '9.99' }
        },
        zh: {
            currency: '$',
            pro: '10',
            packs: { starter: '0.99', standard: '3.99', power: '9.99' }
        },
        ja: {
            currency: '¥',
            pro: '1,500',
            packs: { starter: '150', standard: '600', power: '1,500' }
        }
    };

    const currentPricing = pricingConfig[language] || pricingConfig.en;

    const handleCheckout = async (productId) => {
        if (isBlocked) return;

        const user = auth.currentUser;
        if (!user) {
            navigate('/?login=true');
            return;
        }

        setLoadingProduct(productId);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId,
                    currency: language === 'ja' ? 'jpy' : 'usd',
                    successUrl: window.location.origin + '/gallery?payment=success',
                    cancelUrl: window.location.origin + '/pricing?payment=cancelled'
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            window.location.href = data.url;

        } catch (err) {
            console.error(err);
            alert(`Payment Error: ${err.message}`);
            setLoadingProduct(null);
        }
    };

    const chatPlans = [
        {
            id: 'credits_500',
            name: 'Starter',
            price: `${currentPricing.currency}${currentPricing.packs.starter}`,
            chats: '600',
            features: [pricing.payAsYouGo, pricing.noExpiration],
        },
        {
            id: 'credits_2000',
            name: 'Standard',
            price: `${currentPricing.currency}${currentPricing.packs.standard}`,
            chats: '3,000',
            features: [pricing.bestValuePerCredit, pricing.instantDelivery],
            popular: true
        },
        {
            id: 'credits_5000',
            name: 'Power',
            price: `${currentPricing.currency}${currentPricing.packs.power}`,
            chats: '9,000',
            features: [pricing.forPowerUsers, pricing.maxEfficiency],
        }
    ];

    return (
        <section className="py-24 px-6 max-w-7xl mx-auto">
            {showTitle && (
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-8">
                        <Sparkles size={14} />
                        {pricing.tagline}
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-8 bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent">
                        {pricing.heroTitle}
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
                        {pricing.heroDesc}
                    </p>
                </div>
            )}

            {/* Pro Plan - Primary Focus */}
            <div className="max-w-5xl mx-auto mb-32">
                <div className="relative group">
                    {/* Glow Effect */}
                    <div className={`absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-500 rounded-[2.5rem] blur opacity-20 ${isBlocked ? 'opacity-10' : 'group-hover:opacity-40'} transition duration-1000`} />

                    <div className="relative bg-[#0A0A0A] border border-white/10 rounded-[2rem] p-1 md:p-2 overflow-hidden">
                        {/* Badge */}
                        <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-500 to-orange-600 px-6 py-3 rounded-bl-[2rem] rounded-tr-[1.5rem] md:rounded-tr-[1.8rem] z-20">
                            <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm md:text-base shadow-sm">
                                <Crown size={16} fill="currentColor" />
                                {pricing.mostPopular}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 md:gap-16 p-8 md:p-12 items-center">
                            {/* Left Content */}
                            <div>
                                <div className="inline-flex items-center gap-2 text-amber-500 font-bold mb-4 tracking-wider uppercase text-xs">
                                    <Star size={14} fill="currentColor" />
                                    {pricing.whyPro}
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                                    {pricing.proTitle}
                                </h2>
                                <p className="text-lg text-white/60 mb-8 leading-relaxed">
                                    {pricing.proDesc}
                                </p>

                                <div className="space-y-4">
                                    {pricing.proFeatures.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-4">
                                            <div className="mt-1 w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                                <Check size={14} className="text-amber-500" />
                                            </div>
                                            <span className="text-white/80">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Content - Pricing CArd */}
                            <div className={`bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md relative ${isBlocked ? 'opacity-50 grayscale' : ''}`}>
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600 opacity-50" />

                                <div className="mb-8">
                                    <div className="flex items-end gap-2 mb-2">
                                        <span className="text-6xl font-black text-white">
                                            {currentPricing.currency}{currentPricing.pro}
                                        </span>
                                        <span className="text-white/40 font-medium mb-2 uppercase text-sm">/ {pricing.oneTimePayment}</span>
                                    </div>
                                    <p className="text-white/40 text-sm">{pricing.cancelAnytime}</p>
                                </div>

                                <button
                                    onClick={() => handleCheckout('pro_lifetime')}
                                    disabled={loadingProduct === 'pro_lifetime' || isBlocked}
                                    className={`w-full py-4 px-6 font-bold text-lg rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 group/btn ${isBlocked
                                        ? 'bg-white/10 text-white/40 cursor-not-allowed shadow-none'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-orange-500/20'
                                        }`}
                                >
                                    {isBlocked ? (
                                        pricing.regionBlocked
                                    ) : loadingProduct === 'pro_lifetime' ? (
                                        pricing.redirecting
                                    ) : (
                                        <>
                                            <Zap size={20} className="fill-white/20 group-hover/btn:fill-white transition-colors" />
                                            {pricing.upgradeNow}
                                        </>
                                    )}
                                </button>

                                <div className="mt-6 flex items-center justify-center gap-3 text-xs text-white/30">
                                    <div className="flex items-center gap-1">
                                        <Key size={12} />
                                        {pricing.ownKey}
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-white/20" />
                                    <div className="flex items-center gap-1">
                                        <InfinityIcon size={12} />
                                        {pricing.unlimited}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 max-w-2xl mx-auto mb-20 opacity-30">
                <div className="h-px bg-white flex-1" />
                <span className="text-sm font-medium uppercase tracking-widest text-white">OR</span>
                <div className="h-px bg-white flex-1" />
            </div>

            {/* Free + Credits Section */}
            <div>
                <div className="text-center mb-12">
                    <h3 className="text-2xl font-bold text-white mb-2">{pricing.casualUser || "Start Free, Upgrade When Ready"}</h3>
                    <p className="text-white/50">{pricing.casualUserDesc || "Everyone gets generous free credits. Buy more when you need them."}</p>
                </div>

                {/* Free Tier Banner */}
                <div className="max-w-5xl mx-auto mb-8">
                    <div className="relative bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 md:p-8">
                        <div className="absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-600 shadow-lg shadow-emerald-500/20">
                            {pricing.freeTierBadge || "FREE FOREVER"}
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <h4 className="text-xl font-bold text-white mb-2">{pricing.freeTierTitle || "Free Tier"}</h4>
                                <p className="text-white/60 text-sm max-w-md">
                                    {pricing.freeTierDesc || "No credit card required. Resets every Monday."}
                                </p>
                            </div>

                            <div className="flex gap-6 flex-wrap justify-center">
                                <div className="text-center px-4 py-2 bg-white/5 rounded-xl">
                                    <div className="text-2xl font-bold text-emerald-400">200</div>
                                    <div className="text-xs text-white/40 uppercase font-medium">{pricing.chatsPerWeek || "Chats/Week"}</div>
                                </div>
                                <div className="text-center px-4 py-2 bg-white/5 rounded-xl">
                                    <div className="text-2xl font-bold text-emerald-400">20</div>
                                    <div className="text-xs text-white/40 uppercase font-medium">{pricing.imagesPerWeek || "Images/Week"}</div>
                                </div>
                                <div className="text-center px-4 py-2 bg-white/5 rounded-xl">
                                    <div className="text-2xl font-bold text-emerald-400">∞</div>
                                    <div className="text-xs text-white/40 uppercase font-medium">{pricing.boards || "Boards"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {chatPlans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative group bg-white/5 border transition-all duration-300 rounded-2xl p-6 ${isBlocked ? 'opacity-50 grayscale border-white/5' :
                                'hover:bg-white/[0.07] ' + (plan.popular ? 'border-indigo-500/50 hover:border-indigo-500 ring-1 ring-indigo-500/20' : 'border-white/5 hover:border-white/10')
                                }`}
                        >
                            {plan.popular && (
                                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-lg ${isBlocked ? 'bg-slate-700' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
                                    {pricing.bestValue}
                                </div>
                            )}

                            <div className="mb-6">
                                <h4 className="text-white/80 font-bold mb-1">{plan.name}</h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">
                                        {plan.price}
                                    </span>
                                    <span className="text-sm text-white/40">/ pack</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 mb-6">
                                <div className="text-indigo-400 font-bold">{plan.chats}</div>
                                <div className="text-[10px] uppercase font-bold text-white/30">{pricing.chats || "Chats"}</div>
                            </div>

                            <ul className="space-y-3 mb-8 min-h-[80px]">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-white/50">
                                        <Check size={14} className="text-indigo-400" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleCheckout(plan.id)}
                                disabled={loadingProduct === plan.id || isBlocked}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${isBlocked
                                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                    : plan.popular
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                            >
                                {isBlocked ? pricing.regionBlocked : loadingProduct === plan.id ? pricing.redirecting : pricing.getStarted}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
