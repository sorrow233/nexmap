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
            {/* 1. Olympus Mons (Shield Volcano - Massive) */}
            <div className="absolute top-[30%] left-[20%] w-[18%] h-[18%] bg-orange-900/50 rounded-full blur-[3px] shadow-[inset_3px_3px_8px_rgba(0,0,0,0.6)] mix-blend-multiply"></div>
            <div className="absolute top-[33%] left-[23%] w-[10%] h-[10%] bg-orange-800/40 rounded-full blur-[1px] shadow-[inset_1px_1px_4px_rgba(0,0,0,0.5)]"></div>

            {/* 2. Valles Marineris (The Grand Canyon) */}
            <div className="absolute top-[48%] left-[15%] w-[60%] h-[4%] bg-red-950/70 blur-[2px] rounded-full rotate-[-8deg] shadow-[0_1px_2px_rgba(255,255,255,0.1)] mix-blend-multiply"></div>

            {/* 3. Tharsis Bulge Volcanos */}
            <div className="absolute top-[40%] left-[30%] w-[8%] h-[8%] bg-orange-900/40 rounded-full blur-[2px] shadow-inner"></div>
            <div className="absolute top-[45%] left-[38%] w-[6%] h-[6%] bg-orange-900/30 rounded-full blur-[2px] shadow-inner"></div>
            <div className="absolute top-[38%] left-[42%] w-[7%] h-[7%] bg-orange-900/35 rounded-full blur-[2px] shadow-inner"></div>

            {/* 4. North Polar Ice Cap */}
            <div className="absolute top-[-3%] left-[50%] -translate-x-1/2 w-[45%] h-[18%] bg-white/90 blur-[8px] rounded-full mix-blend-overlay shadow-[0_0_15px_white]"></div>
            {/* 4b. South Polar Ice Cap */}
            <div className="absolute bottom-[-3%] left-[50%] -translate-x-1/2 w-[35%] h-[14%] bg-white/80 blur-[10px] rounded-full mix-blend-overlay shadow-[0_0_10px_white]"></div>

            {/* 5. Global Dust Storm (Animated Haze) */}
            <div className="absolute inset-[-10%] bg-[conic-gradient(from_0deg,transparent,rgba(253,186,116,0.15),transparent,rgba(253,186,116,0.15),transparent)] rounded-full animate-[spin_30s_linear_infinite] blur-xl mix-blend-overlay"></div>

            {/* 6. Surface Noise (Crater fields) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjIiLz48L3N2Zz4=')] opacity-25 mix-blend-multiply"></div>

            {/* 7. Limb Brightening (Atmosphere edge) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,transparent_50%,rgba(253,186,116,0.15)_80%,rgba(253,186,116,0.4)_100%)] mix-blend-screen pointer-events-none"></div>
        </>
    )
};
