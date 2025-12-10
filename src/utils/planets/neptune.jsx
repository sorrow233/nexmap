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
            {/* 1. Great Dark Spot */}
            <div className="absolute top-[40%] left-[20%] w-[25%] h-[15%] bg-indigo-950/80 rounded-full blur-[4px] shadow-inner rotate-[15deg] mix-blend-multiply"></div>

            {/* 2. Scooter (Fast moving white cloud) */}
            <div className="absolute bottom-[30%] left-[30%] w-[15%] h-[4%] bg-white/60 blur-[3px] rounded-full mix-blend-overlay animate-pulse"></div>

            {/* 3. High Altitude Methane Clouds (Streaks) */}
            <div className="absolute top-[25%] right-[20%] w-[30%] h-[2%] bg-white/30 blur-[2px] rounded-full rotate-[-5deg] mix-blend-screen shadow-[0_0_10px_white]"></div>
            <div className="absolute top-[60%] right-[30%] w-[20%] h-[2%] bg-white/20 blur-[2px] rounded-full rotate-[5deg] mix-blend-screen"></div>

            {/* 4. Deep Atmospheric Depth */}
            <div className="absolute inset-0 bg-blue-500/10 mix-blend-color-burn"></div>
        </>
    )
};
