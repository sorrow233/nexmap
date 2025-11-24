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

    // Dynamic Planet Textures (Pure CSS Procedural Generation)
    const getPlanetTexture = (planetName) => {
        const name = planetName.toLowerCase();

        switch (name) {
            case 'mercury':
                // Craters and grey dust
                return {
                    background: 'radial-gradient(circle at 30% 30%, #e2e8f0 0%, #94a3b8 100%)',
                    overlay: 'bg-[url("https://grainy-gradients.vercel.app/noise.svg")] opacity-40 mix-blend-overlay',
                    shadow: 'shadow-[inset_-20px_-20px_60px_rgba(0,0,0,0.5),_0_0_50px_rgba(148,163,184,0.3)]'
                };
            case 'venus':
                // Thick atmosphere, swirling clouds
                return {
                    background: 'linear-gradient(45deg, #fbbf24 0%, #d97706 100%)',
                    overlay: 'bg-[url("https://grainy-gradients.vercel.app/noise.svg")] opacity-30 mix-blend-soft-light',
                    detail: <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#fff2_25px,transparent_40px)] rotate-[25deg] filter blur-xl scale-150"></div>,
                    shadow: 'shadow-[inset_-25px_-25px_60px_rgba(180,83,9,0.5),_0_0_60px_rgba(251,191,36,0.4)]'
                };
            case 'terra':
                // Earth: Oceans, Land masses (noise), Atmosphere
                return {
                    background: 'radial-gradient(circle at 50% 50%, #3b82f6 0%, #1e3a8a 100%)',
                    overlay: 'bg-[url("https://grainy-gradients.vercel.app/noise.svg")] opacity-20 mix-blend-overlay',
                    detail: (
                        <>
                            {/* Clouds */}
                            <div className="absolute inset-0 opacity-60 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-hard-light filter blur-[2px] animate-[spin_100s_linear_infinite]"></div>
                            {/* Atmosphere Glow */}
                            <div className="absolute inset-[-2px] rounded-full shadow-[inset_0_0_30px_rgba(191,219,254,0.6)]"></div>
                        </>
                    ),
                    shadow: 'shadow-[inset_-20px_-20px_50px_rgba(0,0,0,0.6),_0_0_50px_rgba(59,130,246,0.5)]'
                };
            case 'mars':
                // Red dust, craters
                return {
                    background: 'radial-gradient(circle at 40% 40%, #fdba74 0%, #ea580c 100%)',
                    overlay: 'bg-[url("https://grainy-gradients.vercel.app/noise.svg")] opacity-40 mix-blend-multiply',
                    detail: <div className="absolute top-[30%] left-[20%] w-10 h-10 bg-black/10 rounded-full blur-[2px]"></div>, // Olympus Monsish
                    shadow: 'shadow-[inset_-25px_-25px_50px_rgba(124,45,18,0.6),_0_0_50px_rgba(234,88,12,0.5)]'
                };
            case 'jupiter':
                // Gas Giant Bands
                return {
                    background: 'repeating-linear-gradient(-20deg, #92400e 0%, #b45309 8%, #78350f 16%, #d97706 24%, #fde047 30%, #b45309 36%)',
                    overlay: 'bg-[url("https://grainy-gradients.vercel.app/noise.svg")] opacity-20 mix-blend-overlay',
                    detail: <div className="absolute top-[60%] right-[30%] w-20 h-20 bg-red-800/40 rounded-full blur-xl border border-red-900/20 shadow-inner"></div>, // Great Red Spot
                    shadow: 'shadow-[inset_-30px_-30px_70px_rgba(0,0,0,0.5),_0_0_80px_rgba(217,119,6,0.4)]'
                };
            case 'saturn':
                // Pale Gold Bands + Ring
                return {
                    background: 'repeating-linear-gradient(0deg, #fef08a 0%, #fde047 10%, #eab308 20%, #fde047 30%)',
                    overlay: 'bg-[url("https://grainy-gradients.vercel.app/noise.svg")] opacity-10 mix-blend-soft-light',
                    shadow: 'shadow-[inset_-25px_-25px_60px_rgba(161,98,7,0.4),_0_0_60px_rgba(250,204,21,0.3)]'
                };
            case 'uranus':
                // Ice Giant Smooth
                return {
                    background: 'radial-gradient(circle at 30% 30%, #a5f3fc 0%, #0891b2 100%)',
                    shadow: 'shadow-[inset_-25px_-25px_60px_rgba(21,94,117,0.5),_0_0_60px_rgba(34,211,238,0.4)]',
                    detail: <div className="absolute inset-0 bg-white/10 blur-3xl opacity-50"></div>
                };
            case 'neptune':
                // Deep Blue Storms
                return {
                    background: 'radial-gradient(circle at 60% 60%, #4338ca 0%, #312e81 100%)',
                    detail: <div className="absolute top-[20%] left-[30%] w-16 h-8 bg-black/20 blur-lg rounded-full"></div>, // Dark spot
                    shadow: 'shadow-[inset_-25px_-25px_60px_rgba(17,24,39,0.6),_0_0_60px_rgba(79,70,229,0.5)]'
                };
            case 'sun':
                // Star
                return {
                    background: 'radial-gradient(circle, #fef3c7 10%, #f59e0b 40%, #b91c1c 100%)',
                    overlay: 'bg-[url("https://grainy-gradients.vercel.app/noise.svg")] opacity-30 mix-blend-overlay',
                    detail: <div className="absolute inset-[-20%] bg-orange-500/20 blur-3xl animate-pulse"></div>,
                    shadow: 'shadow-[0_0_100px_rgba(245,158,11,0.8),_inset_0_0_40px_rgba(254,252,232,0.8)]'
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
