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
    // Surface: Metallic Slate -> Scorched White (Sun side) -> Deep Shadow (Dark side)
    background: 'radial-gradient(circle at 30% 30%, #f8fafc 0%, #cbd5e1 20%, #64748b 50%, #334155 80%, #0f172a 100%)',
    // Atmosphere: Virtually none, just a hard, sharp shadow with a faint sodium glow
    shadow: 'shadow-[inset_-20px_-20px_60px_rgba(2,6,23,0.9),_0_0_30px_rgba(255,255,255,0.15)]',
    detail: (
        <>
            {/* 1. Cratered Surface Texture (Procedural Noise Mask) */}
            <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/noise-texture.png')] opacity-30 mix-blend-overlay bg-repeat contrast-150 rounded-full"></div>

            {/* 2. Impact Craters (Stylized) */}
            <div className="absolute top-[25%] left-[30%] w-[15%] h-[15%] bg-slate-700/40 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6),_1px_1px_0px_rgba(255,255,255,0.2)] mix-blend-multiply blur-[1px]"></div>
            <div className="absolute bottom-[20%] right-[30%] w-[25%] h-[20%] bg-slate-800/30 rounded-full shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] mix-blend-multiply blur-[2px] rotate-45"></div>
            <div className="absolute top-[50%] left-[10%] w-[8%] h-[8%] bg-slate-600/50 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] mix-blend-multiply"></div>

            {/* 3. Sun-Blasted Heat Shimmer (The "Scorched" Effect) */}
            <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-orange-100/20 blur-[30px] rounded-full mix-blend-color-dodge animate-pulse-slow"></div>

            {/* 4. Terminator Line (Day/Night sharp transition) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,transparent_40%,rgba(0,0,0,0.4)_60%,rgba(0,0,0,0.8)_100%)] rounded-full z-10"></div>

            {/* 5. Tenuous Exosphere (Faint Sodium Tail hint) */}
            <div className="absolute inset-[-5%] bg-yellow-100/5 blur-[20px] rounded-full mix-blend-screen pointer-events-none"></div>
        </>
    )
};
