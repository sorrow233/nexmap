import React from 'react';
import { X, Lock, Trophy } from 'lucide-react';
import { createPortal } from 'react-dom';

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

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content - Neural Clay Style */}
            <div className="relative w-full max-w-4xl bg-[#f8fafc] rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">

                {/* Header */}
                <div className="p-8 flex items-center justify-between border-b border-slate-200/60 bg-white/50 backdrop-blur-md sticky top-0 z-20">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center">
                                <Trophy size={20} />
                            </span>
                            Cosmic Journey
                        </h2>
                        <p className="text-slate-500 font-medium ml-14">
                            Your evolution from dust to star.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-white shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] text-slate-400 hover:text-slate-800 flex items-center justify-center transition-transform hover:scale-105"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-8 space-y-8 bg-[#f8fafc]">

                    {/* Grid of Planets */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {tiers.map((tier, index) => {
                            const isUnlocked = index <= currentIndex;
                            const isCurrent = index === currentIndex;
                            const isNext = index === currentIndex + 1;

                            // Locked logic: If it's far future (more than 1 step away), hide details? 
                            // User asked to "leave some suspense". 
                            // So: Unlocked = Full. Next = Locked but visible name. Future = "???"
                            const isMystery = index > currentIndex + 1;

                            return (
                                <div
                                    key={tier.name}
                                    className={`
                                        relative p-6 rounded-[2rem] min-h-[280px] flex flex-col items-center justify-between text-center group
                                        transition-all duration-500
                                        ${isUnlocked
                                            ? 'bg-white shadow-[10px_10px_30px_#e2e8f0,-10px_-10px_30px_#ffffff] ring-2 ring-indigo-50'
                                            : 'bg-slate-100 shadow-inner opacity-80 grayscale'}
                                        ${isCurrent ? 'ring-2 ring-indigo-400 scale-[1.03] shadow-[0_20px_40px_rgba(99,102,241,0.15)]' : ''}
                                    `}
                                >
                                    {/* Locked Overlay */}
                                    {!isUnlocked && (
                                        <div className="absolute top-4 right-4 text-slate-300">
                                            <Lock size={20} />
                                        </div>
                                    )}

                                    {/* Planet Visual */}
                                    <div className="relative w-32 h-32 my-4 flex items-center justify-center">
                                        <div className={`
                                            w-28 h-28 rounded-full shadow-inner flex items-center justify-center
                                            bg-gradient-to-br ${tier.gradient}
                                            ${!isUnlocked ? 'opacity-50 blur-[1px]' : ''}
                                            transition-transform duration-700 group-hover:scale-110
                                        `}>
                                            <div className="absolute inset-0 rounded-full opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="space-y-2 relative z-10 w-full">
                                        <h3 className={`text-xl font-black tracking-tight ${isUnlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {isMystery ? '???' : tier.name}
                                        </h3>

                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {isUnlocked ? 'Unlocked' : isMystery ? 'Unknown' : 'Locked'}
                                        </p>

                                        {/* Progress Bar for Current only */}
                                        {isCurrent && (
                                            <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                                                <div
                                                    className={`h-full bg-${tier.color}-400 rounded-full animate-pulse`}
                                                    style={{ width: '100%' }} // Represents completed tier
                                                ></div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Current Badge */}
                                    {isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-indigo-200">
                                            Current Phase
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Message */}
                <div className="p-6 bg-slate-50 text-center text-slate-400 text-sm font-medium">
                    Keep creating to create new worlds.
                </div>
            </div>
        </div>,
        document.body
    );
}
