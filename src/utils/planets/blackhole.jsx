import React from 'react';

export const blackholeTexture = {
    background: 'black', // Vantablack base
    shadow: 'shadow-[0_0_50px_rgba(79,70,229,0.5),_inset_0_0_20px_rgba(255,255,255,0.7)]', // Outer Glow + Photon Ring
    detail: (
        <>
            {/* Accretion Disk (Swirling gradients) */}
            <div className="absolute inset-[-40%] bg-[conic-gradient(from_0deg,#312e81,#818cf8,#c084fc,#312e81)] rounded-full animate-[spin_8s_linear_infinite] opacity-60 mix-blend-screen blur-[10px]"></div>
            <div className="absolute inset-[-35%] bg-[conic-gradient(from_180deg,transparent,#4f46e5,transparent)] rounded-full animate-[spin_4s_linear_infinite] opacity-80 mix-blend-lighten blur-[5px]"></div>

            {/* The Void (Clipping mask to ensure center stays black over the accretion disk) */}
            <div className="absolute inset-[2%] bg-black rounded-full z-10 box-decoration-clone shadow-[0_0_30px_#000]"></div>

            {/* Event Horizon Sparkle */}
            <div className="absolute inset-0 border-[1px] border-white/20 rounded-full z-20 animate-pulse-slow"></div>
        </>
    )
};
