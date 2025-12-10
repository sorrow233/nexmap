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
            {/* 1. Super-Rotation Wind Bands (Multi-layer, different speeds) */}
            <div className="absolute inset-[-25%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(217,119,6,0.20)_15%,transparent_30%,rgba(217,119,6,0.20)_45%,transparent_60%,rgba(217,119,6,0.20)_75%,transparent_100%)] rounded-full animate-[spin_15s_linear_infinite] blur-xl mix-blend-multiply"></div>
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_90deg,transparent_0%,rgba(253,230,138,0.25)_20%,transparent_40%,rgba(253,230,138,0.25)_60%,transparent_80%)] rounded-full animate-[spin_22s_linear_infinite_reverse] blur-lg mix-blend-overlay"></div>
            <div className="absolute inset-[-15%] bg-[conic-gradient(from_45deg,transparent,rgba(251,191,36,0.15),transparent,rgba(251,191,36,0.15),transparent)] rounded-full animate-[spin_30s_linear_infinite] blur-md mix-blend-soft-light"></div>

            {/* 2. Polar Vortex (Double-eye storm at South Pole) */}
            <div className="absolute bottom-[5%] left-[50%] -translate-x-1/2 w-[30%] h-[20%] border-[4px] border-yellow-600/30 rounded-full blur-[3px] animate-[spin_10s_linear_infinite] mix-blend-multiply"></div>

            {/* 3. Volcanic Plume Hints (Maat Mons / Ishtar Terra) */}
            <div className="absolute top-[40%] left-[30%] w-[8%] h-[12%] bg-orange-800/20 blur-[5px] rounded-full mix-blend-color-burn"></div>
            <div className="absolute top-[55%] right-[35%] w-[6%] h-[10%] bg-orange-700/15 blur-[4px] rounded-full mix-blend-color-burn"></div>

            {/* 4. Acid Haze Layers */}
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-100/15 via-transparent to-orange-900/25 mix-blend-overlay"></div>
            <div className="absolute inset-[5%] bg-gradient-to-tr from-transparent via-yellow-200/10 to-transparent mix-blend-soft-light"></div>

            {/* 5. Specular Highlight (Blinding "Morning Star" Shine) */}
            <div className="absolute top-[20%] left-[20%] w-[35%] h-[25%] bg-white/60 blur-[25px] rounded-full mix-blend-screen transform -rotate-45"></div>
            <div className="absolute top-[25%] left-[25%] w-[15%] h-[10%] bg-white blur-[10px] rounded-full mix-blend-screen opacity-80"></div>

            {/* 6. Atmospheric Limb Glow */}
            <div className="absolute inset-0 rounded-full border-[3px] border-yellow-200/20 blur-[2px]"></div>
        </>
    )
};
