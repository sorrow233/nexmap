import React from 'react';

/**
 * Uranus - The Ice Giant
 * Simplified design - smooth cyan/teal ice giant.
 */
export const uranusTexture = {
    // Surface: Smooth Cyan/Teal gradient
    background: 'radial-gradient(circle at 40% 40%, #a5f3fc 0%, #67e8f9 30%, #22d3ee 55%, #06b6d4 80%, #0891b2 100%)',
    // Atmosphere: Soft cyan glow
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(8,145,178,0.8),_0_0_40px_rgba(165,243,252,0.4)]',
    detail: (
        <>
            {/* 1. Subtle banding (very faint) */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0%,transparent_15%,rgba(255,255,255,0.03)_16%,transparent_20%)] mix-blend-overlay"></div>

            {/* 2. Polar brightening (tilted axis) */}
            <div className="absolute top-[25%] left-[25%] w-[50%] h-[50%] bg-white/15 blur-[25px] rounded-full mix-blend-overlay"></div>

            {/* 3. Subtle cloud feature */}
            <div className="absolute top-[35%] right-[30%] w-[12%] h-[8%] bg-white/20 blur-[6px] rounded-full mix-blend-screen"></div>

            {/* 4. Deep methane haze */}
            <div className="absolute inset-0 bg-cyan-300/10 mix-blend-overlay rounded-full"></div>

            {/* 5. Atmospheric limb glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-cyan-200/25 blur-[1px]"></div>
        </>
    )
};
