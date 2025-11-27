import React from 'react';

/**
 * Uranus - The Ice Giant
 * Concept: Featureless cyan disk, odd tilt, cold.
 * Optimization:
 * - Color: Perfect Pale Cyan.
 * - Tilt: Vertical glow to imply its 98-degree axial tilt.
 * - Ring: Faint vertical ring hint.
 */
export const uranusTexture = {
    // Surface: Featureless Pale Cyan (Smooth Ice Giant)
    // Note: Uranus rolls on its side, so we use a vertical gradient if possible, or just a smooth radial.
    background: 'radial-gradient(circle at 40% 40%, #cffafe 0%, #a5f3fc 30%, #22d3ee 70%, #0891b2 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(8,145,178,0.8),_0_0_40px_rgba(165,243,252,0.4)]',
    detail: (
        <>
            {/* 1. Vertical Ring System (Bright Epsilon Ring) */}
            <div className="absolute top-[50%] left-[-30%] w-[160%] h-[4%] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent blur-[3px] rotate-90"></div>
            <div className="absolute top-[50%] left-[-25%] w-[150%] h-[2%] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-[1px] rotate-90"></div>
            <div className="absolute top-[50%] left-[-20%] w-[140%] h-[0.5%] -translate-y-1/2 bg-white/40 blur-[0.5px] rotate-90"></div>

            {/* 2. Vertical Tilt Glow (Day/Night terminator - Extreme tilt) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 blur-[20px] rotate-[10deg]"></div>

            {/* 3. Uranus Dark Spot (Rare feature) */}
            <div className="absolute top-[45%] right-[30%] w-[12%] h-[8%] bg-indigo-900/30 blur-[5px] rounded-full mix-blend-multiply rotate-90"></div>

            {/* 4. Berg Cloud Features (Bright methane storms) */}
            <div className="absolute top-[25%] right-[35%] w-[10%] h-[6%] bg-white/40 blur-[4px] rounded-full mix-blend-screen animate-pulse-slow"></div>
            <div className="absolute bottom-[30%] left-[25%] w-[8%] h-[5%] bg-white/30 blur-[3px] rounded-full mix-blend-screen"></div>

            {/* 5. Latitudinal Cloud Bands (Faint) */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0%,transparent_10%,rgba(255,255,255,0.05)_12%,transparent_15%)] mix-blend-overlay"></div>

            {/* 6. Polar Cap (Intense Day-side south pole) */}
            <div className="absolute top-[30%] left-[30%] w-[60%] h-[60%] bg-white/25 blur-[30px] rounded-full mix-blend-screen"></div>

            {/* 7. Deep Methane Haze (Cyan absorption) */}
            <div className="absolute inset-0 bg-cyan-400/10 mix-blend-overlay"></div>
            <div className="absolute inset-[15%] bg-blue-500/10 blur-[20px] rounded-full mix-blend-multiply"></div>

            {/* 8. Atmospheric Limb Glow */}
            <div className="absolute inset-0 rounded-full border-[3px] border-cyan-200/30 blur-[2px]"></div>

            {/* 9. Moon Shadow (Miranda) */}
            <div className="absolute top-[48%] left-[45%] w-[2%] h-[2%] bg-black/50 blur-[1px] rounded-full"></div>
        </>
    )
};

