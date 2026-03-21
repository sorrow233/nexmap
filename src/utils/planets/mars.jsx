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
    // Surface: Deep Rusty Red with nuanced elevation gradients
    background: 'radial-gradient(circle at 35% 35%, #fdba74 0%, #ea580c 25%, #c2410c 50%, #7c2d12 75%, #431407 100%)',
    // Shadow: Deep, dusty darkness
    shadow: 'shadow-[inset_-16px_-16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(234,88,12,0.4)]',
    detail: (
        <>
            {/* 1. Base Texture (Dusty Surface) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjE1Ii8+PC9zdmc+')] opacity-30 mix-blend-multiply"></div>

            {/* 2. Valles Marineris - Reimagined as a deep, soft tectonic scar */}
            <div className="absolute top-[50%] left-[20%] w-[50%] h-[3%] bg-red-950/60 rounded-[100%] blur-[4px] rotate-[-5deg] mix-blend-multiply"></div>
            <div className="absolute top-[48%] left-[25%] w-[40%] h-[2%] bg-red-900/40 rounded-[100%] blur-[2px] rotate-[-7deg] mix-blend-multiply"></div>

            {/* 3. Olympus Mons - High-altitude darker spot with cloud cover */}
            <div className="absolute top-[35%] left-[25%] w-[18%] h-[18%] bg-orange-900/40 rounded-full blur-[6px] shadow-inner mix-blend-multiply"></div>
            <div className="absolute top-[32%] left-[22%] w-[24%] h-[24%] bg-white/10 rounded-full blur-[10px] mix-blend-screen opacity-50"></div>

            {/* 4. Tharsis Volcanic Region - Subtle elevation shadows */}
            <div className="absolute top-[45%] left-[30%] w-[12%] h-[12%] bg-red-900/30 rounded-full blur-[4px] mix-blend-multiply"></div>
            <div className="absolute top-[40%] left-[40%] w-[10%] h-[10%] bg-red-900/30 rounded-full blur-[4px] mix-blend-multiply"></div>

            {/* 5. Northern Polar Ice Cap - Softened edge */}
            <div className="absolute top-[-5%] left-[50%] -translate-x-1/2 w-[45%] h-[15%] bg-white/90 blur-[8px] rounded-full mix-blend-overlay opacity-90"></div>

            {/* 6. Southern Polar Haze - Subtle */}
            <div className="absolute bottom-[-5%] left-[50%] -translate-x-1/2 w-[35%] h-[12%] bg-orange-100/30 blur-[10px] rounded-full mix-blend-screen opacity-60"></div>

            {/* 7. Dusty Atmosphere - Thin red glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(253,186,116,0.1)_0%,transparent_60%,rgba(234,88,12,0.2)_100%)] mix-blend-screen pointer-events-none"></div>

            {/* 8. Specular Highlight (Weak, dusty reflection) */}
            <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-orange-200/20 blur-[30px] rounded-full mix-blend-overlay"></div>
        </>
    )
};
