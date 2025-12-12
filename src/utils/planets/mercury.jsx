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

    // Surface: Premium Metallic Slate with deeply baked highlights
    background: 'radial-gradient(circle at 35% 35%, #f1f5f9 0%, #cbd5e1 25%, #64748b 50%, #334155 80%, #0f172a 100%)',
    // Shadow: Deep, ambient occlusion style shadow
    shadow: 'shadow-[inset_-16px_-16px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(203,213,225,0.4)]',
    detail: (
        <>
            {/* 1. Subtle Surface Texture (Noise) - Reduced opacity for cleaner look */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-20 mix-blend-overlay"></div>

            {/* 2. Caloris Basin - Reimagined as a soft depression, not a target */}
            <div className="absolute top-[20%] left-[20%] w-[35%] h-[35%] bg-gradient-to-br from-slate-400/10 to-slate-800/40 rounded-full blur-[8px] mix-blend-multiply opacity-80"></div>

            {/* 3. Organic Craters - Varied shapes, soft edges */}
            <div className="absolute top-[55%] left-[25%] w-[15%] h-[12%] bg-slate-700/30 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-[4px] rotate-12"></div>
            <div className="absolute top-[30%] right-[25%] w-[10%] h-[10%] bg-slate-700/30 rounded-full blur-[3px]"></div>
            <div className="absolute bottom-[25%] right-[35%] w-[18%] h-[15%] bg-slate-800/20 rounded-[50%_40%_30%_70%/60%_30%_70%_40%] blur-[6px]"></div>

            {/* 4. Sun-side Highlight - Intense reflection */}
            <div className="absolute top-[15%] left-[15%] w-[40%] h-[40%] bg-white/20 blur-[20px] rounded-full mix-blend-soft-light"></div>

            {/* 5. Terminator / Shadow side depth */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,transparent_40%,rgba(15,23,42,0.4)_70%,rgba(2,6,23,0.9)_100%)]"></div>
        </>
    )
};
