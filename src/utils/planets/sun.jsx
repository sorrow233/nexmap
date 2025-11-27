import React from 'react';

/**
 * Sun - The Star
 * Concept: Blinding plasma ball, magnetic loops, coronal mass ejections.
 * Optimization:
 * - Brightness: Blinding core gradients.
 * - Dynamics: Rotating plasma noise.
 * - Atmosphere: Massive coronal glow.
 */
export const sunTexture = {
    // Surface: White-hot core -> Yellow -> Red limb
    background: 'radial-gradient(circle at 45% 45%, #ffffff 0%, #fef3c7 20%, #fbbf24 40%, #ea580c 70%, #7c2d12 100%)',
    // Atmosphere: Extremely large glow
    shadow: 'shadow-[0_0_100px_rgba(255,165,0,0.8),_inset_0_0_80px_rgba(255,237,213,0.6)]',
    detail: (
        <>
            {/* 1. Photosphere Granulation (Noise) */}
            <div className="absolute inset-[-10%] bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/noise-texture.png')] opacity-30 mix-blend-overlay animate-[spin_120s_linear_infinite] contrast-200"></div>

            {/* 2. Magnetic Arcs / Prominences */}
            <div className="absolute top-[-10%] left-[20%] w-[60%] h-[20%] border-t-[4px] border-yellow-200/40 rounded-full blur-[4px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-5%] right-[30%] w-[40%] h-[15%] border-b-[4px] border-orange-200/40 rounded-full blur-[4px] animate-pulse-slow"></div>

            {/* 3. Coronal Heat Haze */}
            <div className="absolute inset-[-20%] bg-orange-500/20 blur-[40px] animate-pulse rounded-full mix-blend-screen"></div>
        </>
    )
};
