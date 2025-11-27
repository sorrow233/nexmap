import React from 'react';

/**
 * Saturn - The Ringed Jewel
 * Concept: Pale gold, extensive ring system, hexagonal storm.
 * Optimization:
 * - Rings: Simulated via CSS perspective and huge borders (best attempt without true 3D).
 * - Atmosphere: Soft, hazy golden ammonia clouds.
 */
export const saturnTexture = {
    // Surface: Muted Gold/Tan bands
    background: 'linear-gradient(160deg, #713f12 0%, #a16207 20%, #eab308 40%, #fef9c3 50%, #eab308 60%, #ca8a04 80%, #713f12 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(66,32,6,0.7),_0_0_30px_rgba(253,224,71,0.2)]',
    detail: (
        <>
            {/* 1. Hexagonal Storm (North Pole - Iconic Feature) */}
            <div className="absolute top-[3%] left-[50%] -translate-x-1/2 w-[30%] h-[12%] bg-amber-700/30 blur-[3px] mix-blend-multiply" style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }}></div>
            <div className="absolute top-[5%] left-[50%] -translate-x-1/2 w-[20%] h-[8%] bg-amber-600/40 blur-[2px] mix-blend-multiply rounded-full animate-[spin_15s_linear_infinite]"></div>

            {/* 2. Ring Shadow on Surface (Cast shadow from rings) */}
            <div className="absolute top-[52%] left-[-5%] w-[110%] h-[8%] bg-black/30 blur-[6px] rotate-[-12deg]"></div>

            {/* 3. Atmospheric Bands (Subtle compared to Jupiter) */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0%,transparent_8%,rgba(161,98,7,0.1)_9%,transparent_10%)] mix-blend-multiply"></div>

            {/* 4. Storm Ovals */}
            <div className="absolute top-[35%] right-[20%] w-[12%] h-[6%] bg-white/30 blur-[3px] rounded-full mix-blend-screen"></div>
            <div className="absolute top-[65%] left-[30%] w-[8%] h-[4%] bg-white/20 blur-[2px] rounded-full mix-blend-screen"></div>

            {/* 5. Polar Aurora */}
            <div className="absolute top-[-3%] left-[25%] w-[50%] h-[10%] bg-gradient-to-r from-cyan-400/15 via-purple-400/20 to-cyan-400/15 blur-[12px] rounded-full mix-blend-screen animate-pulse"></div>

            {/* 6. Atmospheric Haze */}
            <div className="absolute inset-0 bg-yellow-100/15 blur-[12px] rounded-full mix-blend-screen"></div>

            {/* 7. Atmospheric Limb Glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-yellow-300/15 blur-[1px]"></div>
        </>
    )
};
