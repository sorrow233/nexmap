import React from 'react';

/**
 * Saturn - The Ringed Jewel
 * Simplified design focusing on gentle bands and ring shadow.
 */
export const saturnTexture = {
    // Surface: Muted Gold/Tan bands
    background: 'linear-gradient(160deg, #713f12 0%, #a16207 20%, #eab308 40%, #fef9c3 50%, #eab308 60%, #ca8a04 80%, #713f12 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(66,32,6,0.7),_0_0_30px_rgba(253,224,71,0.2)]',
    detail: (
        <>
            {/* 1. Subtle North Pole Darkening (No harsh hexagon) */}
            <div className="absolute top-[2%] left-[35%] w-[30%] h-[10%] bg-amber-800/30 blur-[8px] rounded-full mix-blend-multiply"></div>

            {/* 2. Ring Shadow on Surface - Soft gradient */}
            <div className="absolute top-[50%] left-[-5%] w-[110%] h-[8%] bg-gradient-to-b from-black/30 via-black/20 to-transparent blur-[6px] rotate-[-12deg]"></div>

            {/* 3. Subtle Atmospheric Bands */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0%,transparent_10%,rgba(161,98,7,0.08)_12%,transparent_15%)] mix-blend-multiply"></div>

            {/* 4. White Zone Highlights */}
            <div className="absolute top-[45%] left-0 w-full h-[4%] bg-gradient-to-r from-transparent via-yellow-100/30 to-transparent blur-[3px] mix-blend-overlay"></div>

            {/* 5. Soft Storm Feature */}
            <div className="absolute bottom-[28%] left-[30%] w-[12%] h-[6%] bg-white/25 blur-[5px] rounded-full mix-blend-screen"></div>

            {/* 6. Polar Darkening */}
            <div className="absolute bottom-[-3%] left-0 w-full h-[12%] bg-amber-900/30 blur-[12px] mix-blend-multiply"></div>

            {/* 7. Atmospheric Haze */}
            <div className="absolute inset-0 bg-yellow-100/8 blur-[10px] rounded-full mix-blend-screen"></div>

            {/* 8. Limb Glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-yellow-200/15 blur-[1px]"></div>
        </>
    )
};
