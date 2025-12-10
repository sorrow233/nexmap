import React from 'react';

export const supernovaTexture = {
    background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #fef08a 10%, #f0abfc 30%, #d946ef 60%, #4c1d95 100%)',
    shadow: 'shadow-[0_0_80px_rgba(232,121,249,0.9),_inset_0_0_50px_rgba(255,255,255,0.9)]',
    detail: (
        <>
            {/* 1. Primary Shockwave (Fastest expanding) */}
            <div className="absolute inset-[-20%] border-[2px] border-fuchsia-200/50 rounded-full animate-ping opacity-60"></div>

            {/* 2. Secondary Shockwave (Delayed) */}
            <div className="absolute inset-[-10%] border-[3px] border-purple-300/40 rounded-full animate-ping opacity-50 animation-delay-200"></div>

            {/* 3. Debris Shell (Spinning Nebula Remnant) */}
            <div className="absolute inset-[-30%] bg-[conic-gradient(from_0deg,transparent,rgba(232,121,249,0.4),transparent,rgba(192,132,252,0.3),transparent)] rounded-full animate-[spin_6s_linear_infinite] blur-lg mix-blend-screen"></div>
            <div className="absolute inset-[-25%] bg-[conic-gradient(from_90deg,transparent,rgba(251,191,36,0.2),transparent,rgba(251,191,36,0.2),transparent)] rounded-full animate-[spin_8s_linear_infinite_reverse] blur-md mix-blend-screen"></div>

            {/* 4. Neutron Star Core (Emerging from collapse) */}
            <div className="absolute inset-[30%] bg-cyan-200/80 blur-[8px] rounded-full animate-[pulse_0.5s_ease-in-out_infinite] shadow-[0_0_30px_cyan]"></div>

            {/* 5. Gamma Ray Burst (Polar Jets) */}
            <div className="absolute top-[-60%] left-[48%] w-[4%] h-[60%] bg-gradient-to-t from-white/60 via-fuchsia-300/40 to-transparent blur-[4px] mix-blend-screen animate-[pulse_1s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-[-60%] left-[48%] w-[4%] h-[60%] bg-gradient-to-b from-white/60 via-fuchsia-300/40 to-transparent blur-[4px] mix-blend-screen animate-[pulse_1s_ease-in-out_infinite]"></div>

            {/* 6. Core Collapse Flash */}
            <div className="absolute inset-0 bg-white blur-[25px] animate-pulse rounded-full mix-blend-overlay"></div>

            {/* 7. Lens Flare Artifacts */}
            <div className="absolute top-1/2 left-[-30%] w-[160%] h-[2px] bg-gradient-to-r from-transparent via-white to-transparent blur-[1px] mix-blend-overlay"></div>
            <div className="absolute left-1/2 top-[-30%] h-[160%] w-[2px] bg-gradient-to-b from-transparent via-white to-transparent blur-[1px] mix-blend-overlay"></div>
        </>
    )
};
