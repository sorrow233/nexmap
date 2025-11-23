import React from 'react';
import { X, Lock, Trophy, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Achievement Modal - "The Cosmic Journey"
 * Features 3D Planet Rendering (CSS) matching the Dashboard.
 */
export default function AchievementModal({
    isOpen,
    onClose,
    currentTierName,
    currentTotal,
    tiers
}) {
    if (!isOpen) return null;

    // Determine current index
    const currentIndex = tiers.findIndex(t => t.name === currentTierName);

    // Format helper
    const fmt = (n) => n?.toLocaleString() || '0';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with heavy blur for focus */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-500"
                onClick={onClose}
            />

            {/* Modal Content - Neural Clay Style */}
            <div className="relative w-full max-w-5xl bg-[#f8fafc] rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5 zoom-in-95 duration-500">

                {/* Header with Glassmorphism */}
                <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-30">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]">
                                <Trophy size={24} className="drop-shadow-sm" />
                            </span>
                            Cosmic Journey
                        </h2>
                        <p className="text-slate-500 font-medium ml-[60px] flex items-center gap-2">
                            Your evolution from Moon dust to Stellar glory.
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                {fmt(currentTotal)} Tokens
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-white shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-8 space-y-12 bg-[#f8fafc] pb-24">

                    {/* Grid of Planets */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {tiers.map((tier, index) => {
                            const isUnlocked = index <= currentIndex;
                            const isCurrent = index === currentIndex;
                            const isNext = index === currentIndex + 1;
                            const isMystery = index > currentIndex + 1;

                            return (
                                <div
                                    key={tier.name}
                                    className={`
                                        relative p-6 pt-12 rounded-[2.5rem] min-h-[340px] flex flex-col items-center justify-between text-center group
                                        transition-all duration-700 ease-out
                                        ${isUnlocked
                                            ? 'bg-white shadow-[20px_20px_60px_#e2e8f0,-20px_-20px_60px_#ffffff] scale-100'
                                            : 'bg-slate-100/50 shadow-none scale-95 opacity-80'}
                                        ${isCurrent ? 'ring-4 ring-indigo-100 scale-[1.05] z-10' : ''}
                                    `}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Locked Overlay (Fog of War) */}
                                    {(!isUnlocked && !isNext) && (
                                        <div className="absolute inset-x-0 top-0 bottom-1/2 bg-gradient-to-b from-slate-200/50 to-transparent z-10 backdrop-blur-[2px] rounded-t-[2.5rem] flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-400 backdrop-blur-md shadow-sm">
                                                <Lock size={20} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Planet Visual (CSS 3D High Fidelity) */}
                                    <div className="relative w-36 h-36 flex items-center justify-center perspective-[1000px]">
                                        <div className={`
                                            absolute inset-0 rounded-full
                                            bg-gradient-to-br ${tier.gradient}
                                            shadow-[inset_-16px_-16px_40px_rgba(0,0,0,0.2),_inset_10px_10px_40px_rgba(255,255,255,0.6),_0_20px_40px_rgba(0,0,0,0.1)]
                                            transition-all duration-1000 ease-in-out
                                            ${!isUnlocked
                                                ? 'grayscale opacity-60 scale-90 blur-[1px]'
                                                : 'group-hover:scale-110 group-hover:rotate-6'}
                                            ${tier.name === 'Sun' ? 'animate-pulse-slow shadow-amber-200' : ''}
                                        `}>
                                            {/* Texture */}
                                            <div className="absolute inset-0 rounded-full opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>

                                            {/* Atmosphere Glow for Gas/Ice Giants */}
                                            {['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Sun'].includes(tier.name) && isUnlocked && (
                                                <div className={`absolute -inset-4 rounded-full blur-xl opacity-20 bg-${tier.color}-400 transition-opacity duration-700 group-hover:opacity-40`}></div>
                                            )}
                                        </div>

                                        {/* Saturn Ring (Stylized) */}
                                        {tier.name === 'Saturn' && (
                                            <div className="absolute w-[160%] h-[40%] border-[8px] border-yellow-200/60 rounded-[100%] rotate-[-15deg] shadow-sm pointer-events-none"></div>
                                        )}
                                    </div>

                                    {/* Info Block */}
                                    <div className="space-y-3 relative z-10 w-full mt-6">

                                        {/* Name */}
                                        <h3 className={`text-2xl font-black tracking-tight ${isUnlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {isMystery ? '???' : tier.name}
                                        </h3>

                                        {/* Lore (Flavor Text) */}
                                        <p className="text-xs font-medium text-slate-400 px-2 min-h-[2.5em] leading-relaxed">
                                            {isMystery
                                                ? "A mystery waiting in the cosmic dark."
                                                : tier.lore || "A new world awaits your discovery."}
                                        </p>

                                        {/* Status / Requirements */}
                                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isUnlocked ? 'text-' + tier.color + '-500' : 'text-slate-300'}`}>
                                                {isUnlocked ? 'Unlocked' : 'Requires'}
                                            </span>

                                            <span className={`text-sm font-black ${isUnlocked ? 'text-slate-800' : 'text-slate-300 font-mono'}`}>
                                                {isMystery ? '???,???' : fmt(tier.limit)}
                                            </span>
                                        </div>

                                        {/* Progress Bar for Current/Next */}
                                        {(isCurrent || isNext) && (
                                            <div className="w-full h-3 bg-slate-100 rounded-full mt-4 overflow-hidden shadow-inner relative">
                                                <div
                                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${isCurrent ? 'bg-' + tier.color + '-400' : 'bg-slate-300'}`}
                                                    style={{
                                                        width: isCurrent
                                                            ? '100%' // Current is completed tier
                                                            : `${Math.min(100, Math.max(0, (currentTotal / tier.limit) * 100))}%` // Next shows progress towards it
                                                    }}
                                                ></div>
                                                {/* Stripes for texture */}
                                                <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,#000_4px,#000_8px)]"></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Current Badge */}
                                    {isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-indigo-200 flex items-center gap-1">
                                            <Sparkles size={10} /> Current
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-white via-white/90 to-transparent text-center">
                    <p className="text-slate-400 text-sm font-medium italic">
                        "Every token is a spark. Every spark builds a star."
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
