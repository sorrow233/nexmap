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
    // Richer, deeper crimson, iron-rich aesthetic
    background: 'radial-gradient(circle at 32% 32%, #fbd38d 0%, #f97316 22%, #c2410c 45%, #7c2d12 70%, #2a0a02 100%)',
    // Strong, dramatic cast shadows for rugged planet
    shadow: 'shadow-[inset_-25px_-25px_50px_rgba(0,0,0,0.95),0_0_40px_rgba(234,88,12,0.5),0_0_80px_rgba(154,52,18,0.3)]',
    detail: (
        <>
            {/* High-contrast terrain texture */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43NSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] opacity-40 mix-blend-multiply contrast-[1.8]"></div>

            {/* Valles Marineris (Crisper, glowing deeper rust) */}
            <div className="absolute top-[48%] left-[15%] w-[60%] h-[4%] bg-gradient-to-b from-red-950/80 via-black/60 to-red-900/40 rounded-[100%] blur-[3px] rotate-[-8deg] mix-blend-multiply shadow-[0_2px_5px_rgba(255,255,255,0.1)]"></div>
            <div className="absolute top-[46%] left-[22%] w-[45%] h-[2%] bg-red-950/70 rounded-[100%] blur-[2px] rotate-[-12deg] mix-blend-multiply"></div>

            {/* Olympus Mons (More prominent shield volcano) */}
            <div className="absolute top-[32%] left-[25%] w-[20%] h-[20%] bg-gradient-to-br from-orange-400/20 to-red-950/60 rounded-full blur-[4px] shadow-[inset_2px_2px_8px_rgba(255,255,255,0.2),8px_8px_12px_rgba(0,0,0,0.5)] rotate-[30deg]"></div>
            
            {/* Olympus Mons Caldera */}
            <div className="absolute top-[40%] left-[33%] w-[4%] h-[4%] bg-black/50 rounded-full blur-[1px] shadow-[inset_-1px_-1px_3px_rgba(255,255,255,0.3)]"></div>
            <div className="absolute top-[28%] left-[22%] w-[28%] h-[28%] bg-white/10 rounded-full blur-[12px] mix-blend-screen opacity-60 pointer-events-none"></div>

            {/* Tharsis Bulge (Elevation highlights) */}
            <div className="absolute top-[42%] left-[35%] w-[18%] h-[18%] bg-orange-500/10 rounded-full blur-[8px] shadow-[10px_10px_15px_rgba(0,0,0,0.4)]"></div>
            <div className="absolute top-[35%] left-[48%] w-[15%] h-[15%] bg-orange-500/10 rounded-full blur-[8px] shadow-[8px_8px_12px_rgba(0,0,0,0.4)]"></div>

            {/* Impact Basins (Darker lowlands) */}
            <div className="absolute bottom-[20%] right-[15%] w-[35%] h-[35%] bg-red-950/40 rounded-[45%_55%_40%_60%] blur-[12px] mix-blend-multiply"></div>

            {/* Northern Polar Ice Cap (Bright, sharp dry ice) */}
            <div className="absolute top-[-3%] left-[50%] -translate-x-1/2 w-[40%] h-[12%] bg-gradient-to-b from-white via-orange-100/90 to-transparent blur-[4px] rounded-[50%_50%_40%_40%] mix-blend-overlay opacity-95"></div>

            {/* Southern Polar Ice (Smaller, offset) */}
            <div className="absolute bottom-[-1%] left-[55%] -translate-x-1/2 w-[25%] h-[8%] bg-gradient-to-t from-white/90 to-transparent blur-[3px] rounded-[40%_40%_50%_50%] mix-blend-screen opacity-80"></div>

            {/* Thin but striking Martian atmosphere (Dusty scatter) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(253,1ba,116,0.15)_0%,transparent_50%,rgba(234,88,12,0.25)_100%)] mix-blend-screen pointer-events-none border-[1px] border-orange-400/30 rounded-full"></div>

            {/* Specular Highlight */}
            <div className="absolute top-[25%] left-[25%] w-[40%] h-[40%] bg-orange-200/25 blur-[25px] rounded-full mix-blend-overlay pointer-events-none"></div>
        </>
    )
};
