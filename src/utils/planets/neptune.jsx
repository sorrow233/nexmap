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
            {/* 1. Great Dark Spot (Layered Anticyclone - Like GRS but colder) */}
            <div className="absolute top-[35%] left-[15%] w-[30%] h-[18%] bg-indigo-950/70 rounded-[50%] blur-[5px] rotate-[12deg] mix-blend-multiply"></div>
            <div className="absolute top-[38%] left-[18%] w-[22%] h-[12%] bg-slate-900/80 rounded-[50%] blur-[3px] rotate-[12deg] shadow-inner"></div>

            {/* 2. Scooter (Fast-moving White Cloud System) */}
            <div className="absolute bottom-[28%] left-[25%] w-[18%] h-[5%] bg-white/70 blur-[3px] rounded-full mix-blend-overlay animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_white]"></div>

            {/* 3. High-Speed Wind Streaks (Supersonic - 2000 km/h) */}
            <div className="absolute top-[22%] right-[15%] w-[40%] h-[2%] bg-white/35 blur-[2px] rounded-full rotate-[-8deg] mix-blend-screen shadow-[0_0_8px_white]"></div>
            <div className="absolute top-[55%] right-[25%] w-[25%] h-[2%] bg-white/25 blur-[2px] rounded-full rotate-[5deg] mix-blend-screen"></div>
            <div className="absolute top-[70%] left-[20%] w-[35%] h-[1.5%] bg-white/20 blur-[2px] rounded-full rotate-[-3deg] mix-blend-screen"></div>

            {/* 4. Small Dark Spot (Secondary Storm) */}
            <div className="absolute bottom-[20%] right-[20%] w-[12%] h-[8%] bg-indigo-950/50 rounded-full blur-[3px] mix-blend-multiply"></div>

            {/* 5. Methane Cirrus Clouds (High Altitude) */}
            <div className="absolute top-[18%] left-[30%] w-[20%] h-[8%] bg-white/40 blur-[6px] rounded-full mix-blend-overlay"></div>

            {/* 6. Deep Atmospheric Depth */}
            <div className="absolute inset-0 bg-blue-600/15 mix-blend-color-burn"></div>
            <div className="absolute inset-[5%] bg-indigo-800/10 blur-[10px] rounded-full mix-blend-multiply"></div>

            {/* 7. Atmospheric Limb Glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-indigo-300/20 blur-[1px]"></div>
        </>
    )
};
