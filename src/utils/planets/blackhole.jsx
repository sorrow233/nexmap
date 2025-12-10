import React from 'react';

export const blackholeTexture = {
    background: 'black', // Vantablack base
    shadow: 'shadow-[0_0_60px_rgba(124,58,237,0.6),_inset_0_0_30px_rgba(255,255,255,0.8)]', // Radiating Hawking Radiation
    detail: (
        <>
            {/* 1. Outer Accretion Disk (Primary Spin - Fast) */}
            <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0%,#4338ca_15%,#a855f7_30%,#ec4899_50%,#a855f7_70%,#4338ca_85%,transparent_100%)] rounded-full animate-[spin_2s_linear_infinite] opacity-70 mix-blend-screen blur-[10px]"></div>

            {/* 2. Inner Accretion Disk (Warped/Tilted) */}
            <div className="absolute inset-[-30%] bg-[conic-gradient(from_90deg,transparent_0%,#f97316_25%,#eab308_50%,#f97316_75%,transparent_100%)] rounded-full animate-[spin_3s_linear_infinite_reverse] opacity-80 mix-blend-screen blur-[6px]" style={{ transform: 'rotateX(60deg)' }}></div>

            {/* 3. Hottest Inner Edge (White-hot) */}
            <div className="absolute inset-[-10%] bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.5),transparent,rgba(255,255,255,0.5),transparent)] rounded-full animate-[spin_1s_linear_infinite] opacity-90 mix-blend-screen blur-[3px]"></div>

            {/* 4. The Void (Event Horizon - Pure Black) */}
            <div className="absolute inset-[8%] bg-black rounded-full z-10 shadow-[0_0_50px_#000,_inset_0_0_20px_#000]"></div>

            {/* 5. Photon Ring (Innermost stable orbit) */}
            <div className="absolute inset-[8%] rounded-full border-[2px] border-white/60 z-20 shadow-[0_0_20px_white]"></div>

            {/* 6. Gravitational Lensing Effect (Background distortion) */}
            <div className="absolute inset-[-60%] border-[30px] border-white/3 rounded-full animate-pulse-slow blur-[25px] -z-10"></div>
            <div className="absolute inset-[-40%] border-[15px] border-purple-400/5 rounded-full animate-[pulse_3s_ease-in-out_infinite] blur-[15px] -z-10"></div>

            {/* 7. Hawking Radiation (Particle emission) */}
            <div className="absolute inset-[5%] border border-cyan-200/20 rounded-full z-30 animate-ping opacity-30"></div>

            {/* 8. Jets (Polar Relativistic Outflows) */}
            <div className="absolute top-[-80%] left-[48%] w-[4%] h-[80%] bg-gradient-to-t from-purple-500/40 to-transparent blur-[8px] mix-blend-screen"></div>
            <div className="absolute bottom-[-80%] left-[48%] w-[4%] h-[80%] bg-gradient-to-b from-purple-500/40 to-transparent blur-[8px] mix-blend-screen"></div>
        </>
    )
};
