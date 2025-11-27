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
            {/* 1. Hexagonal Storm (North Pole - Sharp geometric edges) */}
            <div className="absolute top-[3%] left-[50%] -translate-x-1/2 w-[32%] h-[13%] bg-amber-700/40 blur-[3px] mix-blend-multiply" style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }}></div>
            <div className="absolute top-[5%] left-[50%] -translate-x-1/2 w-[22%] h-[9%] bg-amber-600/50 blur-[2px] mix-blend-multiply rounded-full animate-[spin_15s_linear_infinite]"></div>
            <div className="absolute top-[6%] left-[50%] -translate-x-1/2 w-[10%] h-[5%] bg-black/30 blur-[4px] rounded-full mix-blend-multiply"></div>

            {/* 2. Ring Shadow on Surface (Sharp cast shadow) */}
            <div className="absolute top-[52%] left-[-10%] w-[120%] h-[10%] bg-black/40 blur-[4px] rotate-[-12deg]"></div>
            <div className="absolute top-[53%] left-[-10%] w-[120%] h-[2%] bg-black/60 blur-[2px] rotate-[-12deg]"></div>

            {/* 3. Atmospheric Bands (Fine detail) */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0%,transparent_6%,rgba(161,98,7,0.05)_7%,transparent_8%)] mix-blend-multiply"></div>

            {/* 4. Dragon Storm (Large electrical storm in southern hemisphere) */}
            <div className="absolute bottom-[30%] left-[25%] w-[15%] h-[8%] bg-white/40 blur-[4px] rounded-full mix-blend-screen animate-pulse-slow"></div>

            {/* 5. Ring Spokes (Ghostly radial features on rings - implied by shadow play) */}
            <div className="absolute inset-[-40%] bg-[conic-gradient(from_0deg,transparent_0%,rgba(0,0,0,0.1)_5%,transparent_10%,rgba(0,0,0,0.1)_15%,transparent_20%)] blur-[20px] mix-blend-multiply animate-[spin_30s_linear_infinite] pointer-events-none"></div>

            {/* 6. Encke Gap (Thin dark line in outer ring - implied) */}
            <div className="absolute inset-[-35%] border-[1px] border-black/10 rounded-full blur-[1px] pointer-events-none"></div>

            {/* 7. Polar Aurora (UV glow) */}
            <div className="absolute top-[-4%] left-[20%] w-[60%] h-[12%] bg-gradient-to-r from-purple-500/20 via-blue-400/20 to-purple-500/20 blur-[10px] rounded-full mix-blend-screen animate-pulse"></div>

            {/* 8. Titan Shadow Transit */}
            <div className="absolute bottom-[40%] right-[30%] w-[4%] h-[4%] bg-black/60 blur-[2px] rounded-full mix-blend-multiply animate-[spin_40s_linear_infinite_reverse] origin-[-300%_-100%]"></div>

            {/* 9. Atmospheric Haze (Golden glow) */}
            <div className="absolute inset-0 bg-yellow-100/10 blur-[15px] rounded-full mix-blend-screen"></div>

            {/* 10. Limb Glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-yellow-200/20 blur-[1px]"></div>
        </>
    )
};
