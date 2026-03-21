import React from 'react';

/**
 * Jupiter - The King of Planets
 * Simplified design focusing on iconic bands and Great Red Spot.
 */
export const jupiterTexture = {
    // Surface: Complex banding (Orange/White/Brown)
    background: 'linear-gradient(170deg, #451a03 0%, #78350f 10%, #d97706 20%, #fcd34d 30%, #fffbeb 35%, #92400e 40%, #b45309 50%, #fef3c7 60%, #9a3412 70%, #7c2d12 85%, #451a03 100%)',
    shadow: 'shadow-[inset_-20px_-20px_60px_rgba(69,26,3,0.8),_0_0_40px_rgba(217,119,6,0.3)]',
    detail: (
        <>
            {/* 1. Turbulence Noise */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNTUiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4=')] opacity-35 mix-blend-overlay"></div>

            {/* 2. The Great Red Spot - Soft, blended oval */}
            <div className="absolute top-[55%] left-[18%] w-[28%] h-[16%] bg-red-800/50 rounded-[50%] blur-[6px] rotate-[-10deg] mix-blend-multiply"></div>
            <div className="absolute top-[57%] left-[21%] w-[20%] h-[11%] bg-red-600/60 rounded-[50%] blur-[4px] rotate-[-10deg] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.4)]"></div>

            {/* 3. White Zone Highlights */}
            <div className="absolute top-[30%] left-0 w-full h-[8%] bg-gradient-to-r from-transparent via-white/20 to-transparent blur-[3px] mix-blend-overlay"></div>
            <div className="absolute top-[58%] left-0 w-full h-[5%] bg-gradient-to-r from-transparent via-white/15 to-transparent blur-[2px] mix-blend-overlay"></div>

            {/* 4. Subtle storm ovals */}
            <div className="absolute top-[38%] right-[20%] w-[10%] h-[5%] bg-white/30 blur-[4px] rounded-full mix-blend-screen"></div>
            <div className="absolute top-[72%] left-[40%] w-[8%] h-[4%] bg-white/25 blur-[4px] rounded-full mix-blend-screen"></div>

            {/* 5. Polar Darkening */}
            <div className="absolute top-[-5%] left-0 w-full h-[15%] bg-amber-950/40 blur-[15px] mix-blend-multiply"></div>
            <div className="absolute bottom-[-5%] left-0 w-full h-[15%] bg-amber-950/40 blur-[15px] mix-blend-multiply"></div>
        </>
    )
};
