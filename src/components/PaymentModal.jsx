
import React, { useState } from 'react';
import { X, Check, Zap, Crown, CreditCard, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';

const PaymentModal = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('credits'); // 'credits' or 'pro'
    const [loadingProduct, setLoadingProduct] = useState(null);

    if (!isOpen) return null;

    const handleCheckout = async (productId) => {
        const user = auth.currentUser;
        if (!user) {
            alert("Please login first to make a purchase.");
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
                    cancelUrl: window.location.origin + '/gallery?payment=cancelled'
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Redirect to Stripe
            window.location.href = data.url;

        } catch (err) {
            console.error(err);
            alert(`Payment Error: ${err.message}`);
            setLoadingProduct(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-[#0F0F12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CreditCard className="text-indigo-400" size={24} />
                        Get More Power
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-black/20 gap-2 border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('credits')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'credits' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <Zap size={16} />
                        Credits Packs
                    </button>
                    <button
                        onClick={() => setActiveTab('pro')}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pro' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <Crown size={16} />
                        Pro Lifetime
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'credits' ? (
                        <div className="space-y-6">
                            {/* Free Tier Banner */}
                            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-600">
                                            FREE
                                        </div>
                                        <span className="text-sm text-white/80">You get <b className="text-emerald-400">200 chats</b> + <b className="text-emerald-400">20 images</b> per week</span>
                                    </div>
                                    <span className="text-xs text-white/40">Resets Monday</span>
                                </div>
                            </div>

                            {/* Optional: Need More Section */}
                            <div className="text-center text-xs text-white/40 uppercase tracking-wider font-medium">
                                Need more? Buy credits below
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Starter - credits_500 */}
                                <PlanCard
                                    title="Starter"
                                    amount="$0.99"
                                    credits="500 credits"
                                    sub="~1,000 chats"
                                    features={['Pay as you go', 'No expiration']}
                                    onClick={() => handleCheckout('credits_500')}
                                    loading={loadingProduct === 'credits_500'}
                                />
                                {/* Standard - credits_2000 (Recommended) */}
                                <PlanCard
                                    title="Standard"
                                    amount="$3.99"
                                    credits="2,000 credits"
                                    sub="~4,000 chats"
                                    popular
                                    features={['Best value', 'Priority support']}
                                    onClick={() => handleCheckout('credits_2000')}
                                    loading={loadingProduct === 'credits_2000'}
                                />
                                {/* Power - credits_5000 */}
                                <PlanCard
                                    title="Power"
                                    amount="$9.99"
                                    credits="5,000 credits"
                                    sub="~10,000 chats"
                                    features={['For heavy users', 'Max efficiency']}
                                    onClick={() => handleCheckout('credits_5000')}
                                    loading={loadingProduct === 'credits_5000'}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl p-1 border border-amber-500/20">
                            <div className="flex flex-col md:flex-row gap-8 p-6 items-center">
                                <div className="flex-1 space-y-6">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Become a Pro User</h3>
                                        <p className="text-amber-200/80">Unlock the full potential of NexMap with a one-time purchase.</p>
                                    </div>
                                    <ul className="space-y-3">
                                        <li className="flex gap-3 text-slate-300 text-sm">
                                            <Check className="text-amber-500 shrink-0" size={18} />
                                            <span>Bring Your Own Key (OpenAI, Anthropic, Google)</span>
                                        </li>
                                        <li className="flex gap-3 text-slate-300 text-sm">
                                            <Check className="text-amber-500 shrink-0" size={18} />
                                            <span>Unlimited usage (pay providers directly)</span>
                                        </li>
                                        <li className="flex gap-3 text-slate-300 text-sm">
                                            <Check className="text-amber-500 shrink-0" size={18} />
                                            <span>Access to GPT-4, Claude 3 Opus, Gemini Pro</span>
                                        </li>
                                        <li className="flex gap-3 text-slate-300 text-sm">
                                            <Check className="text-amber-500 shrink-0" size={18} />
                                            <span>Lifetime updates & Early access</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="w-full md:w-auto min-w-[200px] text-center bg-black/20 p-6 rounded-xl border border-white/5">
                                    <div className="text-sm text-slate-400 mb-1">One-time payment</div>
                                    <div className="text-4xl font-bold text-white mb-6">$10.00</div>
                                    <button
                                        onClick={() => handleCheckout('pro_lifetime')}
                                        disabled={loadingProduct === 'pro_lifetime'}
                                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {loadingProduct === 'pro_lifetime' ? 'Processing...' : 'Upgrade Now'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white/5 border-t border-white/5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <ShieldCheck size={14} />
                    Secured by Stripe. 100% Secure Payment.
                </div>
            </div>
        </div>
    );
};

const PlanCard = ({ title, amount, credits, sub, popular, features, onClick, loading }) => (
    <div className={`relative p-5 rounded-2xl border flex flex-col items-center text-center transition-all cursor-pointer group hover:-translate-y-1 ${popular ? 'bg-indigo-600/10 border-indigo-500/50 hover:bg-indigo-600/20 shadow-lg shadow-indigo-500/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={onClick}>
        {popular && (
            <div className="absolute -top-3 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
                Recommended
            </div>
        )}
        <div className="text-slate-400 font-medium mb-1">{title}</div>
        <div className="text-2xl font-bold text-white mb-1">{amount}</div>
        <div className="text-indigo-300 font-bold mb-1">{credits}</div>
        <div className="text-slate-500 text-xs mb-4">{sub}</div>

        <div className="space-y-2 mb-6 w-full">
            {features.map((f, i) => (
                <div key={i} className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <Check size={12} className={popular ? "text-indigo-400" : "text-slate-500"} />
                    {f}
                </div>
            ))}
        </div>

        <button disabled={loading} className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${popular ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {loading ? '...' : 'Buy'}
        </button>
    </div>
);

export default PaymentModal;
