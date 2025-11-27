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
    // Surface: Varied rust tones (Ochre -> Brick Red -> Dark Brown)
    background: 'radial-gradient(circle at 35% 35%, #fdba74 0%, #fb923c 20%, #ea580c 50%, #9a3412 80%, #431407 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(26,6,2,0.8),_0_0_30px_rgba(234,88,12,0.2)]',
    detail: (
        <>
            {/* 1. Global Dust Texture */}
            <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/noise-texture.png')] opacity-20 mix-blend-multiply contrast-125"></div>

            {/* 2. Valles Marineris (The Scar) */}
            <div className="absolute top-[50%] left-[10%] w-[60%] h-[3%] bg-red-950/60 blur-[1px] -rotate-6 rounded-full mix-blend-multiply shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>

            {/* 3. Olympus Mons (The Shield Volcano) */}
            <div className="absolute top-[35%] left-[25%] w-[12%] h-[12%] bg-orange-800/40 rounded-full blur-[2px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]"></div>

            {/* 4. Polar Ice Caps */}
            {/* North */}
            <div className="absolute top-[-5%] left-[50%] -translate-x-1/2 w-[40%] h-[15%] bg-white/80 blur-[8px] rounded-full mix-blend-overlay"></div>
            {/* South */}
            <div className="absolute bottom-[-5%] left-[50%] -translate-x-1/2 w-[30%] h-[12%] bg-white/60 blur-[10px] rounded-full mix-blend-overlay"></div>

            {/* 5. Dust Haze (Limb brightening) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,transparent_50%,rgba(253,186,116,0.1)_80%,rgba(253,186,116,0.3)_100%)] mix-blend-screen pointer-events-none"></div>
        </>
    )
};
