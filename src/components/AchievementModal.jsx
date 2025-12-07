import React, { useState, useEffect } from 'react';
import { X, Lock, Trophy, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

import { getPlanetTexture } from '../utils/planetDefinitions';

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
    // User Request: Unlock all for visual review
    const isUnlocked = true; // activeIndex <= currentUserIndex;
    const isCurrent = activeIndex === currentUserIndex;
    const isNext = activeIndex === currentUserIndex + 1;
    const isMystery = false; // activeIndex > currentUserIndex + 1;

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
        indigo: 'bg-indigo-50',
        fuchsia: 'bg-fuchsia-50',
        purple: 'bg-purple-50',
        red: 'bg-red-50'
    };
    const activeBgParams = bgColors[tier.color] || 'bg-slate-50';

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
                            <div className="absolute inset-0 rounded-full">
                                {/* Planet Surface (Clipped to remove square artifacts) */}
                                <div
                                    className={`
                                        absolute inset-0 rounded-full overflow-hidden
                                        transition-all duration-1000 ease-in-out
                                        ${texture.shadow}
                                    `}
                                    style={{ background: texture.background }}
                                >
                                    {/* Noise/Overlay */}
                                    {texture.overlay && <div className={`absolute inset-0 ${texture.overlay}`}></div>}
                                    {/* Procedural Details (Clouds, Bands, Spots) */}
                                    {texture.detail}
                                </div>

                                {/* Saturn Ring Special Case (Unclipped) */}
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
