import React from 'react';

/**
 * Mars - The Red Planet
 * Concept: Rusty iron oxide surface, magnificent geology, thin dusty atmosphere.
 * "Extreme" Optimization:
 * - Terrain: Hints of Valles Marineris (The Grand Canyon of Mars) and Olympus Mons.
 * - Poles: Visible Polar Ice Caps.
 * - Texture: Dusty, matte finish.
 */
export const marsTexture = {
    // Surface: Dusty Red/Orange
    background: 'radial-gradient(circle at 40% 40%, #fdba74 0%, #fb923c 30%, #c2410c 60%, #7c2d12 90%, #451a03 100%)',
    // Atmosphere: Thin, reddish-pink haze
    shadow: 'shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.8),_0_0_20px_rgba(253,186,116,0.3)]',
    detail: (
        <>
            <div className="absolute bottom-[-5%] left-[50%] -translate-x-1/2 w-[30%] h-[12%] bg-white/60 blur-[10px] rounded-full mix-blend-overlay"></div>

            {/* 5. Dust Haze (Limb brightening) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,transparent_50%,rgba(253,186,116,0.1)_80%,rgba(253,186,116,0.3)_100%)] mix-blend-screen pointer-events-none"></div>
        </>
    )
};
