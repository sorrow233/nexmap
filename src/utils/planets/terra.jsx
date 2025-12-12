import React from 'react';

/**
 * Terra (Earth) - The Blue Marble
 * Simplified design focusing on recognizable Earth features without cluttered elements.
 */
export const terraTexture = {
    // Ocean: Rich Azure -> Deep Indigo
    background: 'radial-gradient(circle at 45% 45%, #38bdf8 0%, #0ea5e9 40%, #0369a1 70%, #0c4a6e 100%)',
    // Atmosphere: Soft, glowing blue edges (Rayleigh Scattering)
    shadow: 'shadow-[inset_-10px_-10px_30px_rgba(2,6,23,0.9),_0_0_35px_rgba(56,189,248,0.6),_inset_6px_6px_20px_rgba(255,255,255,0.2)]',
    detail: (
        <>
            {/* 1. Continents - Simple blurred landmasses */}
            {/* North America/Europe region */}
            <div className="absolute top-[15%] left-[10%] w-[28%] h-[30%] bg-emerald-600/60 blur-[8px] rounded-[30%_70%_60%_40%/50%_40%_60%_50%] rotate-[-10deg] mix-blend-overlay"></div>
            {/* South America */}
            <div className="absolute top-[45%] left-[18%] w-[15%] h-[25%] bg-emerald-700/50 blur-[6px] rounded-[40%_60%_50%_50%] rotate-[15deg] mix-blend-overlay"></div>
            {/* Africa/Eurasia */}
            <div className="absolute top-[18%] right-[18%] w-[28%] h-[40%] bg-emerald-600/55 blur-[8px] rounded-[60%_40%_50%_50%] mix-blend-overlay"></div>
            {/* Australia */}
            <div className="absolute bottom-[20%] right-[20%] w-[15%] h-[12%] bg-amber-600/40 blur-[5px] rounded-[50%] mix-blend-overlay"></div>

            {/* 2. Cloud Layer - Soft, wispy clouds */}
            <div className="absolute inset-0 opacity-80 mix-blend-screen animate-[spin_160s_linear_infinite]">
                <div className="absolute top-[22%] left-[8%] w-[40%] h-[10%] bg-white/70 blur-[10px] rounded-full skew-x-6"></div>
                <div className="absolute bottom-[18%] right-[10%] w-[45%] h-[8%] bg-white/60 blur-[12px] rounded-full rotate-3"></div>
                <div className="absolute top-[50%] left-[30%] w-[25%] h-[20%] bg-white/50 blur-[15px] rounded-full"></div>
            </div>

            {/* 3. Counter-rotation cloud wisps */}
            <div className="absolute inset-0 opacity-50 mix-blend-screen animate-[spin_200s_linear_infinite_reverse]">
                <div className="absolute top-[35%] right-[15%] w-[30%] h-[8%] bg-white/50 blur-[12px] rounded-full -rotate-6"></div>
            </div>

            {/* 4. Specular Ocean Glint */}
            <div className="absolute top-[30%] left-[28%] w-[15%] h-[15%] bg-white/60 blur-[12px] rounded-full mix-blend-overlay"></div>

            {/* 5. Polar Ice Caps */}
            <div className="absolute top-[-2%] left-[35%] w-[30%] h-[12%] bg-white/70 blur-[10px] rounded-full mix-blend-overlay"></div>
            <div className="absolute bottom-[-2%] left-[38%] w-[24%] h-[10%] bg-white/60 blur-[10px] rounded-full mix-blend-overlay"></div>

            {/* 6. Atmospheric Rim */}
            <div className="absolute inset-0 rounded-full border-[2px] border-sky-300/30 blur-[1px] shadow-[0_0_15px_rgba(56,189,248,0.3)]"></div>
        </>
    )
};
