import React from 'react';

export const blackholeTexture = {
    background: 'black', // Vantablack base
    shadow: 'shadow-[0_0_60px_rgba(124,58,237,0.6),_inset_0_0_30px_rgba(255,255,255,0.8)]', // Radiating Hawking Radiation
    detail: (
        <>
            {/* 1. Accretion Disk (Primary Spin) */}
            <div className="absolute inset-[-40%] bg-[conic-gradient(from_0deg,transparent_0%,#4338ca_25%,#a855f7_50%,#4338ca_75%,transparent_100%)] rounded-full animate-[spin_3s_linear_infinite] opacity-80 mix-blend-screen blur-[8px]"></div>

            {/* 2. Accretion Disk (Secondary/Warped) */}
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_180deg,transparent_0%,#ec4899_40%,transparent_100%)] rounded-full animate-[spin_5s_linear_infinite_reverse] opacity-60 mix-blend-screen blur-[12px] transform rotate-x-60"></div>

            {/* 3. The Void (Event Horizon - Masking the center) */}
            <div className="absolute inset-[5%] bg-black rounded-full z-10 shadow-[0_0_40px_#000]"></div>

            {/* 4. Photon Ring (Inner white edge) */}
            <div className="absolute inset-[5%] rounded-full border border-white/40 z-20 shadow-[0_0_15px_white]"></div>

            {/* 5. Gravitational Lensing (Distortion Ripple) */}
            <div className="absolute inset-[-50%] border-[20px] border-white/5 rounded-full animate-pulse-slow blur-[20px] -z-10"></div>
        </>
    )
};
