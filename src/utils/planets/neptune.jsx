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
    // Surface: Deep Royal Blue
    background: 'radial-gradient(circle at 40% 40%, #6366f1 0%, #4338ca 40%, #312e81 70%, #1e1b4b 100%)',
    shadow: 'shadow-[inset_-15px_-15px_50px_rgba(2,6,23,0.8),_0_0_60px_rgba(79,70,229,0.5)]',
    detail: (
        <>
            {/* 1. Great Dark Spot */}
            <div className="absolute top-[30%] right-[20%] w-[25%] h-[15%] bg-indigo-950/80 blur-[8px] rounded-full mix-blend-multiply"></div>

            {/* 2. "Scooter" Clouds (High Altitude White Streaks) */}
            <div className="absolute top-[25%] right-[25%] w-[15%] h-[2%] bg-white/60 blur-[2px] rounded-full shadow-[0_0_5px_white]"></div>
            <div className="absolute bottom-[20%] left-[30%] w-[20%] h-[3%] bg-white/40 blur-[3px] rounded-full"></div>

            {/* 3. Wind Streaks */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,rgba(255,255,255,0.02)_25px)] opacity-50"></div>
        </>
    )
};
