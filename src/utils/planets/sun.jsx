import React from 'react';

/**
 * Sun - The Star
 * Concept: Blinding plasma ball, magnetic loops, coronal mass ejections.
 * Optimization:
 * - Brightness: Blinding core gradients.
 * - Dynamics: Rotating plasma noise.
 * - Atmosphere: Massive coronal glow.
 */
export const sunTexture = {
    // Surface: Blinding White/Yellow core -> Red fringes
    background: 'radial-gradient(circle at 50% 50%, #fef3c7 0%, #fcd34d 25%, #f59e0b 50%, #ea580c 75%, #991b1b 100%)',
    // Glow: Massive, pulsing corona
    shadow: 'shadow-[0_0_80px_rgba(251,191,36,0.6),_inset_0_0_40px_rgba(254,252,232,0.8)]',
    detail: (
        <>
            {/* 1. Boiling Plasma (Convection Cells) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJ0dXJidWxlbmNlIiBiYXNlRnJlcXVlbmN5PSIwLjAyIiBudW1PY3RhdmVzPSI1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC41Ii8+PC9zdmc+')] mix-blend-overlay opacity-60 animate-pulse-slow"></div>

            {/* 2. Magnetic Loops / Solar Flares */}
            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] border-[2px] border-yellow-300/30 rounded-full skew-x-12 blur-[4px] animate-[spin_60s_linear_infinite]"></div>
            <div className="absolute top-[10%] right-[10%] w-[80%] h-[80%] border-[4px] border-orange-500/20 rounded-full -skew-y-12 blur-[8px] animate-[spin_45s_linear_infinite_reverse]"></div>

            {/* 3. Core Pulse */}
            <div className="absolute inset-[20%] bg-white/40 blur-[20px] rounded-full animate-pulse shadow-[0_0_40px_rgba(255,255,255,0.8)]"></div>
        </>
    )
};
