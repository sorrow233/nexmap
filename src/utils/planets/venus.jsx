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
    // Surface: Thick Sulfuric Acid Haze (Creamy Yellow/White)
    background: 'radial-gradient(circle at 35% 35%, #fffbeb 0%, #fef3c7 20%, #fde68a 45%, #d97706 75%, #78350f 100%)',
    // Atmosphere: Extremely dense, scattering light
    shadow: 'shadow-[inset_-16px_-16px_40px_rgba(69,26,3,0.7),0_0_50px_rgba(251,191,36,0.3)]',
    detail: (
        <>
            {/* 1. Global Cloud Circulation - Smooth Conic Gradient */}
            <div className="absolute inset-[-40%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(245,158,11,0.15)_25%,transparent_50%,rgba(245,158,11,0.2)_75%,transparent_100%)] rounded-full animate-[spin_60s_linear_infinite] blur-3xl mix-blend-multiply"></div>

            {/* 2. Counter-Rotation Clouds - Subtle depth */}
            <div className="absolute inset-[-30%] bg-[conic-gradient(from_180deg,transparent_0%,rgba(252,211,77,0.1)_30%,transparent_60%,rgba(252,211,77,0.1)_90%)] rounded-full animate-[spin_80s_linear_infinite_reverse] blur-2xl mix-blend-overlay"></div>

            {/* 3. The "Y-Wave" - A massive but soft atmospheric feature */}
            <div className="absolute top-[30%] left-[-20%] w-[140%] h-[40%] bg-gradient-to-r from-transparent via-amber-700/10 to-transparent blur-[20px] -rotate-12 mix-blend-multiply transform skew-x-12"></div>

            {/* 4. Polar Vortex - Subtle swirl at the bottom */}
            <div className="absolute bottom-[2%] left-[50%] -translate-x-1/2 w-[40%] h-[15%] bg-amber-600/10 blur-[10px] rounded-full mix-blend-multiply"></div>

            {/* 5. Thick Atmosphere Glow - The "Morning Star" bloom */}
            <div className="absolute top-[15%] left-[15%] w-[45%] h-[45%] bg-white/40 blur-[35px] rounded-full mix-blend-screen pointer-events-none"></div>
            <div className="absolute top-[20%] left-[20%] w-[20%] h-[20%] bg-white/60 blur-[15px] rounded-full mix-blend-screen pointer-events-none"></div>

            {/* 6. Cloud Texture - Soft noise to break uniformity */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC41IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjIyIi8+PC9zdmc+')] opacity-20 mix-blend-multiply contrast-125"></div>

            {/* 7. Super-refraction - Bright edge glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-white/20 blur-[1px] mix-blend-overlay"></div>
            <div className="absolute inset-[-10%] bg-yellow-100/10 blur-[30px] rounded-full z-[-1]"></div>
        </>
    )
};
