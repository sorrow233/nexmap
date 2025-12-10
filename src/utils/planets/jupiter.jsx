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
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNTUiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=')] opacity-35 mix-blend-overlay"></div>

            {/* 2. The Great Red Spot (Layered Anticyclone) */}
            <div className="absolute top-[55%] left-[20%] w-[35%] h-[22%] bg-red-900/60 rounded-[50%] blur-[5px] rotate-[-12deg] mix-blend-multiply"></div>
            <div className="absolute top-[58%] left-[23%] w-[28%] h-[16%] bg-red-700/80 rounded-[50%] blur-[3px] rotate-[-12deg] shadow-[inset_3px_3px_10px_rgba(0,0,0,0.5)] border border-red-950/40"></div>
            <div className="absolute top-[60%] left-[27%] w-[18%] h-[10%] bg-red-600/70 rounded-[50%] blur-[2px] rotate-[-12deg] animate-[spin_20s_linear_infinite]"></div>

            {/* 3. Oval BA ("Red Spot Jr.") */}
            <div className="absolute top-[42%] right-[15%] w-[12%] h-[8%] bg-red-500/50 rounded-full blur-[2px] shadow-[inset_1px_1px_4px_rgba(0,0,0,0.4)] mix-blend-multiply"></div>

            {/* 4. White Ovals (Anticyclones) */}
            <div className="absolute top-[35%] right-[25%] w-[10%] h-[5%] bg-white/50 blur-[3px] rounded-full mix-blend-screen animate-pulse-slow"></div>
            <div className="absolute top-[70%] left-[45%] w-[8%] h-[4%] bg-white/40 blur-[3px] rounded-full mix-blend-screen"></div>
            <div className="absolute top-[25%] left-[35%] w-[12%] h-[5%] bg-white/35 blur-[4px] rounded-full mix-blend-screen"></div>

            {/* 5. Brown Barges (Dark anticyclones) */}
            <div className="absolute top-[48%] left-[50%] w-[15%] h-[4%] bg-amber-950/40 blur-[2px] rounded-full mix-blend-multiply"></div>

            {/* 6. Equatorial Jet Stream (Fast-moving band) */}
            <div className="absolute top-[32%] left-0 w-full h-[5%] bg-gradient-to-r from-fef3c7/30 via-fcd34d/50 to-fef3c7/30 blur-[2px] mix-blend-overlay animate-[pulse_3s_ease-in-out_infinite]"></div>

            {/* 7. Polar Aurora */}
            <div className="absolute top-[-5%] left-[30%] w-[40%] h-[12%] bg-gradient-to-r from-cyan-400/20 via-purple-400/30 to-cyan-400/20 blur-[15px] rounded-full mix-blend-screen animate-pulse"></div>
            <div className="absolute bottom-[-5%] left-[35%] w-[30%] h-[10%] bg-gradient-to-r from-purple-400/15 via-cyan-400/20 to-purple-400/15 blur-[12px] rounded-full mix-blend-screen animate-pulse animation-delay-500"></div>

            {/* 8. Polar Haze */}
            <div className="absolute top-[-8%] left-0 w-full h-[18%] bg-slate-700/50 blur-[20px] mix-blend-multiply"></div>
            <div className="absolute bottom-[-8%] left-0 w-full h-[18%] bg-slate-700/50 blur-[20px] mix-blend-multiply"></div>
        </>
    )
};
