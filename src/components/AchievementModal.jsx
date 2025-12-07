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
    tiers,
    t
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

    // Dynamic Planet Textures (Ethereal / Abstract / Dreamy)
    const getPlanetTexture = (planetName) => {
        const id = (planetName || '').toLowerCase();

        // Common "Atmosphere" glow for all
        const atmosphere = <div className="absolute inset-0 rounded-full shadow-[inset_0_0_80px_rgba(255,255,255,0.2)] mix-blend-overlay pointer-events-none"></div>;

        switch (id) {
            case 'mercury':
                // Silver Mist & Pale Violet - The Forge, but dreamy
                return {
                    background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                    shadow: 'shadow-[0_0_100px_rgba(203,213,225,0.4)]',
                    detail: (
                        <>
                            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-200/40 blur-[60px] rounded-full mix-blend-multiply animate-pulse-slow"></div>
                            <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-slate-400/30 blur-[50px] rounded-full"></div>
                            <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-white/60 blur-[40px] rounded-full mix-blend-overlay"></div>
                        </>
                    )
                };
            case 'venus':
                // Liquid Gold & Rose - The Morning Star
                return {
                    background: 'linear-gradient(to bottom right, #fef3c7, #fbbf24)',
                    shadow: 'shadow-[0_0_100px_rgba(251,191,36,0.5)]',
                    detail: (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-tr from-orange-300 via-transparent to-rose-300 opacity-80 mix-blend-overlay"></div>
                            <div className="absolute top-0 right-0 w-[90%] h-[90%] bg-amber-200/50 blur-[70px] rounded-full animate-spin-slow"></div>
                            <div className="absolute bottom-10 left-10 w-[60%] h-[60%] bg-rose-400/30 blur-[60px] rounded-full mix-blend-color-burn"></div>
                        </>
                    )
                };
            case 'terra':
                // Deep Ocean & Aurora - Life
                // NOT a map. A feeling of "Blue" and "Life".
                return {
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                    shadow: 'shadow-[0_0_120px_rgba(59,130,246,0.6)]',
                    detail: (
                        <>
                            <div className="absolute top-[-10%] right-[-20%] w-[80%] h-[80%] bg-teal-300/40 blur-[80px] rounded-full mix-blend-screen animate-pulse-slow"></div>
                            <div className="absolute bottom-[-10%] left-[-10%] w-[90%] h-[90%] bg-indigo-600/50 blur-[70px] rounded-full mix-blend-multiply"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-blue-400/20 to-transparent mix-blend-overlay"></div>
                        </>
                    )
                };
            case 'mars':
                // Rust & Ember - War/Energy
                return {
                    background: 'linear-gradient(to bottom right, #fdba74, #ea580c)',
                    shadow: 'shadow-[0_0_100px_rgba(234,88,12,0.5)]',
                    detail: (
                        <>
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-500/0 via-red-500/20 to-red-900/40 mix-blend-multiply"></div>
                            <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-orange-200/40 blur-[60px] rounded-full mix-blend-overlay"></div>
                            <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-rose-900/30 blur-[50px] rounded-full"></div>
                        </>
                    )
                };
            case 'jupiter':
                // Storms & Bands - Expansion
                // Abstracting the bands into soft horizontal washes
                return {
                    background: 'linear-gradient(180deg, #d97706, #b45309, #92400e)',
                    shadow: 'shadow-[0_0_110px_rgba(217,119,6,0.5)]',
                    detail: (
                        <>
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,rgba(0,0,0,0.1)_60px)] blur-[10px] mix-blend-multiply"></div>
                            <div className="absolute top-[20%] left-[-20%] w-[100%] h-[60%] bg-amber-200/30 blur-[80px] rounded-full mix-blend-overlay"></div>
                            <div className="absolute bottom-[20%] right-[-20%] w-[80%] h-[50%] bg-red-900/20 blur-[60px] rounded-full mix-blend-color-burn"></div>
                        </>
                    )
                };
            case 'saturn':
                // Pale Gold & Rings - Structure
                return {
                    background: 'linear-gradient(to bottom right, #fef08a, #eab308)',
                    shadow: 'shadow-[0_0_100px_rgba(234,179,8,0.4)]',
                    detail: (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-200/0 via-yellow-100/40 to-white/60 mix-blend-overlay"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-orange-300/20 blur-[50px] rounded-full"></div>
                        </>
                    )
                };
            case 'uranus':
                // Cyan Ice - Revolution
                return {
                    background: 'linear-gradient(135deg, #a5f3fc, #0891b2)',
                    shadow: 'shadow-[0_0_110px_rgba(34,211,238,0.5)]',
                    detail: (
                        <>
                            <div className="absolute inset-0 bg-white/20 blur-[40px] mix-blend-overlay"></div>
                            <div className="absolute top-[-30%] left-0 w-[120%] h-[120%] bg-sky-200/30 blur-[80px] rounded-full mix-blend-soft-light animate-pulse-slow"></div>
                        </>
                    )
                };
            case 'neptune':
                // Deep Indigo Dream - Mysticism
                return {
                    background: 'linear-gradient(to bottom right, #6366f1, #312e81)',
                    shadow: 'shadow-[0_0_120px_rgba(79,70,229,0.6)]',
                    detail: (
                        <>
                            <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-purple-500/30 blur-[70px] rounded-full mix-blend-screen"></div>
                            <div className="absolute bottom-0 left-0 w-[70%] h-[70%] bg-blue-900/60 blur-[60px] rounded-full mix-blend-multiply"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-indigo-300/20 mix-blend-overlay"></div>
                        </>
                    )
                };
            case 'sun':
                // The Source - Pure Light
                return {
                    background: 'radial-gradient(circle at 40% 40%, #fff7ed, #f59e0b, #ea580c)',
                    shadow: 'shadow-[0_0_150px_rgba(251,146,60,0.8)]',
                    detail: (
                        <>
                            <div className="absolute inset-[-20%] bg-orange-400/30 blur-[80px] animate-pulse-slow mix-blend-screen"></div>
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-white/60 blur-[50px] rounded-full mix-blend-soft-light"></div>
                        </>
                    )
                };
            default:
                return { background: `bg-gradient-to-br ${tier.gradient}`, shadow: 'shadow-lg' };
        }
    };

    const texture = getPlanetTexture(tier.id || tier.name);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl transition-opacity duration-700"
                onClick={onClose}
            />

            {/* Modal Container - "Zen Mode" (No borders, floating content) */}
            <div className={`relative w-full max-w-5xl ${activeBgParams} transition-colors duration-1000 rounded-[3rem] overflow-hidden flex flex-col h-[90vh] max-h-[900px] animate-in slide-in-from-bottom-5 zoom-in-95 shadow-2xl`}>

                {/* Header - Minimalist */}
                <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-30">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 opacity-80">
                        {t?.stats?.planets?.currentPhase?.toUpperCase() || 'COSMIC JOURNEY'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-md hover:bg-white text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all duration-300"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Carousel Content */}
                <div className="flex-1 relative flex items-center justify-center z-10">

                    {/* Navigation - Minimalist Floating Arrows */}
                    <button
                        onClick={handlePrev}
                        disabled={activeIndex === 0}
                        className={`absolute left-4 sm:left-12 z-20 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${activeIndex === 0 ? 'opacity-0 scale-75 cursor-not-allowed' : 'opacity-40 hover:opacity-100 hover:bg-white/30 text-slate-800'}`}
                    >
                        <ChevronLeft size={40} strokeWidth={1.5} />
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={activeIndex === tiers.length - 1}
                        className={`absolute right-4 sm:right-12 z-20 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${activeIndex === tiers.length - 1 ? 'opacity-0 scale-75 cursor-not-allowed' : 'opacity-40 hover:opacity-100 hover:bg-white/30 text-slate-800'}`}
                    >
                        <ChevronRight size={40} strokeWidth={1.5} />
                    </button>

                    {/* Active Planet Core */}
                    <div className="flex flex-col items-center justify-center w-full max-w-2xl px-4">

                        {/* 3D Planet Render */}
                        <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center perspective-[1000px] mb-12 group transition-transform duration-700 ease-out hover:scale-105">

                            {/* Texture Layer */}
                            <div className={`
                                absolute inset-0 rounded-full
                                transition-all duration-1000 ease-in-out
                                ${texture.shadow}
                            `}
                                style={{ background: texture.background }}
                            >
                                {/* Noise/Overlay */}
                                {texture.overlay && <div className={`absolute inset-0 ${texture.overlay}`}></div>}
                                {/* Procedural Details (Clouds, Bands, Spots) */}
                                {texture.detail}

                                {/* Saturn Ring Special Case */}
                                {(tier.id === 'saturn' || tier.name === 'Saturn') && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220%] h-[50%] border-[24px] border-[#fde047]/30 rounded-[100%] rotate-[-12deg] shadow-xl pointer-events-none mix-blend-plus-lighter blur-[1px]"></div>
                                )}
                            </div>

                            {/* Locked State "Fog" */}
                            {(!isUnlocked && !isNext) && (
                                <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-sm rounded-full z-20 flex items-center justify-center transition-all duration-500">
                                    <Lock size={48} className="text-slate-400 opacity-50" />
                                </div>
                            )}
                        </div>

                        {/* Typography & Info - Zen Layout */}
                        <div className="text-center space-y-2 animate-in slide-in-from-bottom-8 fade-in duration-700 key={activeIndex} max-w-lg">

                            {/* Tier Name */}
                            <h1 className="text-6xl sm:text-7xl font-black text-slate-800 tracking-tighter mix-blend-multiply opacity-90">
                                {isMystery ? '???' : tier.name}
                            </h1>

                            {/* Status Pill - Minimal */}
                            <div className="h-8 flex justify-center items-center">
                                {isCurrent ? (
                                    <span className="text-indigo-600 text-sm font-bold tracking-widest uppercase flex items-center gap-2 animate-pulse-slow">
                                        <Sparkles size={14} /> {t?.stats?.planets?.currentPhase || 'Current Phase'}
                                    </span>
                                ) : !isUnlocked ? (
                                    <span className="text-slate-400 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                                        <Lock size={14} /> {t?.stats?.planets?.locked || 'Locked'}
                                    </span>
                                ) : null}
                            </div>

                            {/* Lore */}
                            <p className="text-xl font-medium text-slate-500 leading-relaxed font-serif italic pt-4">
                                "{isMystery ? '???' : tier.lore}"
                            </p>

                            {/* Minimal Progress Line */}
                            <div className="pt-10 w-full max-w-xs mx-auto">
                                <div className="flex justify-between items-baseline mb-3 text-xs font-bold text-slate-400 tracking-widest">
                                    <span>PROGRESS</span>
                                    <span>{isMystery ? '???' : fmt(tier.limit)} TOKENS</span>
                                </div>
                                <div className="h-1 bg-slate-200 w-full overflow-hidden rounded-full">
                                    <div
                                        className={`h-full transition-all duration-1000 ${isCurrent ? 'bg-indigo-600' : 'bg-slate-400'}`}
                                        style={{ width: isUnlocked ? '100%' : isNext ? `${Math.min(100, (currentTotal / tier.limit) * 100)}%` : '0%' }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Dots - Minimal */}
                <div className="pb-12 flex justify-center gap-4 z-20">
                    {tiers.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            className={`
                                transition-all duration-500 rounded-full
                                ${i === activeIndex
                                    ? `w-3 h-3 bg-slate-800 scale-125`
                                    : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'}
                            `}
                        />
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
