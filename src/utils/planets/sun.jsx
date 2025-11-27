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
            {/* 1. Photosphere Granulation (High-res Convection) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj48ZmlsdGVyIGlkPSJnIj48ZmVUdXJidWxlbmNlIHR5cGU9InR1cmJ1bGVuY2UiIGJhc2VGcmVxdWVuY3k9IjAuMDQiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjZykiIG9wYWNpdHk9IjAuNTUiIvPjwvc3ZnPg==')] mix-blend-overlay opacity-80 animate-pulse-slow"></div>

            {/* 2. Limb Darkening (Atmospheric density gradient) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_60%,rgba(153,27,27,0.4)_85%,rgba(153,27,27,0.8)_100%)] rounded-full mix-blend-multiply"></div>

            {/* 3. Sunspots (Umbria and Penumbra structure) */}
            <div className="absolute top-[35%] left-[40%] w-[12%] h-[12%] bg-orange-950/70 rounded-full blur-[2px] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.8)] mix-blend-multiply border border-orange-900/40"></div>
            <div className="absolute top-[38%] left-[43%] w-[6%] h-[6%] bg-black/60 rounded-full blur-[1px]"></div>
            <div className="absolute top-[55%] right-[30%] w-[8%] h-[8%] bg-orange-950/60 rounded-full blur-[2px] shadow-inner mix-blend-multiply"></div>

            {/* 4. Giant Prominences (Massive looping plasma) */}
            <div className="absolute top-[-5%] left-[10%] w-[40%] h-[20%] border-t-[8px] border-orange-500/40 rounded-[100%] blur-[8px] animate-pulse-slow"></div>
            <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] border-r-[6px] border-yellow-500/30 rounded-full blur-[6px] animate-pulse-slow animation-delay-500"></div>

            {/* 5. Magnetic Loop System (Active Regions) */}
            <div className="absolute top-[15%] left-[15%] w-[70%] h-[70%] border-[2px] border-yellow-200/20 rounded-full skew-x-12 blur-[4px] animate-[spin_80s_linear_infinite]"></div>
            <div className="absolute top-[10%] right-[10%] w-[80%] h-[80%] border-[3px] border-orange-300/10 rounded-full -skew-y-12 blur-[6px] animate-[spin_60s_linear_infinite_reverse]"></div>

            {/* 6. Coronal Mass Ejection (CME - Explosive) */}
            <div className="absolute top-[5%] left-[45%] w-[25%] h-[40%] bg-gradient-to-t from-transparent via-yellow-100/50 to-white/20 blur-[12px] rounded-full mix-blend-screen animate-[pulse_5s_ease-in-out_infinite] origin-bottom transform scale-y-150"></div>

            {/* 7. Coronal Holes (Darker cooler regions) */}
            <div className="absolute top-[10%] left-[50%] w-[30%] h-[15%] bg-black/20 blur-[15px] rounded-full mix-blend-multiply"></div>

            {/* 8. Chromosphere Spicules (Fuzzy edge) */}
            <div className="absolute inset-[-2%] border-[4px] border-dashed border-orange-600/30 rounded-full animate-[spin_100s_linear_infinite] opacity-50"></div>

            {/* 9. Core Intensity (Blinding Center) */}
            <div className="absolute inset-[25%] bg-white/60 blur-[30px] rounded-full animate-pulse shadow-[0_0_60px_rgba(255,255,255,0.8)]"></div>
        </>
    )
};
