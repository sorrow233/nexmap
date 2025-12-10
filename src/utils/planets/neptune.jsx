import React from 'react';

/**
 * Neptune - The Windy Giant
 * Concept: Deep azure, fastest winds in solar system, Great Dark Spot.
 * Optimization:
 * - Color: Rich Royal Blue.
 * - Storms: High-speed streaks.
 * - Clouds: High altitude white cirrus clouds (Scooters).
 */
export const neptuneTexture = {
    // Surface: Rich Royal Blue
    background: 'radial-gradient(circle at 40% 40%, #6366f1 0%, #4338ca 30%, #312e81 60%, #1e1b4b 90%, #020617 100%)',
    shadow: 'shadow-[inset_-15px_-15px_40px_rgba(30,27,75,0.9),_0_0_40px_rgba(99,102,241,0.4)]',
    detail: (
        <>
            {/* 1. Great Dark Spot (Complex Core structure) */}
            <div className="absolute top-[35%] left-[15%] w-[32%] h-[20%] bg-indigo-950/80 rounded-[50%] blur-[5px] rotate-[12deg] mix-blend-multiply border border-indigo-900/30"></div>
            <div className="absolute top-[38%] left-[18%] w-[24%] h-[12%] bg-slate-950/90 rounded-[50%] blur-[3px] rotate-[12deg] shadow-inner"></div>

            {/* 2. Companion Clouds (Bright white formations near Dark Spot) */}
            <div className="absolute top-[32%] left-[12%] w-[15%] h-[5%] bg-white/80 blur-[4px] rounded-full rotate-[15deg] mix-blend-screen"></div>
            <div className="absolute top-[52%] left-[25%] w-[12%] h-[4%] bg-white/60 blur-[3px] rounded-full rotate-[10deg] mix-blend-screen"></div>

            {/* 3. Scooter (Fast-moving White Cloud System - Dynamic) */}
            <div className="absolute bottom-[28%] left-[25%] w-[20%] h-[6%] bg-white/75 blur-[4px] rounded-full mix-blend-overlay animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_white]"></div>

            {/* 4. High-Speed Wind Streaks (Supersonic - Casting shadows) */}
            <div className="absolute top-[22%] right-[15%] w-[45%] h-[2.5%] bg-white/40 blur-[2px] rounded-full rotate-[-8deg] mix-blend-screen shadow-[0_2px_4px_rgba(0,0,0,0.5)]"></div>
            <div className="absolute top-[55%] right-[25%] w-[28%] h-[2%] bg-white/30 blur-[2px] rounded-full rotate-[5deg] mix-blend-screen"></div>
            <div className="absolute top-[70%] left-[20%] w-[38%] h-[1.5%] bg-white/25 blur-[2px] rounded-full rotate-[-3deg] mix-blend-screen"></div>

            {/* 5. Small Dark Spot (Wizard's Eye) */}
            <div className="absolute bottom-[20%] right-[20%] w-[14%] h-[9%] bg-indigo-950/60 rounded-full blur-[3px] mix-blend-multiply border border-indigo-900/20"></div>
            <div className="absolute bottom-[24%] right-[24%] w-[4%] h-[4%] bg-white/50 blur-[3px] rounded-full"></div>

            {/* 6. Neptune Ring Arcs (Faint/Partial) */}
            <div className="absolute top-[50%] left-[-10%] w-[120%] h-[1px] bg-white/10 blur-[0.5px] rotate-[25deg]"></div>
            <div className="absolute top-[50%] left-[60%] w-[20%] h-[2px] bg-white/20 blur-[1px] rotate-[25deg]"></div>

            {/* 7. Methane Cirrus Clouds (High Altitude) */}
            <div className="absolute top-[18%] left-[30%] w-[22%] h-[8%] bg-white/45 blur-[7px] rounded-full mix-blend-overlay"></div>

            {/* 8. Deep Atmospheric Depth */}
            <div className="absolute inset-0 bg-blue-600/20 mix-blend-color-burn"></div>
            <div className="absolute inset-[5%] bg-indigo-900/40 blur-[20px] rounded-full mix-blend-multiply"></div>

            {/* 9. Atmospheric Limb Glow */}
            <div className="absolute inset-0 rounded-full border-[3px] border-indigo-200/30 blur-[2px]"></div>
        </>
    )
};
