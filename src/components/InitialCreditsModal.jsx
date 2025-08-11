import React from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * InitialCreditsModal
 * 
 * A premium-styled modal to welcome users and inform them about their initial credits.
 * Dark theme with purple gradient design.
 */
export default function InitialCreditsModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content - Dark Theme */}
            <div className="relative w-full max-w-md overflow-hidden transform transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-2">
                {/* Main Card */}
                <div className="relative bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-3xl shadow-2xl border border-white/10">

                    {/* Decorative Background Gradients */}
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-transparent" />
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
                    <div className="absolute top-20 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-2xl" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                    >
                        <X size={18} className="text-slate-400" />
                    </button>

                    <div className="relative p-8 flex flex-col items-center text-center">
                        {/* Icon - Sparkle with plus signs */}
                        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 shadow-2xl shadow-purple-500/30 relative">
                            <Sparkles size={36} className="text-white" />
                            {/* Plus decorations */}
                            <div className="absolute -top-1 -right-1 text-white/80 text-xs font-bold">+</div>
                            <div className="absolute -bottom-1 -left-1 text-white/80 text-xs font-bold">+</div>
                            <div className="absolute top-1 left-0 text-white/60 text-[10px] font-bold">+</div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white mb-2">
                            无需配置，即刻出发
                        </h2>

                        {/* Divider */}
                        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-slate-500 to-transparent rounded-full mb-6" />

                        {/* Main Content */}
                        <div className="space-y-4 mb-8">
                            <p className="text-slate-300 leading-relaxed text-lg">
                                初始额度可进行约 <span className="font-bold text-indigo-400">10 万+</span> 次对话
                            </p>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                你无需配置一切，我已为你想好一切。<br />
                                请立即开始你的卡片之旅。
                            </p>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={onClose}
                            className="group relative w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white font-semibold shadow-xl shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:-translate-y-0.5 active:translate-y-0 text-base"
                        >
                            <span className="flex items-center justify-center gap-2">
                                开始探索
                                <CheckCircle2 size={18} className="opacity-80 group-hover:scale-110 transition-transform" />
                            </span>
                        </button>

                        <p className="mt-5 text-[10px] text-slate-600 uppercase tracking-[0.2em]">
                            Powered by DeepSeek V3
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
