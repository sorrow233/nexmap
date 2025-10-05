import React, { useState } from 'react';
import { X, CheckCircle, Copy, Check, Mail, Package, CreditCard } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const SUPPORT_EMAIL = 'support.nexmap@catzz.work';

const PaymentSuccessModal = ({ isOpen, onClose, orderDetails }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    if (!isOpen || !orderDetails) return null;

    const handleCopyOrderId = async () => {
        try {
            await navigator.clipboard.writeText(orderDetails.orderId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const formatAmount = (cents, currency) => {
        const amount = (cents / 100).toFixed(2);
        return `${currency === 'USD' ? '$' : currency} ${amount}`;
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const getProductName = () => {
        const productNames = {
            'credits_500': t.pricing?.starter || 'Starter Pack (600)',
            'credits_2000': t.pricing?.standard || 'Standard Pack (3,000)',
            'credits_5000': t.pricing?.power || 'Power Pack (9,000)',
            'pro_lifetime': t.pricing?.proLifetime || 'Pro Lifetime'
        };
        return productNames[orderDetails.productId] || orderDetails.productId;
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#0F0F12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                {/* Success Header */}
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-emerald-500/20 to-transparent border-b border-white/5">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                        <CheckCircle className="text-emerald-400" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {t.payment?.successTitle || 'Payment Successful!'}
                    </h2>
                    <p className="text-slate-400 text-sm text-center">
                        {t.payment?.successDesc || 'Thank you for your purchase. Your credits have been added.'}
                    </p>
                </div>

                {/* Order Details */}
                <div className="p-6 space-y-4">
                    {/* Order ID with Copy Button */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                                {t.payment?.orderNumber || 'Order Number'}
                            </span>
                            <button
                                onClick={handleCopyOrderId}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check size={12} className="text-emerald-400" />
                                        <span className="text-emerald-400">{t.payment?.copied || 'Copied!'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        <span>{t.payment?.copy || 'Copy'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="text-xl font-mono font-bold text-white tracking-wider">
                            {orderDetails.orderId}
                        </div>
                    </div>

                    {/* Product & Amount */}
                    <div className="flex gap-3">
                        <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                <Package size={12} />
                                {t.payment?.product || 'Product'}
                            </div>
                            <div className="text-white font-semibold text-sm">
                                {getProductName()}
                            </div>
                        </div>
                        <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                <CreditCard size={12} />
                                {t.payment?.amount || 'Amount'}
                            </div>
                            <div className="text-white font-semibold text-sm">
                                {formatAmount(orderDetails.amount, orderDetails.currency)}
                            </div>
                        </div>
                    </div>

                    {/* Credits Added (if applicable) */}
                    {orderDetails.credits && (
                        <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20 text-center">
                            <div className="text-indigo-300 text-sm">
                                {t.payment?.creditsAdded || 'Credits Added'}
                            </div>
                            <div className="text-2xl font-bold text-indigo-400">
                                +{orderDetails.credits.toLocaleString()}
                            </div>
                        </div>
                    )}

                    {/* Pro Status (if applicable) */}
                    {orderDetails.isPro && (
                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20 text-center">
                            <div className="text-amber-300 text-sm">
                                {t.payment?.proUnlocked || 'Pro Status Unlocked!'}
                            </div>
                            <div className="text-xl font-bold text-amber-400">
                                🎉 {t.payment?.welcomePro || 'Welcome to Pro!'}
                            </div>
                        </div>
                    )}

                    {/* Date */}
                    <div className="text-center text-xs text-slate-500">
                        {formatDate(orderDetails.createdAt)}
                    </div>
                </div>

                {/* Contact Support */}
                <div className="p-4 bg-white/5 border-t border-white/5">
                    <div className="text-center">
                        <p className="text-xs text-slate-400 mb-2">
                            {t.payment?.contactSupport || 'Questions? Contact us:'}
                        </p>
                        <a
                            href={`mailto:${SUPPORT_EMAIL}?subject=Order ${orderDetails.orderId}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-indigo-400 text-sm font-medium transition-colors"
                        >
                            <Mail size={14} />
                            {SUPPORT_EMAIL}
                        </a>
                    </div>
                </div>

                {/* Close Button */}
                <div className="p-4 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        {t.common?.close || 'Close'}
                    </button>
                </div>

                {/* X Button in corner */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccessModal;
