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
            {/* 1. Vertical Ring System (Faint, tilted 90 degrees) */}
            <div className="absolute top-[50%] left-[-20%] w-[140%] h-[3%] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-[2px] rotate-90"></div>
            <div className="absolute top-[50%] left-[-15%] w-[130%] h-[1%] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-[1px] rotate-90"></div>

            {/* 2. Vertical Tilt Glow (Day/Night terminator) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-40 blur-lg"></div>

            {/* 3. Infrared Cloud Features (Visible in 2007 Equinox) */}
            <div className="absolute top-[30%] right-[25%] w-[15%] h-[15%] bg-white/25 blur-[10px] rounded-full mix-blend-overlay"></div>
            <div className="absolute bottom-[35%] left-[20%] w-[10%] h-[10%] bg-white/20 blur-[8px] rounded-full mix-blend-overlay"></div>

            {/* 4. Polar Cap (Intense Day-side) */}
            <div className="absolute top-[35%] left-[35%] w-[55%] h-[55%] bg-white/35 blur-[35px] rounded-full mix-blend-screen"></div>

            {/* 5. Deep Methane Haze */}
            <div className="absolute inset-0 bg-cyan-300/15 mix-blend-overlay"></div>
            <div className="absolute inset-[10%] bg-cyan-500/10 blur-[15px] rounded-full mix-blend-overlay"></div>

            {/* 6. Atmospheric Limb Glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-cyan-200/20 blur-[1px]"></div>
        </>
    )
};

