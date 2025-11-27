import React from 'react';

/**
 * Venus - The Morning Star
 * Concept: Runaway greenhouse effect, thick choking atmosphere, violent super-rotation.
 * "Extreme" Optimization:
 * - Atmosphere: Multiple layers of spinning conic gradients to simulate wind bands.
 * - Pressure: Dense, opaque haze.
 * - Color: Sickly yellow-white (Sulfuric Acid) clouds.
 */
export const venusTexture = {
    // Surface: Sickly Yellow/White Albedo (Reflective atmosphere)
    background: 'radial-gradient(circle at 35% 35%, #fffbeb 0%, #fef3c7 30%, #fcd34d 60%, #d97706 90%, #78350f 100%)',
    // Glow: Thick, scattering atmosphere
    shadow: 'shadow-[inset_-16px_-16px_40px_rgba(69,26,3,0.6),_0_0_50px_rgba(251,191,36,0.3)]',
    detail: (
        <>
            {/* 1. Super-Rotation Wind Bands (Complex Multi-layer) */}
            <div className="absolute inset-[-25%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(217,119,6,0.30)_15%,transparent_30%,rgba(217,119,6,0.30)_45%,transparent_60%,rgba(217,119,6,0.30)_75%,transparent_100%)] rounded-full animate-[spin_12s_linear_infinite] blur-xl mix-blend-multiply"></div>
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_90deg,transparent_0%,rgba(253,230,138,0.35)_20%,transparent_40%,rgba(253,230,138,0.35)_60%,transparent_80%)] rounded-full animate-[spin_18s_linear_infinite_reverse] blur-lg mix-blend-overlay"></div>
            <div className="absolute inset-[-15%] bg-[conic-gradient(from_45deg,transparent,rgba(251,191,36,0.25),transparent,rgba(251,191,36,0.25),transparent)] rounded-full animate-[spin_25s_linear_infinite] blur-md mix-blend-soft-light"></div>

            {/* 2. The "Y-Wave" Feature (Atmospheric dark streak) */}
            <div className="absolute top-[40%] left-[-10%] w-[120%] h-[20%] bg-amber-900/10 blur-[15px] rotate-[-15deg] mix-blend-multiply transform skew-x-12"></div>

            {/* 3. Lightning Storms (Night side flashes) */}
            <div className="absolute top-[60%] right-[30%] w-[5%] h-[5%] bg-white blur-[5px] rounded-full animate-[pulse_3s_ease-in-out_infinite] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-[20%] right-[40%] w-[3%] h-[3%] bg-white blur-[4px] rounded-full animate-[pulse_5s_ease-in-out_infinite] animation-delay-700 opacity-0 group-hover:opacity-100"></div>

            {/* 4. Polar Vortex (Double-eye structure) */}
            <div className="absolute bottom-[5%] left-[50%] -translate-x-1/2 w-[35%] h-[25%] border-[6px] border-yellow-600/40 rounded-full blur-[4px] animate-[spin_8s_linear_infinite] mix-blend-multiply"></div>
            <div className="absolute bottom-[8%] left-[50%] -translate-x-1/2 w-[15%] h-[10%] bg-yellow-800/20 rounded-full blur-[2px]"></div>

            {/* 5. Aphrodite Terra (Highland continent hints through haze) */}
            <div className="absolute top-[50%] left-[20%] w-[40%] h-[15%] bg-orange-900/15 blur-[8px] rounded-full mix-blend-color-burn rotate-12"></div>

            {/* 6. Volcanic Plumes (Active volcanism) */}
            <div className="absolute top-[40%] left-[30%] w-[8%] h-[12%] bg-orange-800/30 blur-[5px] rounded-full mix-blend-color-burn animate-pulse-slow"></div>

            {/* 7. Specular Highlight (The "Morning Star" Bloom) */}
            <div className="absolute top-[20%] left-[20%] w-[40%] h-[30%] bg-white/70 blur-[30px] rounded-full mix-blend-screen transform -rotate-45"></div>
            <div className="absolute top-[25%] left-[25%] w-[18%] h-[12%] bg-white blur-[12px] rounded-full mix-blend-screen opacity-90"></div>

            {/* 8. Atmospheric Halo and Scattering */}
            <div className="absolute inset-0 rounded-full border-[4px] border-yellow-100/30 blur-[4px] mix-blend-overlay"></div>
            <div className="absolute inset-[-5%] bg-yellow-200/5 blur-[20px] rounded-full z-[-1]"></div>
        </>
    )
};
