import React from 'react';

/**
 * Sun - Our Star
 * Simplified design - glowing yellow/orange sphere without harsh sunspots.
 */
export const sunTexture = {
    // Surface: Blindingly bright core with turbulent plasma
    background: 'radial-gradient(circle at 50% 50%, #fffbeb 0%, #fef3c7 20%, #fbbf24 40%, #f59e0b 60%, #b45309 80%, #78350f 100%)',
    // Glow: Massive Coronal Ejection
    shadow: 'shadow-[0_0_100px_rgba(251,191,36,0.8),_inset_0_0_60px_rgba(255,255,255,0.7)]',
    detail: (
        <>
            {/* 1. Photospheric Granulation - Intense Turbulence */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9InR1cmJ1bGVuY2UiIGJhc2VGcmVxdWVuY3k9IjAuMDUiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbikgb3BhY2l0eT0iMC42Ii8+PC9zdmc+')] mix-blend-overlay opacity-60 animate-pulse-slow"></div>

            {/* 2. Solar Flare Ejections (Dynamic loops) */}
            <div className="absolute top-[-10%] left-[20%] w-[60%] h-[120%] border-[8px] border-yellow-500/30 rounded-[50%] blur-[8px] animate-[spin_20s_linear_infinite] mix-blend-screen opacity-50"></div>
            <div className="absolute top-[10%] left-[-10%] w-[120%] h-[80%] border-[6px] border-orange-500/30 rounded-[50%] blur-[10px] animate-[spin_15s_linear_infinite_reverse] mix-blend-screen opacity-40"></div>

            {/* 3. Sunspots - Realistic Dark Umbra/Penumbra */}
            <div className="absolute top-[40%] left-[35%] w-[6%] h-[4%] bg-amber-950/80 rounded-full blur-[2px] shadow-[0_0_4px_rgba(180,83,9,0.8)]"></div>
            <div className="absolute top-[38%] left-[70%] w-[4%] h-[3%] bg-amber-950/70 rounded-full blur-[1px]"></div>
            <div className="absolute bottom-[30%] right-[30%] w-[8%] h-[5%] bg-amber-950/75 rounded-full blur-[3px] rotate-12"></div>

            {/* 4. Core Pulsation - Heart of the Star */}
            <div className="absolute inset-[15%] bg-white/50 blur-[40px] rounded-full animate-pulse mix-blend-soft-light"></div>

            {/* 5. Magnetic Field Lines (Plasma Loops) */}
            <div className="absolute inset-[-10%] border-[2px] border-orange-300/20 rounded-full blur-[2px] animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]"></div>

            {/* 6. Coronal Haze - The Atmosphere */}
            <div className="absolute inset-[-20%] bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-transparent blur-2xl rounded-full pointer-events-none"></div>

            {/* 7. Surface Eruption Highlights */}
            <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-yellow-100/60 blur-[15px] rounded-full mix-blend-overlay animate-bounce-slow"></div>
        </>
    )
};
