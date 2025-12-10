import React from 'react';

export const supernovaTexture = {
    background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #fef08a 10%, #f0abfc 30%, #d946ef 60%, #4c1d95 100%)',
    shadow: 'shadow-[0_0_80px_rgba(232,121,249,0.9),_inset_0_0_50px_rgba(255,255,255,0.9)]',
    detail: (
        <>
            {/* 1. Primary Shockwave (Fastest expanding - Asymmetrical) */}
            <div className="absolute inset-[-25%] border-[4px] border-fuchsia-200/50 rounded-[45%_55%_50%_50%] animate-ping opacity-60"></div>

            {/* 2. Secondary Shockwave (Delayed & Irregular) */}
            <div className="absolute inset-[-15%] border-[6px] border-purple-300/40 rounded-[50%_45%_55%_50%] animate-ping opacity-50 animation-delay-200 rotate-45"></div>

            {/* 3. Nebula Remnant (Complex swirling filaments) */}
            <div className="absolute inset-[-40%] bg-[conic-gradient(from_0deg,transparent,rgba(232,121,249,0.5),transparent,rgba(239,68,68,0.3),transparent)] rounded-full animate-[spin_8s_linear_infinite] blur-xl mix-blend-screen"></div>
            <div className="absolute inset-[-30%] bg-[conic-gradient(from_120deg,transparent,rgba(251,191,36,0.3),transparent,rgba(59,130,246,0.3),transparent)] rounded-full animate-[spin_10s_linear_infinite_reverse] blur-lg mix-blend-screen"></div>

            {/* 4. Ejecta Knots (Hot spots in debris field) */}
            <div className="absolute top-[-20%] left-[20%] w-[10%] h-[10%] bg-white blur-[4px] rounded-full mix-blend-overlay animate-pulse"></div>
            <div className="absolute bottom-[-15%] right-[30%] w-[8%] h-[8%] bg-white blur-[4px] rounded-full mix-blend-overlay animate-pulse animation-delay-300"></div>

            {/* 5. Neutron Star Core (Birth of the new star) */}
            <div className="absolute inset-[32%] bg-cyan-100 blur-[6px] rounded-full animate-[pulse_0.2s_ease-in-out_infinite] shadow-[0_0_40px_cyan]"></div>

            {/* 6. Gamma Ray Burst (Bipolar Jets - Extreme Energy) */}
            <div className="absolute top-[-80%] left-[45%] w-[10%] h-[80%] bg-gradient-to-t from-white/80 via-fuchsia-400/50 to-transparent blur-[6px] mix-blend-screen animate-[pulse_0.8s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-[-80%] left-[45%] w-[10%] h-[80%] bg-gradient-to-b from-white/80 via-fuchsia-400/50 to-transparent blur-[6px] mix-blend-screen animate-[pulse_0.8s_ease-in-out_infinite]"></div>

            {/* 7. Core Collapse Flash (Blinding Whiteout) */}
            <div className="absolute inset-0 bg-white blur-[30px] animate-[pulse_2s_ease-in-out_infinite] rounded-full mix-blend-lighten opacity-80"></div>

            {/* 8. Diffraction Spikes (Lens artifact) */}
            <div className="absolute top-1/2 left-[-40%] w-[180%] h-[2px] bg-gradient-to-r from-transparent via-white to-transparent blur-[1px] mix-blend-overlay"></div>
            <div className="absolute left-1/2 top-[-40%] h-[180%] w-[2px] bg-gradient-to-b from-transparent via-white to-transparent blur-[1px] mix-blend-overlay"></div>
        </>
    )
};
