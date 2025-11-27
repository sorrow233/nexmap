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
            {/* 1. Caloris Basin (Massive Impact Crater) */}
            <div className="absolute top-[25%] left-[25%] w-[35%] h-[35%] bg-slate-700/30 rounded-full blur-[4px] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.7),_2px_2px_3px_rgba(255,255,255,0.15)] mix-blend-multiply"></div>
            <div className="absolute top-[30%] left-[30%] w-[20%] h-[20%] bg-slate-600/20 rounded-full blur-[2px] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"></div>

            {/* 2. Secondary Craters */}
            <div className="absolute top-[60%] right-[20%] w-[18%] h-[18%] bg-slate-700/25 rounded-full blur-[3px] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.6),_1px_1px_1px_rgba(255,255,255,0.1)] mix-blend-multiply"></div>
            <div className="absolute bottom-[20%] left-[15%] w-[12%] h-[12%] bg-slate-600/30 rounded-full blur-[2px] shadow-[inset_1px_1px_4px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute top-[45%] left-[55%] w-[8%] h-[8%] bg-slate-700/20 rounded-full blur-[1px] shadow-inner"></div>
            <div className="absolute top-[15%] right-[30%] w-[10%] h-[10%] bg-slate-600/25 rounded-full blur-[2px] shadow-inner"></div>

            {/* 3. Lobate Scarps (Wrinkle Ridge) */}
            <div className="absolute top-[50%] left-[10%] w-[40%] h-[2%] bg-slate-500/30 blur-[1px] rounded-full rotate-[20deg]"></div>
            <div className="absolute top-[35%] right-[25%] w-[30%] h-[1.5%] bg-slate-500/25 blur-[1px] rounded-full rotate-[-15deg]"></div>

            {/* 4. Sun-Blasted Heat Shimmer (Animated) */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-orange-100/30 via-transparent to-transparent blur-[25px] rounded-full mix-blend-color-dodge animate-pulse"></div>

            {/* 5. Terminator Line (Day/Night transition) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,transparent_35%,rgba(0,0,0,0.5)_60%,rgba(0,0,0,0.9)_100%)] rounded-full"></div>

            {/* 6. Surface Noise (Crater fields) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMS4yIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjE1Ii8+PC9zdmc+')] opacity-30 mix-blend-multiply contrast-150"></div>

            {/* 7. Tenuous Exosphere (Sodium Tail hint) */}
            <div className="absolute inset-[-8%] bg-yellow-100/8 blur-[25px] rounded-full mix-blend-screen pointer-events-none"></div>
        </>
    )
};
