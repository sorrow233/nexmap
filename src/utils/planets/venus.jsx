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
    // Surface: Opaque, reflective yellowish-white atmosphere (High Albedo)
    background: 'radial-gradient(circle at 40% 30%, #fffbeb 0%, #fef3c7 20%, #fcd34d 50%, #d97706 80%, #78350f 100%)',
    // Glow: Intense, blinding reflection
    shadow: 'shadow-[inset_-10px_-10px_50px_rgba(146,64,14,0.6),_0_0_60px_rgba(253,230,138,0.5)]',
    detail: (
        <>
            {/* 1. Super-Rotation Wind Bands (Primary Feature) */}
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(217,119,6,0.1)_25%,transparent_50%,rgba(217,119,6,0.1)_75%,transparent_100%)] animate-[spin_20s_linear_infinite] mix-blend-multiply blur-[10px] rounded-full"></div>
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_90deg,transparent_0%,rgba(251,191,36,0.2)_20%,transparent_40%,rgba(251,191,36,0.2)_60%,transparent_100%)] animate-[spin_30s_linear_infinite] mix-blend-overlay blur-[5px] rounded-full"></div>

            {/* 2. Acid Haze (Thickening the atmosphere) */}
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/20 to-yellow-100/20 mix-blend-color-burn"></div>

            {/* 3. Dark "Unknown" Surface Spots (Visible in UV) */}
            <div className="absolute top-[40%] right-[20%] w-[60%] h-[10%] bg-amber-900/10 blur-[20px] -rotate-12 mix-blend-multiply"></div>
            <div className="absolute bottom-[30%] left-[10%] w-[50%] h-[15%] bg-amber-900/10 blur-[20px] rotate-12 mix-blend-multiply"></div>

            {/* 4. Specular Highlight (The "Morning Star" shine) */}
            <div className="absolute top-[20%] left-[25%] w-[40%] h-[40%] bg-white/40 blur-[40px] rounded-full mix-blend-screen"></div>
        </>
    )
};
