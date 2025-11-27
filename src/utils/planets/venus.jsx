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
            {/* 1. Super-Rotation Wind Bands (Animated) */}
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(217,119,6,0.15)_20%,transparent_40%,rgba(217,119,6,0.15)_60%,transparent_100%)] rounded-full animate-[spin_20s_linear_infinite] blur-xl mix-blend-multiply"></div>
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_180deg,transparent_0%,rgba(253,230,138,0.2)_30%,transparent_60%,rgba(253,230,138,0.2)_80%,transparent_100%)] rounded-full animate-[spin_25s_linear_infinite_reverse] blur-lg mix-blend-overlay"></div>

            {/* 2. Acid Haze (Overall tint) */}
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-100/10 to-orange-900/20 mix-blend-overlay"></div>

            {/* 3. Specular Highlight (The "Morning Star") */}
            <div className="absolute top-[25%] left-[25%] w-[25%] h-[15%] bg-white/50 blur-[20px] rounded-full mix-blend-screen transform -rotate-45"></div>
        </>
    )
};
