import React from 'react';

/**
 * Neptune - The Windiest Planet
 * Simplified design - deep blue with subtle cloud bands.
 */
export const neptuneTexture = {
    // Surface: Deep Azure/Indigo
    background: 'radial-gradient(circle at 40% 40%, #818cf8 0%, #6366f1 25%, #4f46e5 50%, #4338ca 75%, #3730a3 100%)',
    // Atmosphere: Intense indigo glow
    shadow: 'shadow-[inset_-15px_-15px_40px_rgba(30,27,75,0.9),_0_0_40px_rgba(99,102,241,0.4)]',
    detail: (
        <>
            {/* 1. Subtle banding (high-speed winds implied) */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0%,transparent_12%,rgba(255,255,255,0.05)_14%,transparent_18%)] mix-blend-overlay"></div>

            {/* 2. Soft cloud bands */}
            <div className="absolute top-[25%] left-0 w-full h-[6%] bg-gradient-to-r from-transparent via-white/15 to-transparent blur-[4px] mix-blend-screen"></div>
            <div className="absolute top-[55%] left-0 w-full h-[5%] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-[3px] mix-blend-screen"></div>

            {/* 3. Subtle storm feature (soft, not a harsh black spot) */}
            <div className="absolute top-[38%] left-[25%] w-[18%] h-[12%] bg-indigo-900/40 rounded-[50%] blur-[6px] mix-blend-multiply"></div>

            {/* 4. Companion cloud (next to storm) */}
            <div className="absolute top-[35%] left-[18%] w-[10%] h-[5%] bg-white/40 blur-[5px] rounded-full mix-blend-screen"></div>

            {/* 5. Deep atmospheric depth */}
            <div className="absolute inset-0 bg-blue-600/15 mix-blend-color-burn rounded-full"></div>

            {/* 6. Atmospheric limb glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-indigo-300/25 blur-[1px]"></div>
        </>
    )
};
