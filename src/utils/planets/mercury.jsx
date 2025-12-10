import React from 'react';

/**
 * Mercury - The Swift Planet
 * Concept: Scorched, barren, sun-blasted rock with extreme temperature contrast.
 * "Extreme" Optimization: 
 * - Metallicity: High contrast metallic gradients.
 * - Heat: Intense heat shimmer on the sun-facing side.
 * - Topography: Deep crater shadows using mix-blend modes.
 */
export const mercuryTexture = {

    // Surface: Metallic Slate/Gray with heat gradients
    background: 'radial-gradient(circle at 30% 30%, #e2e8f0 0%, #94a3b8 40%, #475569 80%, #1e293b 100%)',
    // Shadow: Sharp, rough terminator line
    shadow: 'shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.8),_0_0_15px_rgba(203,213,225,0.3)]',
    detail: (
        <>
            {/* 1. Caloris Basin (Massive Impact Structure with concentric rings) */}
            <div className="absolute top-[25%] left-[25%] w-[38%] h-[38%] bg-slate-700/40 rounded-full blur-[4px] shadow-[inset_4px_4px_12px_rgba(0,0,0,0.8),_2px_2px_4px_rgba(255,255,255,0.2)] mix-blend-multiply"></div>
            <div className="absolute top-[28%] left-[28%] w-[32%] h-[32%] border-[2px] border-slate-600/30 rounded-full blur-[2px]"></div>
            <div className="absolute top-[32%] left-[32%] w-[24%] h-[24%] bg-slate-600/20 rounded-full blur-[3px] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6)]"></div>

            {/* 2. Ray Systems (Bright ejecta streaks from fresh craters) */}
            <div className="absolute top-[50%] right-[20%] w-[40%] h-[1%] bg-white/20 blur-[1px] rotate-[15deg] mix-blend-screen"></div>
            <div className="absolute top-[50%] right-[20%] w-[40%] h-[1%] bg-white/20 blur-[1px] rotate-[-45deg] mix-blend-screen"></div>
            <div className="absolute top-[50%] right-[20%] w-[40%] h-[1%] bg-white/20 blur-[1px] rotate-[80deg] mix-blend-screen"></div>
            <div className="absolute top-[50%] right-[20%] w-[5%] h-[5%] bg-white/50 blur-[2px] rounded-full shadow-[0_0_10px_white]"></div>

            {/* 3. Secondary Craters & Chaos Terrain */}
            <div className="absolute bottom-[20%] left-[15%] w-[12%] h-[12%] bg-slate-600/30 rounded-full blur-[2px] shadow-[inset_1px_1px_4px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute top-[10%] right-[40%] w-[8%] h-[8%] bg-slate-700/25 rounded-full blur-[1px] shadow-inner"></div>
            <div className="absolute bottom-[30%] right-[30%] w-[15%] h-[15%] bg-slate-800/20 rounded-full blur-[4px] mix-blend-multiply"></div>

            {/* 4. Lobate Scarps (Tectonic cliffs - wrinkled appearance) */}
            <div className="absolute top-[55%] left-[10%] w-[45%] h-[1%] bg-slate-400/20 blur-[1px] rounded-full rotate-[25deg] shadow-[0_1px_1px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute top-[30%] right-[20%] w-[35%] h-[1%] bg-slate-400/20 blur-[1px] rounded-full rotate-[-10deg] shadow-[0_1px_1px_rgba(0,0,0,0.5)]"></div>

            {/* 5. Volatile Vents (Hollows - bluish tint irregularities) */}
            <div className="absolute top-[40%] left-[35%] w-[5%] h-[5%] bg-blue-200/10 blur-[2px] rounded-full mix-blend-overlay"></div>
            <div className="absolute top-[45%] left-[32%] w-[4%] h-[4%] bg-blue-200/10 blur-[2px] rounded-full mix-blend-overlay"></div>

            {/* 6. Sun-Blasted Heat Shimmer (Intense) */}
            <div className="absolute top-[-15%] left-[-15%] w-[70%] h-[70%] bg-gradient-to-br from-orange-100/40 via-transparent to-transparent blur-[30px] rounded-full mix-blend-color-dodge animate-pulse"></div>

            {/* 7. Terminator Line (Sharper Day/Night transition) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,transparent_30%,rgba(0,0,0,0.6)_55%,rgba(0,0,0,0.95)_100%)] rounded-full"></div>

            {/* 8. Regolith Texture (Micro-noise) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMS41IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjIiLz48L3N2Zz4=')] opacity-35 mix-blend-multiply contrast-125"></div>

            {/* 9. Exosphere (Sodium Tail hint) */}
            <div className="absolute inset-[-10%] bg-yellow-100/10 blur-[30px] rounded-full mix-blend-screen pointer-events-none transform rotate-45 scale-x-110"></div>
        </>
    )
};
