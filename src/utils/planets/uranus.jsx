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
    // Surface: Almost featureless Pale Cyan
    background: 'radial-gradient(circle at 50% 50%, #ecfeff 0%, #cffafe 40%, #22d3ee 80%, #0891b2 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(21,94,117,0.5),_0_0_50px_rgba(34,211,238,0.4)]',
    detail: (
        <>
            {/* 1. Vertical Emphasis (Simulating Tilt) */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_45%,rgba(255,255,255,0.2)_50%,transparent_55%)] blur-[20px]"></div>

            {/* 2. Cold Haze */}
            <div className="absolute inset-0 bg-cyan-100/20 mix-blend-overlay"></div>

            {/* 3. Subtle Cloud Features (Infrared style) */}
            <div className="absolute top-[30%] left-[20%] w-[20%] h-[20%] bg-white/30 blur-[15px] rounded-full"></div>
        </>
    )
};
