import React from 'react';

/**
 * Terra (Earth) - The Blue Marble (Remastered)
 * Concept: Photorealistic stylized earth with distinct landmasses and atmosphere.
 * Optimization:
 * - Landmasses: Procedural "continents" using distinct noise-edged gradients.
 * - Atmosphere: True Rayleigh scattering halo (light blue glow).
 * - Clouds: Multi-layer volumetric clouds to add depth.
 */
export const terraTexture = {
    // Ocean: Rich Azure -> Deep Indigo (Deep water)
    background: 'radial-gradient(circle at 45% 45%, #38bdf8 0%, #0ea5e9 40%, #0369a1 70%, #0c4a6e 100%)',
    // Atmosphere: Soft, glowing blue edges + inner light (Rayleigh Scattering)
    shadow: 'shadow-[inset_-10px_-10px_30px_rgba(2,6,23,0.9),_0_0_35px_rgba(56,189,248,0.6),_inset_6px_6px_20px_rgba(255,255,255,0.2)]',
    detail: (
        <>
            {/* 1. Continents - North America */}
            <div className="absolute top-[15%] left-[10%] w-[30%] h-[35%] bg-emerald-600/70 blur-[5px] rounded-[30%_70%_60%_40%/50%_40%_60%_50%] rotate-[-10deg] mix-blend-overlay"></div>
            {/* 1b. Continents - South America */}
            <div className="absolute top-[45%] left-[20%] w-[15%] h-[30%] bg-emerald-700/60 blur-[4px] rounded-[40%_60%_50%_50%] rotate-[15deg] mix-blend-overlay"></div>
            {/* 1c. Continents - Europe/Africa */}
            <div className="absolute top-[20%] right-[20%] w-[25%] h-[50%] bg-emerald-500/60 blur-[6px] rounded-[60%_40%_50%_50%] mix-blend-overlay"></div>
            {/* 1d. Continents - Australia */}
            <div className="absolute bottom-[15%] right-[15%] w-[18%] h-[15%] bg-amber-700/50 blur-[4px] rounded-[50%] mix-blend-overlay"></div>

            {/* 2. Cloud Layer (Moving - Main) */}
            <div className="absolute inset-0 opacity-90 mix-blend-screen animate-[spin_150s_linear_infinite]">
                <div className="absolute top-[25%] left-[5%] w-[45%] h-[12%] bg-white/90 blur-[6px] rounded-full skew-x-12 shadow-[0_0_10px_white]"></div>
                <div className="absolute bottom-[15%] right-[5%] w-[55%] h-[8%] bg-white/80 blur-[8px] rounded-full rotate-6"></div>
                <div className="absolute top-[55%] left-[35%] w-[25%] h-[25%] bg-white/70 blur-[10px] rounded-full"></div>
            </div>
            {/* 2b. Cloud Layer (Secondary - Counter-rotation) */}
            <div className="absolute inset-0 opacity-60 mix-blend-screen animate-[spin_200s_linear_infinite_reverse]">
                <div className="absolute top-[40%] right-[20%] w-[30%] h-[10%] bg-white/60 blur-[10px] rounded-full -rotate-12"></div>
                <div className="absolute bottom-[30%] left-[15%] w-[40%] h-[8%] bg-white/50 blur-[12px] rounded-full"></div>
            </div>

            {/* 3. Hurricane System (Animated) */}
            <div className="absolute top-[35%] left-[60%] w-[15%] h-[15%] border-[3px] border-white/60 rounded-full blur-[2px] animate-[spin_5s_linear_infinite] shadow-[inset_0_0_8px_white]"></div>

            {/* 4. Specular Ocean Glint (Sun reflection) */}
            <div className="absolute top-[30%] left-[30%] w-[15%] h-[15%] bg-white blur-[12px] rounded-full mix-blend-overlay opacity-90 animate-pulse-slow"></div>

            {/* 5. Night Side City Lights (Faint) */}
            <div className="absolute bottom-[30%] right-[30%] w-[5%] h-[5%] bg-yellow-400/40 blur-[3px] rounded-full mix-blend-screen"></div>
            <div className="absolute bottom-[40%] right-[40%] w-[3%] h-[3%] bg-yellow-400/30 blur-[2px] rounded-full mix-blend-screen"></div>
            <div className="absolute top-[60%] right-[25%] w-[4%] h-[4%] bg-yellow-400/30 blur-[2px] rounded-full mix-blend-screen"></div>

            {/* 6. Aurora Borealis (Northern Lights) */}
            <div className="absolute top-[-5%] left-[20%] w-[60%] h-[15%] bg-gradient-to-r from-green-400/30 via-cyan-400/20 to-purple-400/30 blur-[15px] rounded-full mix-blend-screen animate-pulse"></div>
            <div className="absolute bottom-[-5%] left-[30%] w-[40%] h-[10%] bg-gradient-to-r from-purple-400/20 via-green-400/20 to-cyan-400/30 blur-[10px] rounded-full mix-blend-screen animate-pulse animation-delay-500"></div>

            {/* 7. Atmospheric Rim (Rayleigh Scattering) */}
            <div className="absolute inset-0 rounded-full border-[2px] border-sky-300/30 blur-[1px]"></div>
        </>
    )
};


