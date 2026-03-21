import React from 'react';

/**
 * Venus - The Morning Star
 * Concept: Runaway greenhouse effect, thick choking atmosphere, violent super-rotation.
 * "Extreme" Optimization:
 * - Atmosphere: Multiple layers of spinning conic gradients to simulate wind bands.
 * - Pressure: Dense, opaque haze.
 * - Color: Sickly yellow-white (Sulfuric Acid) clouds.
 */
export const venusTexture = {
    // Richer, more vibrant surface gradient
    background: 'radial-gradient(circle at 30% 30%, #fef08a 0%, #fde047 20%, #eab308 45%, #b45309 75%, #451a03 100%)',
    // Intense, glowing atmosphere
    shadow: 'shadow-[inset_-25px_-25px_50px_rgba(69,26,3,0.9),0_0_60px_rgba(250,204,21,0.4),0_0_120px_rgba(234,179,8,0.2)]',
    detail: (
        <>
            {/* Extremely dense, swirling sulfuric clouds */}
            <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(234,179,8,0.2)_20%,transparent_40%,rgba(217,119,6,0.3)_60%,transparent_80%,rgba(250,204,21,0.2)_100%)] rounded-full animate-[spin_40s_linear_infinite] blur-3xl mix-blend-color-dodge"></div>
            
            {/* Inner counter-rotating cloud layer for depth */}
            <div className="absolute inset-[-40%] bg-[conic-gradient(from_180deg,transparent_0%,rgba(253,230,138,0.15)_25%,transparent_50%,rgba(245,158,11,0.2)_75%,transparent_100%)] rounded-full animate-[spin_50s_linear_infinite_reverse] blur-2xl mix-blend-overlay"></div>

            {/* Massive atmospheric "Y" wave pattern */}
            <div className="absolute top-[20%] left-[-30%] w-[160%] h-[50%] bg-gradient-to-r from-transparent via-amber-600/30 to-transparent blur-[25px] -rotate-12 mix-blend-multiply transform skew-x-12"></div>
            <div className="absolute top-[35%] left-[-20%] w-[140%] h-[40%] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent blur-[20px] -rotate-[25deg] mix-blend-color-dodge transform skew-x-12"></div>

            {/* Glowing poles */}
            <div className="absolute top-[2%] left-[50%] -translate-x-1/2 w-[50%] h-[20%] bg-yellow-200/30 blur-[15px] rounded-full mix-blend-overlay"></div>
            <div className="absolute bottom-[2%] left-[50%] -translate-x-1/2 w-[45%] h-[18%] bg-amber-600/40 blur-[15px] rounded-full mix-blend-multiply"></div>

            {/* The "Morning Star" blinding highlight */}
            <div className="absolute top-[12%] left-[12%] w-[40%] h-[40%] bg-white/70 blur-[30px] rounded-full mix-blend-screen pointer-events-none"></div>
            <div className="absolute top-[18%] left-[18%] w-[15%] h-[15%] bg-white flex items-center justify-center blur-[10px] rounded-full mix-blend-screen pointer-events-none"></div>

            {/* Surface noise / Cloud turbulence */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC41IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjI1Ii8+PC9zdmc+')] opacity-25 mix-blend-color-burn contrast-[1.5]"></div>

            {/* Super-refractive glowing edge */}
            <div className="absolute inset-0 rounded-full border-[2px] border-yellow-200/40 shadow-[inset_0_0_20px_rgba(253,224,71,0.5)] blur-[2px] mix-blend-screen"></div>
            <div className="absolute inset-[-15%] bg-yellow-400/10 blur-[40px] rounded-full z-[-1] animate-[pulse_4s_ease-in-out_infinite]"></div>
        </>
    )
};
