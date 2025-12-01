import React from 'react';

/**
 * Terra (Earth) - The Blue Marble
 * 三层设计: Background(海洋) | Middle(大陆) | Effect(大气层)
 */
export const terraTexture = {
    // ===== BACKGROUND LAYER =====
    // Ocean: Deep Azure to Indigo, light source at top-left
    background: 'radial-gradient(circle at 35% 35%, #7dd3fc 0%, #38bdf8 20%, #0284c7 50%, #075985 80%, #0c4a6e 100%)',

    // Shadow: Creates 3D depth and atmospheric rim glow
    shadow: 'shadow-[inset_-20px_-20px_50px_rgba(2,6,23,0.95),0_0_40px_rgba(56,189,248,0.5)]',

    // ===== MIDDLE LAYER (Continents, Ice) + EFFECT LAYER (Atmosphere, Clouds) =====
    detail: (
        <>
            {/* ===== MIDDLE LAYER: Landmasses ===== */}

            {/* North America - Green/Brown Continental Mass */}
            <div className="absolute top-[12%] left-[5%] w-[30%] h-[28%] bg-gradient-to-br from-emerald-500/70 via-green-600/60 to-amber-700/50 blur-[6px] rounded-[35%_65%_55%_45%/60%_40%_60%_40%] rotate-[-15deg]"></div>

            {/* South America - Elongated Green */}
            <div className="absolute top-[42%] left-[15%] w-[12%] h-[30%] bg-gradient-to-b from-emerald-600/65 to-green-700/55 blur-[5px] rounded-[50%_50%_45%_55%/40%_60%_40%_60%] rotate-[10deg]"></div>

            {/* Africa + Europe + Asia - Large Landmass */}
            <div className="absolute top-[15%] left-[45%] w-[40%] h-[45%] bg-gradient-to-br from-amber-600/50 via-emerald-600/60 to-green-700/55 blur-[7px] rounded-[50%_60%_40%_50%/55%_45%_55%_45%] rotate-[5deg]"></div>

            {/* Australia - Small, Brownish */}
            <div className="absolute bottom-[22%] right-[15%] w-[14%] h-[10%] bg-gradient-to-br from-amber-600/55 to-orange-700/45 blur-[4px] rounded-[60%_40%_50%_50%]"></div>

            {/* Antarctica - Southern Ice Cap */}
            <div className="absolute bottom-[-3%] left-[50%] -translate-x-1/2 w-[50%] h-[12%] bg-white/80 blur-[8px] rounded-full"></div>

            {/* Arctic - Northern Ice Cap */}
            <div className="absolute top-[-3%] left-[50%] -translate-x-1/2 w-[40%] h-[10%] bg-white/75 blur-[8px] rounded-full"></div>

            {/* ===== EFFECT LAYER: Atmosphere, Clouds, Glow ===== */}

            {/* Cloud Band 1: Northern Hemisphere */}
            <div className="absolute top-[20%] left-[0%] w-[70%] h-[8%] bg-white/50 blur-[12px] rounded-full rotate-[8deg] mix-blend-screen"></div>

            {/* Cloud Band 2: Equatorial / ITCZ */}
            <div className="absolute top-[45%] left-[10%] w-[80%] h-[6%] bg-white/40 blur-[15px] rounded-full rotate-[-3deg] mix-blend-screen"></div>

            {/* Cloud Band 3: Southern Hemisphere */}
            <div className="absolute bottom-[25%] right-[5%] w-[60%] h-[7%] bg-white/45 blur-[12px] rounded-full rotate-[5deg] mix-blend-screen"></div>

            {/* Specular Highlight (Sun Glint on Ocean) */}
            <div className="absolute top-[25%] left-[25%] w-[20%] h-[20%] bg-white/50 blur-[15px] rounded-full mix-blend-soft-light"></div>

            {/* Atmospheric Rim Glow (Rayleigh Scattering) */}
            <div className="absolute inset-0 rounded-full border-[3px] border-sky-300/40 blur-[2px]"></div>
            <div className="absolute inset-[-5%] bg-[radial-gradient(circle_at_50%_50%,transparent_45%,rgba(56,189,248,0.15)_70%,rgba(56,189,248,0.3)_100%)] rounded-full pointer-events-none"></div>
        </>
    )
};

