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
            {/* 1. Olympus Mons (Shield Volcano - Detailed Caldera) */}
            <div className="absolute top-[30%] left-[20%] w-[22%] h-[22%] bg-orange-900/60 rounded-full blur-[4px] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7)] mix-blend-multiply"></div>
            <div className="absolute top-[35%] left-[25%] w-[10%] h-[10%] bg-orange-850/50 rounded-full blur-[2px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]"></div>

            {/* 2. Valles Marineris (The Grand Canyon - Subtle shadow scar) */}
            <div className="absolute top-[48%] left-[18%] w-[55%] h-[2%] bg-gradient-to-r from-transparent via-red-950/40 to-transparent blur-[3px] rounded-full rotate-[-8deg] mix-blend-multiply"></div>
            <div className="absolute top-[49%] left-[20%] w-[50%] h-[1%] bg-red-900/30 blur-[2px] rounded-full rotate-[-8deg] mix-blend-multiply"></div>
            {/* Side canyons */}
            <div className="absolute top-[46%] left-[35%] w-[15%] h-[1%] bg-red-950/20 blur-[2px] rounded-full rotate-[-20deg] mix-blend-multiply"></div>

            {/* 3. Tharsis Bulge Volcanos (Ascraeus, Pavonis, Arsia Mons) */}
            <div className="absolute top-[40%] left-[30%] w-[9%] h-[9%] bg-orange-900/50 rounded-full blur-[2px] shadow-inner"></div>
            <div className="absolute top-[46%] left-[38%] w-[7%] h-[7%] bg-orange-900/40 rounded-full blur-[2px] shadow-inner"></div>
            <div className="absolute top-[38%] left-[42%] w-[8%] h-[8%] bg-orange-900/45 rounded-full blur-[2px] shadow-inner"></div>

            {/* 4. Polar Ice Caps (Seasonal CO2 Frost) */}
            <div className="absolute top-[-4%] left-[50%] -translate-x-1/2 w-[50%] h-[18%] bg-white/95 blur-[6px] rounded-full mix-blend-overlay shadow-[0_0_20px_white]"></div>
            <div className="absolute bottom-[-3%] left-[50%] -translate-x-1/2 w-[35%] h-[12%] bg-white/85 blur-[8px] rounded-full mix-blend-overlay shadow-[0_0_15px_white]"></div>

            {/* 5. Phobos & Deimos Shadows (Moon transits) */}
            <div className="absolute top-[55%] left-[30%] w-[4%] h-[4%] bg-black/70 blur-[3px] rounded-full mix-blend-multiply animate-[spin_8s_linear_infinite] origin-[150%_150%]"></div>
            <div className="absolute top-[35%] right-[25%] w-[2%] h-[2%] bg-black/60 blur-[2px] rounded-full mix-blend-multiply animate-[spin_12s_linear_infinite_reverse] origin-[-200%_50%]"></div>

            {/* 6. Orographic Clouds (Clouds over volcanos) */}
            <div className="absolute top-[28%] left-[18%] w-[25%] h-[25%] bg-white/20 blur-[10px] rounded-full mix-blend-screen"></div>

            {/* 7. Global Dust Storm (Animated swirling haze) */}
            <div className="absolute inset-[-15%] bg-[conic-gradient(from_0deg,transparent,rgba(253,186,116,0.20),transparent,rgba(253,186,116,0.15),transparent)] rounded-full animate-[spin_40s_linear_infinite] blur-xl mix-blend-overlay"></div>

            {/* 8. Surface Texture (Regolith noise) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjI1Ii8+PC9zdmc+')] opacity-25 mix-blend-multiply contrast-125"></div>

            {/* 9. Atmospheric Edge (Glow) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,transparent_50%,rgba(253,186,116,0.15)_80%,rgba(253,186,116,0.5)_100%)] mix-blend-screen pointer-events-none"></div>
            <div className="absolute inset-0 border-[2px] border-orange-300/20 rounded-full blur-[1px]"></div>
        </>
    )
};
