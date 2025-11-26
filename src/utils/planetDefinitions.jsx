import React from 'react';

/**
 * Planet Visual Definitions and Configuration
 * Centralizes the specialized "Cinematic" texture rendering and tier logic.
 * Now features High-Fidelity Atmosphere & Immersion for ALL planets.
 */

// Dynamic Planet Texture Generator
export const getPlanetTexture = (planetName) => {
    const id = (planetName || '').toLowerCase();

    switch (id) {
        case 'mercury':
            return {
                background: 'radial-gradient(circle at 30% 30%, #f1f5f9 0%, #cbd5e1 40%, #64748b 100%)',
                shadow: 'shadow-[inset_-10px_-10px_20px_rgba(30,41,59,0.5),_0_0_20px_rgba(255,255,255,0.2)]',
                detail: (
                    <>
                        {/* Craters & Heat Haze */}
                        <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_center,transparent_0,transparent_10px,rgba(0,0,0,0.05)_12px)] opacity-40 mix-blend-multiply"></div>
                        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-slate-400/20 blur-[20px] rounded-full mix-blend-multiply"></div>
                        <div className="absolute inset-[-10%] bg-orange-100/10 blur-[30px] animate-pulse-slow"></div>
                    </>
                )
            };
        case 'venus':
            return {
                background: 'radial-gradient(circle at 40% 30%, #fef3c7 0%, #f59e0b 50%, #b45309 100%)',
                shadow: 'shadow-[inset_-10px_-10px_40px_rgba(120,53,15,0.6),_0_0_50px_rgba(251,191,36,0.3)]',
                detail: (
                    <>
                        {/* Toxic Clouds - Rotating Thick Atmosphere */}
                        <div className="absolute inset-[-20%] bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.2),transparent)] animate-[spin_20s_linear_infinite] opacity-60 mix-blend-soft-light blur-[20px]"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/30 to-yellow-200/30 mix-blend-overlay"></div>
                    </>
                )
            };
        case 'terra':
            return {
                background: 'radial-gradient(circle at 55% 40%, #60a5fa 0%, #3b82f6 40%, #172554 100%)',
                shadow: 'shadow-[inset_-15px_-15px_60px_rgba(2,6,23,0.8),_0_0_60px_rgba(59,130,246,0.4)]', // Atmospheric Glow
                detail: (
                    <>
                        {/* Dynamic Clouds */}
                        <div className="absolute inset-[-10%] bg-[radial-gradient(circle,transparent_40%,rgba(255,255,255,0.8)_100%)] opacity-30 animate-[spin_60s_linear_infinite] mix-blend-overlay blur-[5px]"></div>
                        <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/clouds-noise.png')] opacity-40 mix-blend-screen bg-cover animate-pulse-slow"></div>
                        {/* Landmass hint (Abstract) */}
                        <div className="absolute top-[20%] right-[30%] w-[40%] h-[50%] bg-emerald-500/20 blur-[15px] rounded-[40%] mix-blend-color-dodge"></div>
                    </>
                )
            };
        case 'mars':
            return {
                background: 'radial-gradient(circle at 35% 35%, #fdba74 0%, #ea580c 50%, #7c2d12 100%)',
                shadow: 'shadow-[inset_-10px_-10px_40px_rgba(67,20,7,0.7),_0_0_40px_rgba(234,88,12,0.3)]',
                detail: (
                    <>
                        {/* Dust Storms */}
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,0,0,0.1)_50%,transparent_60%)] animate-pulse-slow mix-blend-overlay"></div>
                        <div className="absolute bottom-[20%] left-[20%] w-[50%] h-[30%] bg-orange-900/40 blur-[20px] rounded-full mix-blend-multiply"></div>
                    </>
                )
            };
        case 'jupiter':
            return {
                background: 'linear-gradient(160deg, #fde68a 0%, #d97706 20%, #92400e 40%, #78350f 60%, #451a03 100%)',
                shadow: 'shadow-[inset_-15px_-15px_50px_rgba(69,26,3,0.7),_0_0_60px_rgba(217,119,6,0.3)]',
                detail: (
                    <>
                        {/* Storm Bands - Animated */}
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_20px,transparent_20px,transparent_40px)] mix-blend-multiply blur-[2px] opacity-60"></div>
                        {/* Great Red Spot */}
                        <div className="absolute top-[60%] left-[30%] w-[25%] h-[15%] bg-red-800/60 blur-[10px] rounded-full mix-blend-multiply shadow-inner"></div>
                        <div className="absolute inset-[-10%] bg-orange-200/10 blur-[40px] mix-blend-overlay"></div>
                    </>
                )
            };
        case 'saturn':
            return {
                background: 'radial-gradient(circle at 40% 40%, #fef9c3 0%, #eab308 60%, #a16207 100%)',
                shadow: 'shadow-[inset_-10px_-10px_40px_rgba(113,63,18,0.6),_0_0_50px_rgba(234,179,8,0.4)]',
                detail: (
                    <>
                        {/* Rings (Simulated with div + perspective would be complex, sticking to abstract bands for "orb" feel) */}
                        <div className="absolute inset-[-20%] border-[20px] border-amber-200/20 rounded-full scale-[1.4] skew-x-[60deg] skew-y-[10deg] blur-[5px] mix-blend-screen"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/10 to-transparent mix-blend-multiply"></div>
                    </>
                )
            };
        case 'uranus':
            return {
                background: 'radial-gradient(circle at 30% 30%, #cffafe 0%, #22d3ee 50%, #0e7490 100%)',
                shadow: 'shadow-[inset_-10px_-10px_40px_rgba(21,94,117,0.6),_0_0_60px_rgba(103,232,249,0.3)]',
                detail: (
                    <>
                        {/* Icy Haze - Soft & Uniform */}
                        <div className="absolute inset-[-10%] bg-cyan-100/20 blur-[40px] rounded-full mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.3)_50%,transparent_60%)] opacity-30"></div>
                    </>
                )
            };
        case 'neptune':
            return {
                background: 'radial-gradient(circle at 30% 30%, #818cf8 0%, #4338ca 50%, #1e1b4b 100%)',
                shadow: 'shadow-[inset_-10px_-10px_50px_rgba(30,27,75,0.8),_0_0_60px_rgba(99,102,241,0.4)]',
                detail: (
                    <>
                        {/* Dark Spot & Windy Atmosphere */}
                        <div className="absolute top-[20%] right-[20%] w-[30%] h-[20%] bg-indigo-950/60 blur-[15px] rounded-full mix-blend-multiply"></div>
                        <div className="absolute inset-[-20%] bg-blue-500/10 blur-[50px] mix-blend-screen animate-pulse-slow"></div>
                    </>
                )
            };
        case 'sun':
            return {
                background: 'radial-gradient(circle at 45% 45%, #fff7ed 0%, #fbbf24 30%, #ea580c 70%, #9a3412 100%)',
                shadow: 'shadow-[0_0_100px_rgba(251,146,60,0.8),_inset_0_0_60px_rgba(255,237,213,0.5)]',
                detail: (
                    <>
                        {/* Plasma Surface Activity */}
                        <div className="absolute inset-[-10%] bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/noise-texture.png')] opacity-20 mix-blend-overlay animate-[spin_100s_linear_infinite]"></div>
                        {/* Coronal Ejection Simulation */}
                        <div className="absolute inset-[-20%] bg-orange-500/20 blur-[60px] animate-pulse rounded-full mix-blend-screen"></div>
                        <div className="absolute inset-0 bg-yellow-400/10 mix-blend-color-dodge hover:bg-yellow-400/30 transition-colors duration-700"></div>
                    </>
                )
            };
        case 'supernova':
            return {
                background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #fef08a 10%, #f0abfc 25%, #d946ef 50%, #4c1d95 100%)',
                shadow: 'shadow-[0_0_60px_rgba(232,121,249,0.8),_inset_0_0_40px_rgba(255,255,255,0.8)]',
                detail: (
                    <>
                        {/* Explosive Debris Field */}
                        <div className="absolute inset-[-20%] bg-[radial-gradient(circle,transparent_20%,rgba(255,255,255,0.2)_21%,transparent_22%)] animate-[spin_3s_linear_infinite] opacity-70 mix-blend-overlay scale-150"></div>
                        <div className="absolute inset-[-10%] bg-[radial-gradient(circle,transparent_40%,rgba(232,121,249,0.4)_41%,transparent_45%)] animate-pulse-fast scale-125 mix-blend-screen"></div>

                        {/* Cross Flare */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[2px] bg-white blur-[2px] animate-pulse"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[150%] bg-white blur-[2px] animate-pulse"></div>

                        {/* Core Instability */}
                        <div className="absolute inset-0 bg-white/30 animate-ping opacity-20 rounded-full"></div>
                    </>
                )
            };
        case 'neutron': // Neutron Star
            return {
                background: 'radial-gradient(circle at 40% 40%, #ffffff 0%, #cffafe 30%, #22d3ee 60%, #0891b2 100%)',
                shadow: 'shadow-[0_0_80px_rgba(103,232,249,0.9),_inset_-4px_-4px_20px_rgba(8,145,178,0.8)]',
                detail: (
                    <>
                        {/* Ultra-fast Spin Blur */}
                        <div className="absolute inset-[-5%] border-[2px] border-cyan-100/30 rounded-full animate-[spin_0.2s_linear_infinite] skew-x-12"></div>

                        {/* Pulsar Beams (Conic) */}
                        <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_45%,rgba(165,243,252,0.6)_50%,transparent_55%,transparent_95%,rgba(165,243,252,0.6)_100%)] animate-[spin_2s_linear_infinite] mix-blend-overlay pointer-events-none blur-[8px]"></div>

                        {/* Magnetic Field Rings */}
                        <div className="absolute inset-[-20%] border border-cyan-500/30 rounded-[100%] rotate-45 animate-pulse-fast"></div>
                        <div className="absolute inset-[-20%] border border-cyan-500/30 rounded-[100%] -rotate-45 animate-pulse-fast animation-delay-500"></div>
                    </>
                )
            };
        case 'blackhole':
            return {
                background: 'black', // Vantablack base
                shadow: 'shadow-[0_0_50px_rgba(79,70,229,0.5),_inset_0_0_20px_rgba(255,255,255,0.7)]', // Outer Glow + Photon Ring
                detail: (
                    <>
                        {/* Accretion Disk (Swirling gradients) */}
                        <div className="absolute inset-[-40%] bg-[conic-gradient(from_0deg,#312e81,#818cf8,#c084fc,#312e81)] rounded-full animate-[spin_8s_linear_infinite] opacity-60 mix-blend-screen blur-[10px]"></div>
                        <div className="absolute inset-[-35%] bg-[conic-gradient(from_180deg,transparent,#4f46e5,transparent)] rounded-full animate-[spin_4s_linear_infinite] opacity-80 mix-blend-lighten blur-[5px]"></div>

                        {/* The Void (Clipping mask to ensure center stays black over the accretion disk) */}
                        <div className="absolute inset-[2%] bg-black rounded-full z-10 box-decoration-clone shadow-[0_0_30px_#000]"></div>

                        {/* Event Horizon Sparkle */}
                        <div className="absolute inset-0 border-[1px] border-white/20 rounded-full z-20 animate-pulse-slow"></div>
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
