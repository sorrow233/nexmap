import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Sparkles, Zap, ArrowRight, Check, Shield, Infinity } from 'lucide-react';
import SEO from '../components/SEO';

/**
 * FreeTrialPage - A dedicated page showing free trial credits
 * Tells users they don't need to configure anything, just start using
 */
export default function FreeTrialPage() {
    const navigate = useNavigate();

    const handleStart = () => {
        navigate('/gallery');
    };

    return (
        <div className="min-h-screen bg-mesh-gradient flex items-center justify-center p-4 overflow-hidden relative">
            <SEO title="Free Trial" description="Get 100 free credits to use DeepSeek V3 AI model instantly. No configuration required." />
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-orange-400/5 to-yellow-400/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-2xl w-full">
                {/* Main Card */}
                <div className="glass-card rounded-3xl p-8 md:p-12 text-center animate-fade-in-up">
                    {/* Gift Icon with Glow */}
                    <div className="relative inline-block mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30 animate-pulse" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl">
                            <Gift size={40} className="text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
                            <Sparkles size={16} className="text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl md:text-4xl font-black mb-4 text-slate-800 dark:text-white">
                        <span className="text-gradient">✨ 免费试用积分</span>
                    </h1>

                    {/* Credits Display */}
                    <div className="my-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-slate-400 text-sm font-medium">可用额度</span>
                            <span className="text-2xl font-black text-white">
                                100.0 <span className="text-slate-400 text-lg font-bold">/ 100</span>
                            </span>
                        </div>
                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-1000"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <p className="text-slate-400 text-sm mt-3">
                            使用 <span className="text-cyan-400 font-bold">DeepSeek V3</span> 模型，约可进行 <span className="text-emerald-400 font-bold">10 万+</span> 次对话
                        </p>
                    </div>

                    {/* Key Message */}
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-bold mb-4">
                            <Shield size={16} />
                            零配置，开箱即用
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                            你无需配置一切
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg">
                            我已为你想好一切。
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="grid gap-4 mb-8 text-left">
                        <div className="flex items-center gap-3 p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-white/60 dark:border-white/10">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Check size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white">无需 API Key</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">已为你预配置好一切</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-white/60 dark:border-white/10">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Zap size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white">即刻开始</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">没有注册、等待或审核流程</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-white/60 dark:border-white/10">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Infinity size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white">海量对话</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">100 积分 ≈ 10 万+ 次超强 AI 对话</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={handleStart}
                        className="w-full py-4 px-8 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white text-lg font-bold rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 group"
                    >
                        请立即开始你的卡片之旅
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Subtext */}
                    <p className="mt-4 text-slate-400 text-sm">
                        点击即可直接进入应用，什么都不用做 ✨
                    </p>
                </div>

                {/* Bottom Decorative Text */}
                <div className="text-center mt-8 text-slate-400 dark:text-slate-500 text-sm animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <span className="opacity-60">Powered by</span>{' '}
                    <span className="font-bold text-gradient">NexMap</span>
                </div>
            </div>
        </div>
    );
}
