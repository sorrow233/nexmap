import React from 'react';

/**
 * Saturn - The Ringed Jewel
 * Concept: Pale gold, extensive ring system, hexagonal storm.
 * Optimization:
 * - Rings: Simulated via CSS perspective and huge borders (best attempt without true 3D).
 * - Atmosphere: Soft, hazy golden ammonia clouds.
 */
export const saturnTexture = {
    // Surface: Muted Gold/Beige bands
    background: 'radial-gradient(circle at 40% 40%, #fef9c3 0%, #fae8b0 30%, #eab308 60%, #a16207 100%)',
    shadow: 'shadow-[inset_-15px_-15px_50px_rgba(113,63,18,0.5),_0_0_60px_rgba(234,179,8,0.3)]',
    detail: (
        <>
            {/* 1. Ring System (Iconic Feature) 
                Note: Since we are inside a rounded-full container, we can't draw the full rings *outside* easily 
                without breaking overflow-hidden. 
                However, for the 'StatisticsView' we provided a special case in the parent component to render rings outside.
                Here we render the *shadow* of the rings on the planet itself.
            */}

            {/* Ring Shadow on Surface */}
            <div className="absolute top-[55%] left-[-10%] w-[120%] h-[10%] bg-black/40 blur-[4px] rotate-[-12deg]"></div>

            {/* 2. Hexagonal Storm (North Pole) */}
            <div className="absolute top-[5%] left-[50%] -translate-x-1/2 w-[25%] h-[10%] bg-amber-600/20 blur-[2px] mix-blend-multiply clip-path-polygon-[50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%]"></div>

            {/* 3. Atmospheric Haze */}
            <div className="absolute inset-0 bg-yellow-100/10 blur-[10px] rounded-full mix-blend-screen"></div>
        </>
    )
};
