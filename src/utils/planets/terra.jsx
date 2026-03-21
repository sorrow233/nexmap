import React from 'react';

/**
 * Terra (Earth) - The Blue Marble
 * 三层设计: Background(海洋) | Middle(大陆) | Effect(大气层)
 */
export const terraTexture = {
    // Deep, vibrant and realistic oceans
    background: 'radial-gradient(circle at 30% 30%, #38bdf8 0%, #0284c7 35%, #0369a1 55%, #082f49 80%, #020617 100%)',

    // Atmospheric rim scatter and deep space darkness
    shadow: 'shadow-[inset_-30px_-30px_60px_rgba(2,6,23,0.95),0_0_50px_rgba(56,189,248,0.4),0_0_100px_rgba(14,165,233,0.2)]',

    // ===== MIDDLE LAYER (Continents, Ice) + EFFECT LAYER (Atmosphere, Clouds) =====
    detail: (
        <>
            {/* ===== LUXURY CONTINENTS (More defined shapes, better depth) ===== */}

            {/* North America */}
            <div className="absolute top-[15%] left-[8%] w-[28%] h-[26%] bg-gradient-to-br from-emerald-400/80 via-green-600/70 to-amber-800/60 blur-[4px] rounded-[40%_60%_50%_40%/50%_45%_55%_45%] rotate-[-12deg] shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.5)]"></div>

            {/* Central America connection */}
            <div className="absolute top-[38%] left-[18%] w-[8%] h-[12%] bg-gradient-to-br from-green-500/70 to-emerald-800/60 blur-[3px] rounded-full rotate-[-25deg]"></div>

            {/* South America */}
            <div className="absolute top-[45%] left-[22%] w-[16%] h-[35%] bg-gradient-to-b from-emerald-500/80 via-green-700/70 to-lime-800/50 blur-[5px] rounded-[50%_40%_45%_55%/40%_60%_40%_60%] rotate-[15deg] shadow-[inset_-5px_-5px_12px_rgba(0,0,0,0.6)]"></div>

            {/* Africa / Eurasia edge (peeking from right) */}
            <div className="absolute top-[18%] right-[-15%] w-[45%] h-[55%] bg-gradient-to-bl from-amber-500/60 via-emerald-600/75 to-green-800/60 blur-[6px] rounded-[60%_40%_50%_50%/50%_55%_45%_50%] rotate-[8deg] shadow-[inset_-8px_-8px_15px_rgba(0,0,0,0.5)]"></div>

            {/* Ice Caps (Crisper) */}
            <div className="absolute bottom-[-2%] left-[50%] -translate-x-1/2 w-[55%] h-[12%] bg-gradient-to-t from-white to-white/70 blur-[5px] rounded-[50%_50%_0_0] opacity-95"></div>
            <div className="absolute top-[-2%] left-[45%] w-[40%] h-[10%] bg-gradient-to-b from-white to-white/60 blur-[5px] rounded-[0_0_50%_50%] opacity-90"></div>

            {/* ===== ATMOSPHERE & WEATHER (Dynamic, premium volumetric clouds) ===== */}

            {/* Swirling hurricane / cyclone */}
            <div className="absolute top-[40%] left-[50%] w-[12%] h-[12%] bg-white/70 rounded-full blur-[4px] mix-blend-screen animate-[spin_20s_linear_infinite]">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMSIgbnVtT2N0YXZlcz0iMiIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC41Ii8+PC9zdmc+')] opacity-50 mix-blend-overlay rounded-full"></div>
            </div>

            {/* Equatorial cloud band */}
            <div className="absolute top-[45%] left-[-10%] w-[120%] h-[8%] bg-white/40 blur-[10px] rounded-full rotate-[-5deg] mix-blend-screen overflow-hidden"></div>

            {/* Northern string of clouds */}
            <div className="absolute top-[22%] left-[5%] w-[80%] h-[12%] bg-white/50 blur-[12px] rounded-[40%_60%] rotate-[12deg] mix-blend-screen"></div>

            {/* Southern cloud formations */}
            <div className="absolute bottom-[28%] right-[5%] w-[70%] h-[10%] bg-white/45 blur-[10px] rounded-[60%_40%] rotate-[8deg] mix-blend-screen"></div>

            {/* Night side city lights (Only visible in shadow) */}
            <div className="absolute top-[25%] right-[5%] w-[25%] h-[35%] bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.6)_0%,transparent_70%)] blur-[4px] mix-blend-color-dodge opacity-80 rounded-full rotate-[-15deg]"></div>
            <div className="absolute top-[45%] right-[15%] w-[15%] h-[20%] bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.5)_0%,transparent_60%)] blur-[3px] mix-blend-color-dodge opacity-70 rounded-full"></div>

            {/* Specular Highlight (Ocean reflection) */}
            <div className="absolute top-[28%] left-[28%] w-[15%] h-[15%] bg-white/80 blur-[15px] rounded-full mix-blend-overlay"></div>
            <div className="absolute top-[32%] left-[32%] w-[8%] h-[8%] bg-white flex items-center justify-center blur-[5px] rounded-full mix-blend-screen opacity-90"></div>

            {/* Beautiful atmospheric rim scattering */}
            <div className="absolute inset-0 rounded-full border-[3px] border-sky-200/50 shadow-[inset_0_0_25px_rgba(56,189,248,0.7)] blur-[1px] mix-blend-screen"></div>
            <div className="absolute inset-[-8%] bg-[radial-gradient(circle_at_50%_50%,transparent_50%,rgba(14,165,233,0.15)_75%,rgba(56,189,248,0.3)_100%)] rounded-full pointer-events-none mix-blend-screen"></div>
        </>
    )
};

