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
            {/* 2. Hexagonal Storm (North Pole) */}
            <div className="absolute top-[5%] left-[50%] -translate-x-1/2 w-[25%] h-[10%] bg-amber-600/20 blur-[2px] mix-blend-multiply clip-path-polygon-[50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%]"></div>

            {/* 3. Atmospheric Haze */}
            <div className="absolute inset-0 bg-yellow-100/10 blur-[10px] rounded-full mix-blend-screen"></div>
        </>
    )
};
