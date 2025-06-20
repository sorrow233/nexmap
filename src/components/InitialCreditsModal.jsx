import React from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * InitialCreditsModal
 * 
 * A premium-styled modal to welcome users and inform them about their initial credits.
 */
export default function InitialCreditsModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden transform transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-2">

                {/* Decorative Header Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 opacity-10 dark:opacity-20" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
                <div className="absolute top-10 -left-10 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors z-10"
                >
                    <X size={18} className="text-slate-500 dark:text-slate-400" />
                </button>

                <div className="relative p-8 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
                        <Sparkles size={32} className="text-white" />
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 mb-2">
                        无需配置，即刻出发
                    </h2>

                    {/* Divider */}
                    <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6 opacity-50" />

                    {/* Main Content */}
                    <div className="space-y-4 mb-8">
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                            初始额度可进行约 <span className="font-bold text-blue-600 dark:text-blue-400">10 万+</span> 次对话
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            你无需配置一切，我已为你想好一切。<br />
                            请立即开始你的卡片之旅。
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="group relative w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 text-base"
                    >
                        <span className="flex items-center justify-center gap-2">
                            开始探索
                            <CheckCircle2 size={18} className="opacity-80 group-hover:scale-110 transition-transform" />
                        </span>
                    </button>

                    <p className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Powered by DeepSeek V3
                    </p>
                </div>
            </div>
        </div>
    );
}
