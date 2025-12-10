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
            {/* 1. Topography & Biomes (Detailed vegetation and deserts) */}
            {/* North America (Greener) */}
            <div className="absolute top-[15%] left-[10%] w-[30%] h-[35%] bg-emerald-700/80 blur-[4px] rounded-[30%_70%_60%_40%/50%_40%_60%_50%] rotate-[-10deg] mix-blend-overlay shadow-[2px_2px_4px_rgba(0,0,0,0.4)]"></div>
            {/* Sahara Desert (Yellowish) */}
            <div className="absolute top-[25%] right-[25%] w-[20%] h-[15%] bg-amber-200/40 blur-[6px] rounded-full mix-blend-overlay"></div>
            {/* Amazon Rainforest (Deep Green) */}
            <div className="absolute top-[45%] left-[20%] w-[18%] h-[25%] bg-emerald-900/70 blur-[5px] rounded-[40%_60%_50%_50%] rotate-[15deg] mix-blend-multiply"></div>
            {/* Europe/Asia */}
            <div className="absolute top-[15%] right-[15%] w-[30%] h-[40%] bg-emerald-600/70 blur-[6px] rounded-[60%_40%_50%_50%] mix-blend-overlay"></div>

            {/* 2. Cloud Layer 1 (Low Altitude - Casts Shadow on Ocean) */}
            <div className="absolute inset-0 opacity-90 mix-blend-normal animate-[spin_140s_linear_infinite]">
                {/* Shadow layer (Offset) */}
                <div className="absolute top-[26%] left-[6%] w-[45%] h-[12%] bg-black/30 blur-[8px] rounded-full skew-x-12"></div>
                <div className="absolute bottom-[16%] right-[6%] w-[55%] h-[8%] bg-black/30 blur-[10px] rounded-full rotate-6"></div>

                {/* Cloud layer */}
                <div className="absolute top-[25%] left-[5%] w-[45%] h-[12%] bg-white/95 blur-[5px] rounded-full skew-x-12 filter drop-shadow-md"></div>
                <div className="absolute bottom-[15%] right-[5%] w-[55%] h-[8%] bg-white/90 blur-[7px] rounded-full rotate-6"></div>
            </div>

            {/* 3. Cloud Layer 2 (High Altitude/Cirrus - Counter-rotation) */}
            <div className="absolute inset-0 opacity-70 mix-blend-screen animate-[spin_180s_linear_infinite_reverse]">
                <div className="absolute top-[40%] right-[20%] w-[35%] h-[12%] bg-white/70 blur-[10px] rounded-full -rotate-12"></div>
                <div className="absolute bottom-[30%] left-[15%] w-[45%] h-[10%] bg-white/60 blur-[12px] rounded-full"></div>
            </div>

            {/* 4. Hurricane System (Eye of the storm) */}
            <div className="absolute top-[35%] left-[60%] w-[18%] h-[18%] bg-gradient-to-br from-white via-transparent to-transparent rounded-full blur-[1px] animate-[spin_6s_linear_infinite] shadow-[inset_0_0_10px_white] opacity-90"></div>
            <div className="absolute top-[42%] left-[67%] w-[4%] h-[4%] bg-blue-900/50 rounded-full blur-[1px] z-10"></div>

            {/* 5. Moon Shadow (Eclipse hint) */}
            <div className="absolute top-[40%] left-[40%] w-[8%] h-[8%] bg-black/80 blur-[8px] rounded-full mix-blend-multiply opacity-60"></div>

            {/* 6. Specular Ocean Glint (Dynamic Reflection) */}
            <div className="absolute top-[30%] left-[30%] w-[18%] h-[18%] bg-white blur-[15px] rounded-full mix-blend-overlay opacity-100 animate-pulse-slow"></div>
            <div className="absolute top-[35%] left-[35%] w-[5%] h-[5%] bg-white blur-[4px] rounded-full mix-blend-screen animate-ping"></div>

            {/* 7. Night Side City Lights (Pulsing Grid) */}
            <div className="absolute bottom-[28%] right-[28%] w-[6%] h-[6%] bg-yellow-300/60 blur-[2px] rounded-full mix-blend-screen animate-pulse"></div>
            <div className="absolute bottom-[38%] right-[38%] w-[4%] h-[4%] bg-yellow-300/50 blur-[2px] rounded-full mix-blend-screen animate-pulse animation-delay-300"></div>
            <div className="absolute top-[58%] right-[22%] w-[5%] h-[5%] bg-yellow-300/40 blur-[2px] rounded-full mix-blend-screen"></div>

            {/* 8. Aurora Borealis (Volumetric Curtains) */}
            <div className="absolute top-[-8%] left-[15%] w-[70%] h-[20%] bg-gradient-to-b from-green-400/40 via-cyan-400/30 to-transparent blur-[12px] rounded-[50%] mix-blend-screen animate-[pulse_4s_ease-in-out_infinite]"></div>
            <div className="absolute top-[-5%] left-[25%] w-[50%] h-[10%] bg-purple-500/30 blur-[15px] rounded-full mix-blend-screen animate-pulse"></div>

            {/* 9. Atmospheric Scattering (Rayleigh Halo) */}
            <div className="absolute inset-0 rounded-full border-[3px] border-sky-400/40 blur-[2px] shadow-[0_0_20px_rgba(56,189,248,0.4)]"></div>
        </>
    )
};


