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
    // Atmosphere: Soft, glowing blue edges + inner light
    shadow: 'shadow-[inset_-10px_-10px_30px_rgba(2,6,23,0.8),_0_0_40px_rgba(56,189,248,0.5),_inset_10px_10px_40px_rgba(255,255,255,0.1)]',
    detail: (
        <>
            {/* 1. Continents (Procedural Shapes) */}
            <div className="absolute top-[20%] left-[20%] w-[25%] h-[35%] bg-emerald-600/60 blur-[6px] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] rotate-12 mix-blend-overlay"></div>
            <div className="absolute top-[25%] right-[25%] w-[35%] h-[40%] bg-emerald-500/50 blur-[8px] rounded-[50%_20%_60%_40%] mix-blend-overlay"></div>
            <div className="absolute bottom-[20%] left-[35%] w-[20%] h-[20%] bg-emerald-700/50 blur-[5px] rounded-full mix-blend-overlay"></div>

            {/* 2. Cloud Layer (volumetric implementation) */}
            {/* Cloud Shadows (offset) */}
            <div className="absolute inset-0 opacity-30 mix-blend-multiply animate-[spin_120s_linear_infinite]">
                <div className="absolute top-[30%] left-[10%] w-[40%] h-[15%] bg-slate-900 blur-[8px] rounded-full"></div>
                <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[10%] bg-slate-900 blur-[10px] rounded-full rotate-12"></div>
                <div className="absolute top-[50%] left-[40%] w-[20%] h-[20%] bg-slate-900 blur-[12px] rounded-full"></div>
            </div>

            {/* Actual Clouds (White & Fluffy) */}
            <div className="absolute inset-0 opacity-90 animate-[spin_120s_linear_infinite]">
                {/* Cloud Bank 1 */}
                <div className="absolute top-[28%] left-[8%] w-[40%] h-[15%] bg-white blur-[6px] rounded-[100%] mix-blend-screen shadow-[0_0_10px_white]"></div>
                {/* Cloud Bank 2 */}
                <div className="absolute bottom-[18%] right-[8%] w-[50%] h-[10%] bg-white blur-[8px] rounded-[100%] rotate-12 mix-blend-screen"></div>
                {/* Hurricane/Cyclone Pattern */}
                <div className="absolute top-[50%] left-[40%] w-[20%] h-[20%] border-[8px] border-white/60 blur-[4px] rounded-full bg-white/10"></div>
            </div>

            {/* 3. Specular Sun Glint (The "Wet" look) */}
            <div className="absolute top-[30%] left-[30%] w-[25%] h-[25%] bg-radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 60%) blur-[12px] opacity-80 mix-blend-overlay"></div>

            {/* 4. Upper Atmosphere Fog (Edge blending) */}
            <div className="absolute inset-[2%] rounded-full border-[1px] border-white/20 blur-[1px]"></div>
        </>
    )
};
