import React, { useState, useEffect } from 'react';
import { X, Lock, Trophy, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * Achievement Modal - "The Cosmic Journey" (Carousel Mode)
 * Features an immersive, single-view carousel with keyboard navigation.
 */
export default function AchievementModal({
    isOpen,
    onClose,
    currentTierName,
    currentTotal,
    tiers
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [justOpened, setJustOpened] = useState(false);

    // Determine current user tier index
    const currentUserIndex = tiers.findIndex(t => t.name === currentTierName);

    // Initialize active index to current user tier when opening
    useEffect(() => {
        if (isOpen) {
            setActiveIndex(currentUserIndex !== -1 ? currentUserIndex : 0);
            setJustOpened(true);
            // Reset justOpened after animation
            const timer = setTimeout(() => setJustOpened(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, currentUserIndex]);

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeIndex]);

    if (!isOpen) return null;

    // Navigation Handlers
    const handlePrev = () => {
        setActiveIndex(prev => Math.max(0, prev - 1));
    };
    const handleNext = () => {
        setActiveIndex(prev => Math.min(tiers.length - 1, prev + 1));
    };

    // Current Tier Data
    const tier = tiers[activeIndex];
    const isUnlocked = activeIndex <= currentUserIndex;
    const isCurrent = activeIndex === currentUserIndex;
    const isNext = activeIndex === currentUserIndex + 1;
    const isMystery = activeIndex > currentUserIndex + 1;

    // Format helper
    const fmt = (n) => n?.toLocaleString() || '0';

    // Dynamic Background Colors based on Tier Color
    const bgColors = {
        slate: 'bg-slate-50',
        orange: 'bg-orange-50',
        emerald: 'bg-emerald-50',
        amber: 'bg-amber-50',
        yellow: 'bg-yellow-50',
        cyan: 'bg-cyan-50',
        indigo: 'bg-indigo-50'
    };
    const activeBgParams = bgColors[tier.color] || 'bg-slate-50';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity duration-500"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className={`relative w-full max-w-4xl ${activeBgParams} transition-colors duration-700 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col h-[85vh] max-h-[800px] animate-in slide-in-from-bottom-5 zoom-in-95`}>

                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between z-20">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <span className="w-12 h-12 rounded-2xl bg-white text-amber-500 flex items-center justify-center shadow-sm">
                                <Trophy size={24} className="drop-shadow-sm" />
                            </span>
                            Cosmic Journey
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-white shadow-md text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Main Carousel Content */}
                <div className="flex-1 relative flex items-center justify-between px-4 sm:px-12 z-10">

                    {/* Prev Button */}
                    <button
                        onClick={handlePrev}
                        disabled={activeIndex === 0}
                        className={`
                            w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-600 transition-all duration-300
                            ${activeIndex === 0 ? 'opacity-30 cursor-not-allowed scale-90' : 'hover:scale-110 hover:text-indigo-600 active:scale-95'}
                        `}
                    >
                        <ChevronLeft size={32} />
                    </button>

                    {/* Active Planet Card (Hero) */}
                    <div className="flex-1 max-w-lg mx-auto flex flex-col items-center">

                        {/* 3D Planet Container */}
                        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center perspective-[1000px] mb-8 group">

                            {/* Locked State Overlay */}
                            {(!isUnlocked && !isNext) && (
                                <div className="absolute inset-x-0 top-0 bottom-1/2 bg-gradient-to-b from-slate-200/60 to-transparent z-20 backdrop-blur-[4px] rounded-t-full flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center text-slate-400 backdrop-blur-md shadow-lg animate-bounce-slow">
                                        <Lock size={28} />
                                    </div>
                                </div>
                            )}

                            {/* The Planet */}
                            <div key={tier.name} className={`
                                absolute inset-0 rounded-full
                                bg-gradient-to-br ${tier.gradient}
                                shadow-[inset_-30px_-30px_80px_rgba(0,0,0,0.3),_inset_30px_30px_80px_rgba(255,255,255,0.7),_0_40px_100px_rgba(0,0,0,0.2)]
                                transition-all duration-700 ease-in-out
                                animate-in zoom-in-50 spin-in-120
                                ${!isUnlocked ? 'grayscale opacity-60 blur-[1px] scale-95' : 'scale-100'}
                                ${tier.name === 'Sun' ? 'animate-pulse-slow shadow-amber-200' : ''}
                            `}>
                                {/* Animated Texture */}
                                <div className="absolute inset-[-50%] opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay animate-[spin_120s_linear_infinite]"></div>

                                {/* Ring for Saturn */}
                                {tier.name === 'Saturn' && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[40%] border-[16px] border-yellow-100/40 rounded-[100%] rotate-[-15deg] shadow-lg pointer-events-none"></div>
                                )}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="text-center space-y-4 max-w-md animate-in slide-in-from-bottom-4 fade-in duration-500 key={activeIndex}">

                            {/* Tier Name */}
                            <h1 className="text-5xl font-black text-slate-800 tracking-tighter">
                                {isMystery ? '???' : tier.name}
                            </h1>

                            {/* Status Badge */}
                            <div className="flex justify-center">
                                {isCurrent ? (
                                    <span className="px-4 py-1.5 bg-indigo-500 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center gap-2">
                                        <Sparkles size={12} fill="currentColor" /> Current Phase
                                    </span>
                                ) : isUnlocked ? (
                                    <span className="px-4 py-1.5 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-widest">
                                        Unlocked
                                    </span>
                                ) : (
                                    <span className="px-4 py-1.5 bg-slate-200 text-slate-500 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Lock size={12} /> Locked
                                    </span>
                                )}
                            </div>

                            {/* Lore */}
                            <p className="text-lg font-medium text-slate-500 leading-relaxed min-h-[3.5em]">
                                {isMystery
                                    ? "This cosmic mystery lies beyond your current horizon. Continue your journey to unveil it."
                                    : tier.lore}
                            </p>

                            {/* Requirements / Progress */}
                            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-md">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {(isUnlocked || isNext) ? 'Progress' : 'Requirement'}
                                    </span>
                                    <span className="text-xl font-black text-slate-800 tabular-nums">
                                        {isMystery ? '???,???' : fmt(tier.limit)} <span className="text-xs font-bold text-slate-400 align-middle">TOKENS</span>
                                    </span>
                                </div>

                                {/* Progress Bar Logic */}
                                <div className="h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner relative">
                                    <div
                                        className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${isCurrent ? 'bg-indigo-500' : activeIndex < currentUserIndex ? 'bg-emerald-400' : 'bg-slate-300'}`}
                                        style={{
                                            width: activeIndex < currentUserIndex
                                                ? '100%'
                                                : isCurrent
                                                    ? '100%'
                                                    : isNext
                                                        ? `${Math.min(100, (currentTotal / tier.limit) * 100)}%`
                                                        : '0%'
                                        }}
                                    ></div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={handleNext}
                        disabled={activeIndex === tiers.length - 1}
                        className={`
                            w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-600 transition-all duration-300
                            ${activeIndex === tiers.length - 1 ? 'opacity-30 cursor-not-allowed scale-90' : 'hover:scale-110 hover:text-indigo-600 active:scale-95'}
                        `}
                    >
                        <ChevronRight size={32} />
                    </button>
                </div>

                {/* Footer Dots */}
                <div className="pb-10 flex justify-center gap-3 z-20">
                    {tiers.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            className={`
                                h-2.5 rounded-full transition-all duration-300 
                                ${i === activeIndex
                                    ? `w-8 bg-${tier.color}-500`
                                    : 'w-2.5 bg-slate-300 hover:bg-slate-400'}
                            `}
                        />
                    ))}
                </div>

                {/* Background Decor */}
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/40 blur-[100px] pointer-events-none mix-blend-overlay"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/30 blur-[80px] pointer-events-none mix-blend-overlay"></div>
            </div>
        </div>,
        document.body
    );
}
