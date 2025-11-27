import React from 'react';

/**
 * Sun - The Star
 * Concept: Blinding plasma ball, magnetic loops, coronal mass ejections.
 * Optimization:
 * - Brightness: Blinding core gradients.
 * - Dynamics: Rotating plasma noise.
 * - Atmosphere: Massive coronal glow.
 */
export const sunTexture = {
    // Surface: Blinding White/Yellow core -> Red fringes
    background: 'radial-gradient(circle at 50% 50%, #fef3c7 0%, #fcd34d 25%, #f59e0b 50%, #ea580c 75%, #991b1b 100%)',
    // Glow: Massive, pulsing corona
    shadow: 'shadow-[0_0_80px_rgba(251,191,36,0.6),_inset_0_0_40px_rgba(254,252,232,0.8)]',
    detail: (
        <>
            {/* 1. Photosphere Granulation (Convection Cells) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj48ZmlsdGVyIGlkPSJnIj48ZmVUdXJidWxlbmNlIHR5cGU9InR1cmJ1bGVuY2UiIGJhc2VGcmVxdWVuY3k9IjAuMDMiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjZykiIG9wYWNpdHk9IjAuNiIvPjwvc3ZnPg==')] mix-blend-overlay opacity-70 animate-pulse-slow"></div>

            {/* 2. Sunspots (Dark regions) */}
            <div className="absolute top-[35%] left-[40%] w-[12%] h-[12%] bg-orange-950/60 rounded-full blur-[2px] shadow-inner mix-blend-multiply"></div>
            <div className="absolute top-[38%] left-[43%] w-[6%] h-[6%] bg-red-950/80 rounded-full blur-[1px]"></div>
            <div className="absolute top-[55%] right-[30%] w-[8%] h-[8%] bg-orange-950/50 rounded-full blur-[2px] shadow-inner mix-blend-multiply"></div>

            {/* 3. Coronal Loops (Magnetic Arcs) */}
            <div className="absolute top-[10%] left-[15%] w-[70%] h-[40%] border-t-[3px] border-yellow-200/40 rounded-full blur-[3px] skew-x-6 animate-pulse-slow"></div>
            <div className="absolute bottom-[15%] right-[20%] w-[50%] h-[30%] border-b-[4px] border-orange-300/30 rounded-full blur-[4px] -skew-x-12 animate-pulse-slow animation-delay-500"></div>

            {/* 4. Magnetic Loop System (Spinning) */}
            <div className="absolute top-[15%] left-[15%] w-[70%] h-[70%] border-[2px] border-yellow-300/25 rounded-full skew-x-12 blur-[5px] animate-[spin_80s_linear_infinite]"></div>
            <div className="absolute top-[10%] right-[10%] w-[80%] h-[80%] border-[3px] border-orange-400/15 rounded-full -skew-y-12 blur-[8px] animate-[spin_60s_linear_infinite_reverse]"></div>

            {/* 5. Solar Flare (CME eruption) */}
            <div className="absolute top-[5%] left-[45%] w-[20%] h-[30%] bg-gradient-to-t from-transparent via-yellow-200/40 to-white/30 blur-[10px] rounded-full mix-blend-screen animate-[pulse_4s_ease-in-out_infinite] origin-bottom"></div>

            {/* 6. Core Intensity */}
            <div className="absolute inset-[25%] bg-white/50 blur-[25px] rounded-full animate-pulse shadow-[0_0_50px_white]"></div>

            {/* 7. Chromosphere Rim (Red edge) */}
            <div className="absolute inset-0 rounded-full border-[3px] border-red-500/30 blur-[2px]"></div>
        </>
    )
};
