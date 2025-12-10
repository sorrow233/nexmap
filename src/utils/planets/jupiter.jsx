import React from 'react';

/**
 * Jupiter - The King of Planets
 * Concept: Massive gas giant, turbulent storms, dynamic bands.
 * Optimization:
 * - Bands: High-frequency repeating gradients for storm bands.
 * - GRS: Glowing Great Red Spot with depth.
 * - Turbulence: Noise overlay.
 */
export const jupiterTexture = {
    // Surface: Complex banding (Orange/White/Brown)
    background: 'linear-gradient(170deg, #451a03 0%, #78350f 10%, #d97706 20%, #fcd34d 30%, #fffbeb 35%, #92400e 40%, #b45309 50%, #fef3c7 60%, #9a3412 70%, #7c2d12 85%, #451a03 100%)',
    shadow: 'shadow-[inset_-20px_-20px_60px_rgba(69,26,3,0.8),_0_0_40px_rgba(217,119,6,0.3)]',
    detail: (
        <>
            {/* 1. Turbulence / Storm Noise (Procedural Grain) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4=')] opacity-30 mix-blend-overlay"></div>

            {/* 2. The Great Red Spot (Anti-cyclonic storm) */}
            <div className="absolute top-[60%] left-[25%] w-[30%] h-[18%] bg-red-800/80 rounded-[50%] blur-[2px] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.4)] rotate-[-10deg] mix-blend-multiply border border-red-900/30"></div>

            {/* 3. Equatorial Storms (White ovals) */}
            <div className="absolute top-[45%] right-[10%] w-[15%] h-[5%] bg-white/40 blur-[4px] rounded-full mix-blend-screen animate-pulse-slow"></div>
            <div className="absolute top-[48%] right-[25%] w-[10%] h-[4%] bg-white/30 blur-[3px] rounded-full mix-blend-screen"></div>

            {/* 4. Polar Haze */}
            <div className="absolute top-[-10%] left-0 w-[100%] h-[20%] bg-slate-800/40 blur-[20px] mix-blend-multiply"></div>
            <div className="absolute bottom-[-10%] left-0 w-[100%] h-[20%] bg-slate-800/40 blur-[20px] mix-blend-multiply"></div>
        </>
    )
};
