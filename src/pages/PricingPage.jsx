import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Shield, ArrowLeft, Sparkles, Star, Globe, AlertTriangle, Infinity as InfinityIcon, Key } from 'lucide-react';
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
        heroDesc: 'Start with the Pro plan for unlimited potential, or pick a credit pack for casual use.',
        creditPacks: 'Credit Packs',
        creditPacksDesc: 'Perfect for beginners or casual users. Pay as you go.',
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
        proDesc: 'The ultimate experience for power users. Bring your own keys and break free from limits.',
        proFeatures: [
            'Bring Your Own API Keys (OpenAI, Anthropic, Google)',
            'Unlimited usage — pay providers directly',
            'Access GPT-4, Claude 3 Opus, Gemini Pro',
            'Lifetime updates & early access to new features',
            'Priority customer support',
            'Commercial usage rights'
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
        maxEfficiency: 'Maximum efficiency',
        whyPro: 'Why Go Pro?',
        whyProDesc: 'Designed for professionals who need control, privacy, and unlimited scalablity.',
        casualUser: 'Casual User?',
        casualUserDesc: 'Get started with pre-loaded credits. No API keys needed.'
    },
    zh: {
        backToNexMap: '返回 NexMap',
        securedByStripe: 'Stripe 安全支付',
        tagline: '简单透明的定价',
        heroTitle: '解锁 AI 的强大力量',
        heroDesc: '选择 Pro 版释放无限潜能，或选择积分包轻松上手。',
        creditPacks: '积分包',
        creditPacksDesc: '适合初学者或偶尔使用的用户。按需付费。',
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
        proDesc: '为专业用户打造的终极体验。使用自己的 Key，打破一切限制。',
        proFeatures: [
            '绑定自己的 API Key (OpenAI, Anthropic, Google)',
            '无限使用 — 直接向供应商官方付费 (成本更低)',
            '解锁 GPT-4, Claude 3 Opus, Gemini Pro 等顶级模型',
            '终身免费更新 & 抢先体验新功能',
            '优先客户支持',
            '商业使用授权'
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
        maxEfficiency: '最大效率',
        whyPro: '为什么选择 Pro？',
        whyProDesc: '专为需要掌控力、隐私和无限扩展性的专业人士设计。',
        casualUser: '偶尔使用？',
        casualUserDesc: '通过预充值积分快速开始，无需繁琐配置 API Key。'
    },
    ja: {
        backToNexMap: 'NexMap に戻る',
        securedByStripe: 'Stripe で安全に保護',
        tagline: 'シンプルで透明な価格設定',
        heroTitle: 'AI の力を解き放つ',
        heroDesc: 'Pro プランで無限の可能性を、またはクレジットパックで手軽にスタート。',
        creditPacks: 'クレジットパック',
        creditPacksDesc: '初心者やカジュアルユーザーに最適。従量課金。',
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
        proDesc: 'パワーユーザーのための究極の体験。自分のキーを使って制限から解放されましょう。',
        proFeatures: [
            '自分の API キーを使用 (OpenAI, Anthropic, Google)',
            '無制限使用 — プロバイダーに直接支払い',
            'GPT-4, Claude 3 Opus, Gemini Pro にアクセス',
            '永久アップデート & 新機能への早期アクセス',
            '優先カスタマーサポート',
            '商用利用権'
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
        maxEfficiency: '最大効率',
        whyPro: 'なぜ Pro なのか？',
        whyProDesc: 'コントロール、プライバシー、そして無限の拡張性を求めるプロフェッショナルのために。',
        casualUser: 'カジュアルに使う？',
        casualUserDesc: 'API キー不要。プリペイドクレジットですぐに始められます。'
    }
};

export default function PricingPage() {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = pricingTranslations[language] || pricingTranslations.en;
    const [loadingProduct, setLoadingProduct] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        setIsBlocked(isLikelyChinaUser());
    }, []);

    const handleCheckout = async (productId) => {
        const user = auth.currentUser;
        if (!user) {
            // Keep the query param or logic to redirect back after login if needed
            // For now straightforward alert
            alert("Please login first to make a purchase.");
            navigate('/?login=true'); // Assuming landing page can handle login trigger, or just stay here
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
            features: [t.payAsYouGo, t.noExpiration],
        },
        {
            id: 'credits_2000',
            name: 'Standard',
            price: '$3.99',
            credits: '2,000',
            chats: '~4,000',
            features: [t.bestValuePerCredit, t.instantDelivery],
            popular: true
        },
        {
            id: 'credits_5000',
            name: 'Power',
            price: '$9.99',
            credits: '5,000',
            chats: '~10,000',
            features: [t.forPowerUsers, t.maxEfficiency],
        }
    ];

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
        <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-amber-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <header className="px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
                    <Link to="/" className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        <span className="font-medium text-sm">{t.backToNexMap}</span>
                    </Link>
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                        <Shield size={12} />
                        {t.securedByStripe}
                    </div>
                </header>

                <main className="px-6 pt-8 pb-32 max-w-7xl mx-auto">
                    {/* Hero Text */}
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-8">
                            <Sparkles size={14} />
                            {t.tagline}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent">
                            {t.heroTitle}
                        </h1>
                        <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
                            {t.heroDesc}
                        </p>
                    </div>

                    {/* Pro Plan - Primary Focus */}
                    <div className="max-w-5xl mx-auto mb-32">
                        <div className="relative group">
                            {/* Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />

                            <div className="relative bg-slate-900 border border-white/10 rounded-[2rem] p-1 md:p-2 overflow-hidden">
                                {/* Badge */}
                                <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-500 to-orange-600 px-6 py-3 rounded-bl-[2rem] rounded-tr-[1.5rem] md:rounded-tr-[1.8rem] z-20">
                                    <div className="flex items-center gap-2 text-white font-bold tracking-wide text-sm md:text-base shadow-sm">
                                        <Crown size={16} fill="currentColor" />
                                        {t.mostPopular}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8 md:gap-16 p-8 md:p-12 items-center">
                                    {/* Left Content */}
                                    <div>
                                        <div className="inline-flex items-center gap-2 text-amber-500 font-bold mb-4 tracking-wider uppercase text-xs">
                                            <Star size={14} fill="currentColor" />
                                            {t.whyPro}
                                        </div>
                                        <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                                            {t.proTitle}
                                        </h2>
                                        <p className="text-lg text-white/60 mb-8 leading-relaxed">
                                            {t.proDesc}
                                        </p>

                                        <div className="space-y-4">
                                            {t.proFeatures.map((feature, i) => (
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
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md relative">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600 opacity-50" />

                                        <div className="mb-8">
                                            <div className="flex items-end gap-2 mb-2">
                                                <span className="text-6xl font-black text-white">$10</span>
                                                <span className="text-white/40 font-medium mb-2 uppercase text-sm">/ {t.oneTimePayment}</span>
                                            </div>
                                            <p className="text-white/40 text-sm">{t.cancelAnytime}</p>
                                        </div>

                                        <button
                                            onClick={() => handleCheckout('pro_lifetime')}
                                            disabled={loadingProduct === 'pro_lifetime'}
                                            className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 group/btn"
                                        >
                                            {loadingProduct === 'pro_lifetime' ? (
                                                t.redirecting
                                            ) : (
                                                <>
                                                    <Zap size={20} className="fill-white/20 group-hover/btn:fill-white transition-colors" />
                                                    {t.upgradeNow}
                                                </>
                                            )}
                                        </button>

                                        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-white/30">
                                            <div className="flex items-center gap-1">
                                                <Key size={12} />
                                                Own API Key
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-white/20" />
                                            <div className="flex items-center gap-1">
                                                <InfinityIcon size={12} />
                                                Unlimited
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

                    {/* Credits Section - Secondary Focus */}
                    <div>
                        <div className="text-center mb-12">
                            <h3 className="text-2xl font-bold text-white mb-2">{t.casualUser}</h3>
                            <p className="text-white/50">{t.casualUserDesc}</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {creditPlans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`relative group bg-white/5 hover:bg-white/[0.07] border transition-all duration-300 rounded-2xl p-6 ${plan.popular ? 'border-indigo-500/50 hover:border-indigo-500 ring-1 ring-indigo-500/20' : 'border-white/5 hover:border-white/10'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/20">
                                            {t.bestValue}
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h4 className="text-white/80 font-bold mb-1">{plan.name}</h4>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold text-white">{plan.price}</span>
                                            <span className="text-sm text-white/40">/ pack</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 mb-6">
                                        <div className="text-indigo-400 font-bold">{plan.credits}</div>
                                        <div className="text-[10px] uppercase font-bold text-white/30">{t.credits}</div>
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
                                        disabled={loadingProduct === plan.id}
                                        className={`w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${plan.popular
                                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                    >
                                        {loadingProduct === plan.id ? t.redirecting : t.getStarted}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Footer Trust */}
                <footer className="border-t border-white/5 bg-white/[0.02]">
                    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-8 text-white/30 text-sm">
                            <span className="flex items-center gap-2">
                                <Shield size={14} />
                                {t.ssl}
                            </span>
                            <span className="flex items-center gap-2">
                                <Globe size={14} />
                                {t.poweredByStripe}
                            </span>
                        </div>
                        <div className="flex gap-6 text-sm text-white/40">
                            <Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <Link to="/legal/terms" className="hover:text-white transition-colors">Terms</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
