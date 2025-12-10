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
            {/* 1. Vertical Glow (The "Side-Roll" indicator) */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 blur-xl rotate-90"></div>

            {/* 2. Ring Plane Hint (Very faint, vertical) */}
            <div className="absolute top-0 left-[50%] w-[2%] h-full bg-white/10 blur-[1px]"></div>

            {/* 3. Deep Atmospheric Haze */}
            <div className="absolute inset-0 bg-cyan-400/10 mix-blend-overlay"></div>

            {/* 4. Polar Cap (Day side) */}
            <div className="absolute top-[40%] left-[40%] w-[50%] h-[50%] bg-white/30 blur-[40px] rounded-full mix-blend-screen"></div>
        </>
    )
};

```
