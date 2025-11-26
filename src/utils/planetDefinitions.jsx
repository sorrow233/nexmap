import React from 'react';

/**
 * Planet Visual Definitions and Configuration
 * Centralizes the specialized "Ethereal" texture rendering and tier logic.
 */

// Dynamic Planet Texture Generator
// Returns { background, shadow, detail, overlay? } based on planet ID
export const getPlanetTexture = (planetName) => {
    const id = (planetName || '').toLowerCase();

    // Note: External containers must provide 'rounded-full' and 'overflow-hidden' 
    // to properly clip these internal effects.

    switch (id) {
        case 'mercury':
            return {
                background: 'radial-gradient(circle at 30% 30%, #e2e8f0 0%, #94a3b8 100%)',
                shadow: 'shadow-[inset_-10px_-10px_30px_rgba(71,85,105,0.4),_0_0_60px_rgba(203,213,225,0.3)]',
                detail: (
                    <>
                        {/* Craters / Dusty Atmosphere */}
                        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-200/40 blur-[40px] rounded-full mix-blend-multiply animate-pulse-slow"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-slate-400/30 blur-[30px] rounded-full"></div>
                        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-slate-300/20 blur-[10px] rounded-full mix-blend-overlay"></div>
                    </>
                )
            };
        case 'venus':
            return {
                background: 'radial-gradient(circle at 30% 30%, #fef3c7 0%, #fbbf24 100%)',
                shadow: 'shadow-[inset_-10px_-10px_40px_rgba(180,83,9,0.3),_0_0_80px_rgba(251,191,36,0.4)]',
                detail: (
                    <>
                        {/* Thick Clouds */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-300 via-transparent to-rose-300 opacity-60 mix-blend-overlay"></div>
                        <div className="absolute top-0 right-0 w-[90%] h-[90%] bg-amber-200/50 blur-[50px] rounded-full animate-spin-slow"></div>
                    </>
                )
            };
        case 'terra':
            return {
                background: 'radial-gradient(circle at 40% 40%, #60a5fa 0%, #1e40af 100%)',
                shadow: 'shadow-[inset_-10px_-10px_50px_rgba(30,58,138,0.5),_0_0_100px_rgba(59,130,246,0.6)]',
                detail: (
                    <>
                        {/* Oceans & Clouds */}
                        <div className="absolute top-[-10%] right-[-20%] w-[80%] h-[80%] bg-teal-300/40 blur-[50px] rounded-full mix-blend-screen animate-pulse-slow"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-[90%] h-[90%] bg-indigo-600/50 blur-[40px] rounded-full mix-blend-multiply"></div>
                        <div className="absolute top-[20%] right-[30%] w-[40%] h-[20%] bg-white/20 blur-[20px] rounded-full mix-blend-overlay"></div>
                    </>
                )
            };
        case 'mars':
            return {
                background: 'radial-gradient(circle at 30% 30%, #fdba74 0%, #ea580c 100%)',
                shadow: 'shadow-[inset_-10px_-10px_40px_rgba(124,45,18,0.4),_0_0_80px_rgba(234,88,12,0.4)]',
                detail: (
                    <>
                        {/* Rusty Storms */}
                        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-orange-200/40 blur-[40px] rounded-full mix-blend-overlay"></div>
                        <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-rose-900/30 blur-[30px] rounded-full"></div>
                    </>
                )
            };
        case 'jupiter':
            return {
                background: 'linear-gradient(180deg, #d97706, #b45309, #92400e)',
                shadow: 'shadow-[inset_-10px_-10px_50px_rgba(146,64,14,0.4),_0_0_100px_rgba(217,119,6,0.4)]',
                detail: (
                    <>
                        {/* Gas Bands - Enhanced */}
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,rgba(0,0,0,0.1)_60px)] blur-[8px] mix-blend-multiply rounded-full overflow-hidden"></div>
                        <div className="absolute top-[20%] left-[-20%] w-[100%] h-[60%] bg-amber-200/30 blur-[50px] rounded-full mix-blend-overlay"></div>
                        {/* Great Red Spot hint */}
                        <div className="absolute bottom-[30%] right-[20%] w-[20%] h-[15%] bg-red-900/20 blur-[15px] rounded-full mix-blend-multiply"></div>
                    </>
                )
            };
        case 'saturn':
            return {
                background: 'radial-gradient(circle at 40% 40%, #fef08a 0%, #eab308 100%)',
                shadow: 'shadow-[inset_-10px_-10px_40px_rgba(161,98,7,0.3),_0_0_80px_rgba(234,179,8,0.4)]',
                detail: (
                    <>
                        {/* Hexagon Storm hint */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-orange-300/20 blur-[30px] rounded-full"></div>
                    </>
                )
            };
        case 'uranus':
            return {
                background: 'radial-gradient(circle at 30% 30%, #a5f3fc 0%, #0891b2 100%)',
                shadow: 'shadow-[inset_-10px_-10px_40px_rgba(21,94,117,0.4),_0_0_80px_rgba(34,211,238,0.4)]',
                detail: (
                    <>
                        {/* Vertical Tilt Glow */}
                        <div className="absolute top-[-30%] left-0 w-[120%] h-[120%] bg-sky-200/30 blur-[40px] rounded-full mix-blend-soft-light animate-pulse-slow"></div>
                    </>
                )
            };
        case 'neptune':
            return {
                background: 'radial-gradient(circle at 30% 30%, #818cf8 0%, #312e81 100%)',
                shadow: 'shadow-[inset_-10px_-10px_50px_rgba(49,46,129,0.5),_0_0_100px_rgba(79,70,229,0.5)]',
                detail: (
                    <>
                        {/* Deep Dark Spot */}
                        <div className="absolute top-0 right-0 w-[80%] h-[80%] bg-purple-500/30 blur-[40px] rounded-full mix-blend-screen"></div>
                        <div className="absolute bottom-0 left-0 w-[70%] h-[70%] bg-blue-900/60 blur-[40px] rounded-full mix-blend-multiply"></div>
                    </>
                )
            };
        case 'sun':
            return {
                background: 'radial-gradient(circle at 40% 40%, #fff7ed 0%, #f59e0b 40%, #ea580c 100%)',
                shadow: 'shadow-[0_0_80px_rgba(251,146,60,0.6)]', // Pure glow
                detail: (
                    <>
                        {/* Coronal Loops */}
                        <div className="absolute inset-[-20%] bg-orange-400/30 blur-[50px] animate-pulse-slow mix-blend-screen"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(255,255,255,0.4)_100%)] mix-blend-overlay opacity-50"></div>
                    </>
                )
            };
        case 'supernova':
            return {
                background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #f0abfc 20%, #a855f7 60%, #4c1d95 100%)',
                shadow: 'shadow-[inset_-10px_-10px_60px_rgba(76,29,149,0.5),_0_0_100px_rgba(192,132,252,0.6)]',
                detail: (
                    <>
                        {/* Shockwave - Enhanced */}
                        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.8),transparent)] animate-[spin_4s_linear_infinite] opacity-60 mix-blend-overlay"></div>
                        <div className="absolute inset-[-20%] bg-fuchsia-400/20 blur-[80px] animate-pulse-fast rounded-full"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[5px] bg-white/50 blur-[10px] rotate-45"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[5px] bg-white/50 blur-[10px] -rotate-45"></div>
                    </>
                )
            };
        case 'neutron':
            return {
                background: 'radial-gradient(circle at 30% 30%, #ecfeff 0%, #22d3ee 50%, #164e63 100%)',
                shadow: 'shadow-[inset_-5px_-5px_30px_rgba(8,145,178,0.8),_0_0_120px_rgba(34,211,238,0.8)]',
                detail: (
                    <>
                        {/* Magnetic Fields & Pulsar Jets */}
                        <div className="absolute inset-0 border-[4px] border-cyan-200/30 rounded-full animate-[spin_1s_linear_infinite] opacity-50 blur-[1px]"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[15%] bg-cyan-100/60 blur-[15px] rotate-[60deg] animate-pulse-fast"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[15%] bg-cyan-100/60 blur-[15px] rotate-[-60deg] animate-pulse-fast"></div>
                    </>
                )
            };
        case 'blackhole':
            return {
                background: 'radial-gradient(circle at 60% 40%, #000000 0%, #0a0a0a 60%, #1e1b4b 100%)',
                shadow: 'shadow-[inset_0_0_80px_rgba(0,0,0,1),_0_0_100px_rgba(99,102,241,0.4)]',
                detail: (
                    <>
                        {/* Event Horizon & Accretion Halo */}
                        <div className="absolute inset-[-5%] border-[3px] border-indigo-500/50 rounded-full blur-[4px] shadow-[0_0_40px_rgba(79,70,229,0.8)]"></div>
                        {/* Lensing Distortion (Fake) */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(255,255,255,0.1)_90%)] mix-blend-overlay"></div>
                    </>
                )
            };
        default:
            // Fallback for custom planets
            return { background: 'bg-slate-200', shadow: 'shadow-lg', detail: null };
    }
};

// Configuration Hook
export const usePlanetTiers = (t) => {
    return React.useMemo(() => [
        { id: 'mercury', name: t.stats?.planets?.mercury?.name || 'Mercury', color: 'slate', limit: 100000, gradient: 'from-slate-400 via-stone-400 to-gray-500', shadow: 'shadow-slate-400', lore: t.stats?.planets?.mercury?.lore },
        { id: 'venus', name: t.stats?.planets?.venus?.name || 'Venus', color: 'orange', limit: 250000, gradient: 'from-orange-200 via-stone-400 to-amber-200', shadow: 'shadow-stone-400', lore: t.stats?.planets?.venus?.lore },
        { id: 'terra', name: t.stats?.planets?.terra?.name || 'Terra', color: 'emerald', limit: 1000000, gradient: 'from-blue-400 via-teal-400 to-emerald-500', shadow: 'shadow-emerald-400', lore: t.stats?.planets?.terra?.lore },
        { id: 'mars', name: t.stats?.planets?.mars?.name || 'Mars', color: 'red', limit: 500000, gradient: 'from-orange-400 via-red-400 to-red-600', shadow: 'shadow-orange-400', lore: t.stats?.planets?.mars?.lore },
        { id: 'jupiter', name: t.stats?.planets?.jupiter?.name || 'Jupiter', color: 'amber', limit: 2500000, gradient: 'from-orange-200 via-amber-300 to-orange-400', shadow: 'shadow-amber-400', lore: t.stats?.planets?.jupiter?.lore },
        { id: 'saturn', name: t.stats?.planets?.saturn?.name || 'Saturn', color: 'yellow', limit: 5000000, gradient: 'from-yellow-100 via-yellow-200 to-amber-200', shadow: 'shadow-yellow-400', lore: t.stats?.planets?.saturn?.lore },
        { id: 'uranus', name: t.stats?.planets?.uranus?.name || 'Uranus', color: 'cyan', limit: 10000000, gradient: 'from-cyan-200 via-sky-300 to-blue-300', shadow: 'shadow-cyan-400', lore: t.stats?.planets?.uranus?.lore },
        { id: 'neptune', name: t.stats?.planets?.neptune?.name || 'Neptune', color: 'indigo', limit: 20000000, gradient: 'from-blue-600 via-indigo-600 to-violet-700', shadow: 'shadow-indigo-500', lore: t.stats?.planets?.neptune?.lore },
        { id: 'sun', name: t.stats?.planets?.sun?.name || 'Sun', color: 'amber', limit: 1000000000, gradient: 'from-yellow-300 via-orange-500 to-red-500', shadow: 'shadow-amber-500', lore: t.stats?.planets?.sun?.lore },

        // Cosmic Endgame
        { id: 'supernova', name: t.stats?.planets?.supernova?.name || 'Supernova', color: 'fuchsia', limit: 5000000000, gradient: 'from-fuchsia-400 via-purple-500 to-indigo-600', shadow: 'shadow-fuchsia-500', lore: t.stats?.planets?.supernova?.lore },
        { id: 'neutron', name: t.stats?.planets?.neutron?.name || 'Neutron Star', color: 'cyan', limit: 10000000000, gradient: 'from-cyan-300 via-blue-500 to-indigo-600', shadow: 'shadow-cyan-500', lore: t.stats?.planets?.neutron?.lore },
        { id: 'blackhole', name: t.stats?.planets?.blackhole?.name || 'Black Hole', color: 'indigo', limit: 100000000000, gradient: 'from-gray-900 via-indigo-900 to-black', shadow: 'shadow-indigo-900', lore: t.stats?.planets?.blackhole?.lore }
    ].sort((a, b) => a.limit - b.limit), [t]);
};
