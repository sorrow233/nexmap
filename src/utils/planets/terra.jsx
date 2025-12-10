import React from 'react';

/**
 * Terra (Earth) - The Blue Marble
 * Concept: Vibrant oceans, teeming life, dynamic weather, protective atmosphere.
 * "Extreme" Optimization:
 * - Oceans: Deep, rich blue gradients with specularity.
 * - Atmosphere: Rayleigh Scattering (Blue Halo).
 * - Clouds: Realistic, disconnected cloud layers with shadows.
 * - Land: Subtly hinted green/brown continents.
 */
export const terraTexture = {
    // Surface: Deep Ocean Blue -> Turquoise Shelf -> Night Side Dark Blue
    background: 'radial-gradient(circle at 55% 40%, #bae6fd 0%, #3b82f6 25%, #1d4ed8 50%, #1e3a8a 80%, #020617 100%)',
    // Atmosphere: Glowing blue halo (Rayleigh scattering)
    shadow: 'shadow-[inset_-15px_-15px_60px_rgba(2,6,23,0.9),_0_0_30px_rgba(59,130,246,0.5),_0_0_5px_rgba(186,230,253,0.5)]',
    detail: (
        <>
            {/* 1. Continents (Abstract Geometric Hints) */}
            <div className="absolute top-[30%] right-[30%] w-[30%] h-[40%] bg-emerald-600/30 blur-[15px] rounded-[30%] mix-blend-overlay rotate-[20deg]"></div>
            <div className="absolute bottom-[20%] left-[25%] w-[35%] h-[20%] bg-emerald-700/20 blur-[10px] rounded-[40%] mix-blend-overlay"></div>

            {/* 2. Cloud Layer 1 (High Altitude - Slower) */}
            <div className="absolute inset-[-10%] bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/clouds-noise.png')] bg-cover opacity-60 mix-blend-screen animate-[spin_120s_linear_infinite]"></div>

            {/* 3. Cloud Layer 2 (Low Altitude - Faster & Shadowed) */}
            {/* Shadows for depth */}
            <div className="absolute inset-[-8%] bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/clouds-noise.png')] bg-cover opacity-20 mix-blend-multiply animate-[spin_90s_linear_infinite] ml-[2px] mt-[2px] invert"></div>
            {/* The Clouds */}
            <div className="absolute inset-[-8%] bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/clouds-noise.png')] bg-cover opacity-50 mix-blend-screen animate-[spin_90s_linear_infinite]"></div>

            {/* 4. Sun Glint (Specular Reflection on Water) */}
            <div className="absolute top-[35%] left-[45%] w-[10%] h-[10%] bg-white blur-[15px] animate-pulse-slow"></div>

            {/* 5. Terminator / Night Side Lights hint */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,transparent_60%,rgba(0,0,0,0.6)_80%)] rounded-full z-10"></div>
        </>
    )
};
