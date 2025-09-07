import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Shield, ArrowLeft, Sparkles, Star, Globe, AlertTriangle, Infinity as InfinityIcon, Key, ChevronDown } from 'lucide-react';
import { auth } from '../services/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { isLikelyChinaUser } from '../utils/regionCheck';

// Translations for pricing page
// Translations for pricing page
const pricingTranslations = {
    en: {
        backToNexMap: 'Back to NexMap',
        securedByStripe: 'Secured by Stripe',
        tagline: 'Simple, transparent pricing',
        heroTitle: 'Unlock the Power of Spatial AI',
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
        proDesc: 'The ultimate spatial thinking experience. Own your workflow, bring your own keys, and break free from limits.',
        proFeatures: [
            'Infinite Spatial Canvas — Think in 2D space, not just chat',
            'Multi-Thread AI Orchestration — Run 10+ agents simultaneously',
            'Ghost Streaming — Ultra-low latency (<50ms) AI responses',
            'Bring Your Own Keys (BYOK) — Private, direct connection to OpenAI/Anthropic',
            'Performance Unleashed — Smooth rendering for 500+ cards',
            'Lifetime Updates & Commercial License'
        ],
        ssl: '256-bit SSL Encryption',
        poweredByStripe: 'Powered by Stripe',
        instantDelivery: 'Instant Delivery',
        allRights: 'All rights reserved.',
        regionBlocked: 'Payment services unavailable in your region',
        regionBlockedDesc: 'Due to regulatory requirements, online payment is temporarily unavailable in mainland China.',
        contactUs: 'Contact Support',
        payAsYouGo: 'Pay as you go',
        noExpiration: 'No expiration',
        bestValuePerCredit: 'Best value per credit',
        prioritySupport: 'Priority support',
        forPowerUsers: 'For power users',
        maxEfficiency: 'Maximum efficiency',
        whyPro: 'Why Go Pro?',
        whyProDesc: 'Designed for power thinkers who need an infinite canvas, privacy, and uncompromised speed.',
        casualUser: 'Casual User?',
        casualUserDesc: 'Get started with pre-loaded credits. No API keys needed.',
        hiddenPrice: '---'
    },
    zh: {
        backToNexMap: '返回 NexMap',
        securedByStripe: 'Stripe 安全支付',
        tagline: '简单透明的定价',
        heroTitle: '解锁 AI 的空间思维能力',
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
        proDesc: '为专业思考者打造的终极体验。掌控你的工作流，使用自己的 Key，打破一切限制。',
        proFeatures: [
            '无限空间画布 — 跳出线性对话，在二维空间中自由思考',
            '多线程 AI 协同 — 同时运行 10+ 个 AI 代理，拒绝等待',
            'Ghost 流式响应 — 体验 <50ms 超低延迟交互，如影随形',
            'BYOK 自带密钥 — 直连 OpenAI/Anthropic/Google，隐私至上',
            '极致性能优化 — 支持 500+ 卡片同屏渲染，丝滑流畅',
            '终身免费更新 & 商业使用授权'
        ],
        ssl: '256位 SSL 加密',
        poweredByStripe: 'Stripe 驱动',
        instantDelivery: '即时交付',
        allRights: '版权所有。',
        regionBlocked: '您所在的地区暂不支持支付服务',
        regionBlockedDesc: '由于法规要求，中国大陆地区暂时无法使用在线支付功能。',
        contactUs: '联系客服',
        payAsYouGo: '按需付费',
        noExpiration: '永不过期',
        bestValuePerCredit: '最佳性价比',
        prioritySupport: '优先支持',
        forPowerUsers: '为重度用户打造',
        maxEfficiency: '最大效率',
        whyPro: '为什么选择 Pro？',
        whyProDesc: '专为需要无限画布、数据隐私和极致速度的专业人士设计。',
        casualUser: '偶尔使用？',
        casualUserDesc: '通过预充值积分快速开始，无需繁琐配置 API Key。',
        hiddenPrice: '---'
    },
    ja: {
        backToNexMap: 'NexMap に戻る',
        securedByStripe: 'Stripe で安全に保護',
        tagline: 'シンプルで透明な価格設定',
        heroTitle: '空間的 AI の力を解き放つ',
        heroDesc: 'Pro プランで無限の可能を、またはクレジットパックで手軽にスタート。',
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
        proDesc: 'パワーユーザーのための究極の体験。自分のキーを使って制限から解放され、思考の翼を広げましょう。',
        proFeatures: [
            '無限の空間キャンバス — チャット画面を超え、2D空間で自由に思考',
            'マルチスレッド AI — 10以上のエージェントを同時実行。待ち時間ゼロ',
            'ゴースト・ストリーミング — 50ms以下の超低遅延レスポンス',
            'BYOK (APIキー持ち込み) — OpenAI/Anthropic に直接接続。プライバシー重視',
            '圧倒的なパフォーマンス — 500枚以上のカードもサクサク動作',
            '永久アップデート & 商用利用ライセンス'
        ],
        ssl: '256ビット SSL 暗号化',
        poweredByStripe: 'Stripe 提供',
        instantDelivery: '即時配信',
        allRights: 'All rights reserved.',
        regionBlocked: 'お住まいの地域では決済サービスをご利用いただけません',
        regionBlockedDesc: '規制上の理由により、中国本土ではオンライン決済が一時的にご利用いただけません。',
        contactUs: 'サポートに連絡',
        payAsYouGo: '従量課金',
        noExpiration: '有効期限なし',
        bestValuePerCredit: 'クレジットあたり最高の価値',
        prioritySupport: '優先サポート',
        forPowerUsers: 'パワーユーザー向け',
        maxEfficiency: '最大効率',
        whyPro: 'なぜ Pro なのか？',
        whyProDesc: '無限のキャンバス、プライバシー、そして妥協のないスピードを求めるプロフェッショナルのために。',
        casualUser: 'カジュアルに使う？',
        casualUserDesc: 'API キー不要。プリペイドクレジットですぐに始められます。',
        hiddenPrice: '---'
    }
};

export default function PricingPage() {
    const navigate = useNavigate();
    const { language, setLanguage } = useLanguage();
    const t = pricingTranslations[language] || pricingTranslations.en;
    const [loadingProduct, setLoadingProduct] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);

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
        if (isBlocked) return; // double check

        const user = auth.currentUser;
        if (!user) {
            alert("Please login first to make a purchase.");
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

    const toggleLanguage = (lang) => {
        setLanguage(lang);
        setShowLangMenu(false);
    };

    const creditPlans = [
        {
            id: 'credits_500',
            name: 'Starter',
            price: `${currentPricing.currency}${currentPricing.packs.starter}`,
            credits: '500',
            chats: '~1,000',
            features: [t.payAsYouGo, t.noExpiration],
        },
        {
            id: 'credits_2000',
            name: 'Standard',
            price: `${currentPricing.currency}${currentPricing.packs.standard}`,
            credits: '2,000',
            chats: '~4,000',
            features: [t.bestValuePerCredit, t.instantDelivery],
            popular: true
        },
        {
            id: 'credits_5000',
            name: 'Power',
            price: `${currentPricing.currency}${currentPricing.packs.power}`,
            credits: '5,000',
            chats: '~10,000',
            features: [t.forPowerUsers, t.maxEfficiency],
        }
    ];

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-slate-950 text-white overflow-x-hidden selection:bg-amber-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-violet-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10">
                {/* Blocked Region Banner */}
                {isBlocked && (
                    <div className="bg-amber-600/20 border-b border-amber-500/20 backdrop-blur-md">
                        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-3 text-sm font-medium text-amber-200">
                            <AlertTriangle size={16} />
                            <span>{t.regionBlockedDesc}</span>
                        </div>
                    </div>
                )}

                {/* Header */}
                <header className="px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
                    <Link to="/" className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        <span className="font-medium text-sm">{t.backToNexMap}</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowLangMenu(!showLangMenu)}
                                className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-all"
                            >
                                <Globe size={12} />
                                <span className="uppercase">{language}</span>
                                <ChevronDown size={12} className={`transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showLangMenu && (
                                <div className="absolute top-full right-0 mt-2 w-32 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                                    <button onClick={() => toggleLanguage('en')} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">English</button>
                                    <button onClick={() => toggleLanguage('zh')} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">中文</button>
                                    <button onClick={() => toggleLanguage('ja')} className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors">日本語</button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                            <Shield size={12} />
                            {t.securedByStripe}
                        </div>
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
                            <div className={`absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-600 to-yellow-500 rounded-[2.5rem] blur opacity-20 ${isBlocked ? 'opacity-10' : 'group-hover:opacity-40'} transition duration-1000`} />

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
                                    <div className={`bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md relative ${isBlocked ? 'opacity-50 grayscale' : ''}`}>
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600 opacity-50" />

                                        <div className="mb-8">
                                            <div className="flex items-end gap-2 mb-2">
                                                <span className="text-6xl font-black text-white">
                                                    {currentPricing.currency}{currentPricing.pro}
                                                </span>
                                                <span className="text-white/40 font-medium mb-2 uppercase text-sm">/ {t.oneTimePayment}</span>
                                            </div>
                                            <p className="text-white/40 text-sm">{t.cancelAnytime}</p>
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
                                                t.regionBlocked
                                            ) : loadingProduct === 'pro_lifetime' ? (
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
                                    className={`relative group bg-white/5 border transition-all duration-300 rounded-2xl p-6 ${isBlocked ? 'opacity-50 grayscale border-white/5' :
                                        'hover:bg-white/[0.07] ' + (plan.popular ? 'border-indigo-500/50 hover:border-indigo-500 ring-1 ring-indigo-500/20' : 'border-white/5 hover:border-white/10')
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-lg ${isBlocked ? 'bg-slate-700' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
                                            {t.bestValue}
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
                                        disabled={loadingProduct === plan.id || isBlocked}
                                        className={`w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${isBlocked
                                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                            : plan.popular
                                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                : 'bg-white/10 hover:bg-white/20 text-white'
                                            }`}
                                    >
                                        {isBlocked ? t.regionBlocked : loadingProduct === plan.id ? t.redirecting : t.getStarted}
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
