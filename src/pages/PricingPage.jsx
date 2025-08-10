import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Shield, ArrowLeft, Sparkles, Star, Globe, AlertTriangle } from 'lucide-react';
import { auth } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { isLikelyChinaUser } from '../utils/regionCheck';

// Translations for pricing page
const pricingTranslations = {
    en: {
        backToNexMap: 'Back to NexMap',
        securedByStripe: 'Secured by Stripe',
        tagline: 'Simple, transparent pricing',
        heroTitle: 'Unlock the Power of AI',
        heroDesc: 'Choose the plan that fits your needs. No subscriptions, no hidden fees. Pay once, use forever.',
        creditPacks: 'Credit Packs',
        proLifetime: 'Pro Lifetime',
        mostPopular: 'Most Popular',
        bestValue: 'Best Value',
        credits: 'Credits',
        conversations: 'conversations',
        getStarted: 'Get Started',
        redirecting: 'Redirecting...',
        upgradeNow: 'Upgrade Now',
        oneTimePayment: 'One-time payment',
        cancelAnytime: 'Cancel anytime. 100% secure.',
        proTitle: 'Pro Lifetime',
        proDesc: 'Unlock the full potential of NexMap with a one-time purchase. No subscriptions, no recurring fees.',
        proFeatures: [
            'Bring Your Own API Keys (OpenAI, Anthropic, Google)',
            'Unlimited usage — pay providers directly',
            'Access GPT-4, Claude 3 Opus, Gemini Pro',
            'Lifetime updates & early access to new features',
            'Priority customer support'
        ],
        ssl: '256-bit SSL Encryption',
        poweredByStripe: 'Powered by Stripe',
        instantDelivery: 'Instant Delivery',
        allRights: 'All rights reserved.',
        regionBlocked: 'Payment services are not available in your region.',
        regionBlockedDesc: 'Due to regulatory requirements, online payment is temporarily unavailable in mainland China. Please contact us for alternative solutions.',
        contactUs: 'Contact Support',
        payAsYouGo: 'Pay as you go',
        noExpiration: 'No expiration',
        bestValuePerCredit: 'Best value per credit',
        prioritySupport: 'Priority support',
        forPowerUsers: 'For power users',
        maxEfficiency: 'Maximum efficiency'
    },
    zh: {
        backToNexMap: '返回 NexMap',
        securedByStripe: 'Stripe 安全支付',
        tagline: '简单透明的定价',
        heroTitle: '解锁 AI 的强大力量',
        heroDesc: '选择适合您的套餐。无订阅，无隐藏费用。一次购买，永久使用。',
        creditPacks: '积分包',
        proLifetime: 'Pro 终身版',
        mostPopular: '最受欢迎',
        bestValue: '超值',
        credits: '积分',
        conversations: '次对话',
        getStarted: '立即购买',
        redirecting: '跳转中...',
        upgradeNow: '立即升级',
        oneTimePayment: '一次性付款',
        cancelAnytime: '随时取消，100% 安全。',
        proTitle: 'Pro 终身版',
        proDesc: '一次购买，解锁 NexMap 的全部潜力。无订阅，无定期费用。',
        proFeatures: [
            '使用自己的 API 密钥 (OpenAI, Anthropic, Google)',
            '无限使用 — 直接向供应商付费',
            '访问 GPT-4, Claude 3 Opus, Gemini Pro',
            '终身更新 & 抢先体验新功能',
            '优先客户支持'
        ],
        ssl: '256位 SSL 加密',
        poweredByStripe: 'Stripe 驱动',
        instantDelivery: '即时交付',
        allRights: '版权所有。',
        regionBlocked: '您所在的地区暂不支持支付服务',
        regionBlockedDesc: '由于法规要求，中国大陆地区暂时无法使用在线支付功能。如需购买，请联系我们获取其他解决方案。',
        contactUs: '联系客服',
        payAsYouGo: '按需付费',
        noExpiration: '永不过期',
        bestValuePerCredit: '最佳性价比',
        prioritySupport: '优先支持',
        forPowerUsers: '为重度用户打造',
        maxEfficiency: '最大效率'
    },
    ja: {
        backToNexMap: 'NexMap に戻る',
        securedByStripe: 'Stripe で安全に保護',
        tagline: 'シンプルで透明な価格設定',
        heroTitle: 'AI の力を解き放つ',
        heroDesc: 'ニーズに合ったプランをお選びください。サブスク無し、隠れた手数料無し。一度の支払いで永久に使用可能。',
        creditPacks: 'クレジットパック',
        proLifetime: 'Pro 永久版',
        mostPopular: '最も人気',
        bestValue: 'ベストバリュー',
        credits: 'クレジット',
        conversations: '会話',
        getStarted: '購入する',
        redirecting: 'リダイレクト中...',
        upgradeNow: '今すぐアップグレード',
        oneTimePayment: '一回払い',
        cancelAnytime: 'いつでもキャンセル可能。100% 安全。',
        proTitle: 'Pro 永久版',
        proDesc: '一回の購入で NexMap の全機能をアンロック。サブスク無し、定期料金無し。',
        proFeatures: [
            '自分の API キーを使用 (OpenAI, Anthropic, Google)',
            '無制限使用 — プロバイダーに直接支払い',
            'GPT-4, Claude 3 Opus, Gemini Pro にアクセス',
            '永久アップデート & 新機能への早期アクセス',
            '優先カスタマーサポート'
        ],
        ssl: '256ビット SSL 暗号化',
        poweredByStripe: 'Stripe 提供',
        instantDelivery: '即時配信',
        allRights: 'All rights reserved.',
        regionBlocked: 'お住まいの地域では決済サービスをご利用いただけません',
        regionBlockedDesc: '規制上の理由により、中国本土ではオンライン決済が一時的にご利用いただけません。代替についてはお問い合わせください。',
        contactUs: 'サポートに連絡',
        payAsYouGo: '従量課金',
        noExpiration: '有効期限なし',
        bestValuePerCredit: 'クレジットあたり最高の価値',
        prioritySupport: '優先サポート',
        forPowerUsers: 'パワーユーザー向け',
        maxEfficiency: '最大効率'
    }
};



export default function PricingPage() {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = pricingTranslations[language] || pricingTranslations.en;
    const [loadingProduct, setLoadingProduct] = useState(null);
    const [billingCycle, setBillingCycle] = useState('credits');
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        setIsBlocked(isLikelyChinaUser());
    }, []);

    const handleCheckout = async (productId) => {
        const user = auth.currentUser;
        if (!user) {
            alert("Please login first to make a purchase.");
            navigate('/');
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

    const creditPlans = [
        {
            id: 'credits_500',
            name: 'Starter',
            price: '$0.99',
            credits: '500',
            chats: '~1,000',
            features: [t.payAsYouGo, t.noExpiration, t.instantDelivery],
            popular: false
        },
        {
            id: 'credits_2000',
            name: 'Standard',
            price: '$3.99',
            credits: '2,000',
            chats: '~4,000',
            features: [t.bestValuePerCredit, t.prioritySupport, t.instantDelivery],
            popular: true
        },
        {
            id: 'credits_5000',
            name: 'Power',
            price: '$9.99',
            credits: '5,000',
            chats: '~10,000',
            features: [t.forPowerUsers, t.maxEfficiency, t.instantDelivery],
            popular: false
        }
    ];

    // Region Blocked UI
    if (isBlocked) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40} className="text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">{t.regionBlocked}</h1>
                    <p className="text-white/60 mb-8 leading-relaxed">{t.regionBlockedDesc}</p>
                    <div className="flex flex-col gap-4">
                        <a href="mailto:support@nexmap.catzz.work" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all">
                            {t.contactUs}
                        </a>
                        <Link to="/" className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all">
                            {t.backToNexMap}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px]" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <header className="px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
                    <Link to="/" className="flex items-center gap-3 text-white/80 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                        <span className="font-bold">{t.backToNexMap}</span>
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                        <Shield size={16} className="text-emerald-400" />
                        {t.securedByStripe}
                    </div>
                </header>

                {/* Hero Section */}
                <section className="text-center px-6 pt-12 pb-16 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/80 mb-8">
                        <Sparkles size={16} className="text-amber-400" />
                        {t.tagline}
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                        {t.heroTitle}
                    </h1>
                    <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                        {t.heroDesc}
                    </p>
                </section>

                {/* Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <button
                            onClick={() => setBillingCycle('credits')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${billingCycle === 'credits' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-white/60 hover:text-white'}`}
                        >
                            <Zap size={16} />
                            {t.creditPacks}
                        </button>
                        <button
                            onClick={() => setBillingCycle('pro')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${billingCycle === 'pro' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' : 'text-white/60 hover:text-white'}`}
                        >
                            <Crown size={16} />
                            {t.proLifetime}
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <section className="px-6 pb-24 max-w-6xl mx-auto">
                    {billingCycle === 'credits' ? (
                        <div className="grid md:grid-cols-3 gap-6">
                            {creditPlans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 ${plan.popular
                                        ? 'bg-gradient-to-b from-indigo-600/20 to-indigo-900/20 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/20'
                                        : 'bg-white/5 border border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                            {t.mostPopular}
                                        </div>
                                    )}

                                    <div className="text-center mb-8">
                                        <h3 className="text-lg font-bold text-white/80 mb-2">{plan.name}</h3>
                                        <div className="text-5xl font-black text-white mb-2">{plan.price}</div>
                                        <div className="text-indigo-400 font-bold text-lg">{plan.credits} {t.credits}</div>
                                        <div className="text-white/40 text-sm mt-1">{plan.chats} {t.conversations}</div>
                                    </div>

                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3 text-white/70">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.popular ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white/50'}`}>
                                                    <Check size={12} />
                                                </div>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleCheckout(plan.id)}
                                        disabled={loadingProduct === plan.id}
                                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all active:scale-95 disabled:opacity-50 ${plan.popular
                                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                            : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                    >
                                        {loadingProduct === plan.id ? t.redirecting : t.getStarted}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto">
                            <div className="rounded-3xl p-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-2xl shadow-orange-500/20">
                                <div className="rounded-[22px] bg-slate-900 p-10">
                                    <div className="flex flex-col md:flex-row gap-10 items-center">
                                        <div className="flex-1 text-center md:text-left">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
                                                <Star size={12} fill="currentColor" />
                                                {t.bestValue}
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-3">{t.proTitle}</h3>
                                            <p className="text-white/60 mb-6 leading-relaxed">
                                                {t.proDesc}
                                            </p>

                                            <ul className="space-y-3 text-left">
                                                {t.proFeatures.map((feature, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-white/70">
                                                        <Check size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="w-full md:w-auto text-center bg-white/5 rounded-2xl p-8 border border-white/10">
                                            <div className="text-white/50 text-sm mb-1">{t.oneTimePayment}</div>
                                            <div className="text-5xl font-black text-white mb-6">$10</div>
                                            <button
                                                onClick={() => handleCheckout('pro_lifetime')}
                                                disabled={loadingProduct === 'pro_lifetime'}
                                                className="w-full py-4 px-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {loadingProduct === 'pro_lifetime' ? t.redirecting : t.upgradeNow}
                                            </button>
                                            <p className="text-white/40 text-xs mt-4">{t.cancelAnytime}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Trust Section */}
                <section className="px-6 pb-20 max-w-4xl mx-auto text-center">
                    <div className="flex flex-wrap justify-center items-center gap-8 text-white/40 text-sm">
                        <div className="flex items-center gap-2">
                            <Shield size={18} className="text-emerald-400" />
                            {t.ssl}
                        </div>
                        <div className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                            </svg>
                            {t.poweredByStripe}
                        </div>
                        <div className="flex items-center gap-2">
                            <Check size={18} className="text-emerald-400" />
                            {t.instantDelivery}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-white/5 px-6 py-8">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/40">
                        <div>© {new Date().getFullYear()} NexMap. {t.allRights}</div>
                        <div className="flex gap-6">
                            <Link to="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
                            <Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <Link to="/legal/tokushoho" className="hover:text-white transition-colors">特定商取引法</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
