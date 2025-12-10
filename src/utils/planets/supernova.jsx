import React from 'react';

export const supernovaTexture = {
    background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #fef08a 10%, #f0abfc 30%, #d946ef 60%, #4c1d95 100%)',
    shadow: 'shadow-[0_0_80px_rgba(232,121,249,0.9),_inset_0_0_50px_rgba(255,255,255,0.9)]',
    detail: (
        <>
            {/* 1. Primary Shockwave (Expanding Ring) */}
            <div className="absolute inset-[-10%] border-[2px] border-fuchsia-300/50 rounded-full animate-ping opacity-70"></div>

            {/* 2. Secondary Debris Cloud (Spinning) */}
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_0deg,transparent,rgba(232,121,249,0.3),transparent)] rounded-full animate-[spin_4s_linear_infinite] blur-md mix-blend-screen"></div>

            {/* 3. Core Collapse Flash */}
            <div className="absolute inset-0 bg-white/80 blur-[20px] animate-pulse rounded-full mix-blend-overlay"></div>

            {/* 4. Lens Flare Artifacts */}
            <div className="absolute top-1/2 left-[-20%] w-[140%] h-[1px] bg-white blur-[1px] mix-blend-overlay"></div>
            <div className="absolute left-1/2 top-[-20%] h-[140%] w-[1px] bg-white blur-[1px] mix-blend-overlay"></div>
        </>
    )
};
