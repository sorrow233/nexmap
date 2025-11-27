import React from 'react';

export const blackholeTexture = {
    background: 'black', // Vantablack base
    shadow: 'shadow-[0_0_60px_rgba(124,58,237,0.6),_inset_0_0_30px_rgba(255,255,255,0.8)]', // Radiating Hawking Radiation
    detail: (
        <>
            {/* 1. Doppler Beaming (Blue-shifted left side brighter, Red-shifted right dimmer) */}
            <div className="absolute inset-[-55%] bg-[conic-gradient(from_270deg,transparent_0%,rgba(168,85,247,0.1)_10%,rgba(67,56,202,0.9)_25%,rgba(255,255,255,0.8)_45%,rgba(67,56,202,0.9)_65%,rgba(168,85,247,0.1)_90%,transparent_100%)] rounded-full animate-[spin_2s_linear_infinite] mix-blend-screen blur-[8px]"></div>

            {/* 2. Inner Accretion Disk (Extreme warping) */}
            <div className="absolute inset-[-35%] bg-[conic-gradient(from_90deg,transparent_0%,#f97316_20%,#eab308_50%,#f97316_80%,transparent_100%)] rounded-full animate-[spin_3s_linear_infinite_reverse] opacity-80 mix-blend-screen blur-[5px]" style={{ transform: 'rotateX(70deg)' }}></div>

            {/* 3. Einstein Ring (Light bending around back) */}
            <div className="absolute inset-[-15%] border-[6px] border-white/20 rounded-full blur-[4px] shadow-[0_0_20px_rgba(255,255,255,0.4)] z-[-1]"></div>

            {/* 4. The Event Horizon (Pure Void) */}
            <div className="absolute inset-[10%] bg-black rounded-full z-10 shadow-[0_0_60px_#000,_inset_0_0_30px_#000]"></div>

            {/* 5. Photon Sphere (Sharpest light orbit) */}
            <div className="absolute inset-[10%] rounded-full border-[1.5px] border-white/80 z-20 shadow-[0_0_10px_white]"></div>

            {/* 6. Gravitational Lensing (Background distortion - Massive) */}
            <div className="absolute inset-[-70%] border-[40px] border-white/3 rounded-full animate-pulse-slow blur-[30px] -z-10"></div>

            {/* 7. Relativistic Jets (With Shock Diamonds) */}
            {/* Upper Jet */}
            <div className="absolute bottom-[50%] left-[45%] w-[10%] h-[120%] bg-gradient-to-t from-white via-purple-500 to-transparent blur-[6px] mix-blend-screen origin-bottom">
                <div className="absolute bottom-[20%] left-0 w-full h-[10%] bg-white/50 blur-[4px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[50%] left-0 w-full h-[10%] bg-white/40 blur-[5px] rounded-full animate-pulse animation-delay-200"></div>
            </div>
            {/* Lower Jet */}
            <div className="absolute top-[50%] left-[45%] w-[10%] h-[120%] bg-gradient-to-b from-white via-purple-500 to-transparent blur-[6px] mix-blend-screen origin-top">
                <div className="absolute top-[20%] left-0 w-full h-[10%] bg-white/50 blur-[4px] rounded-full animate-pulse"></div>
                <div className="absolute top-[50%] left-0 w-full h-[10%] bg-white/40 blur-[5px] rounded-full animate-pulse animation-delay-200"></div>
            </div>

            {/* 8. Hawking Radiation (Evaporation Glow) */}
            <div className="absolute inset-0 border border-purple-200/10 rounded-full z-30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] opacity-40"></div>
        </>
    )
};
