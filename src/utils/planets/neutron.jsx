import React from 'react';

export const neutronTexture = {
    background: 'radial-gradient(circle at 45% 45%, #ffffff 0%, #cffafe 20%, #22d3ee 50%, #0891b2 100%)',
    shadow: 'shadow-[0_0_60px_rgba(34,211,238,0.8),_inset_-4px_-4px_20px_rgba(8,145,178,0.8)]',
    detail: (
        <>
            {/* 1. Pulsar Beams (Rotating Cones - FAST) */}
            <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_45%,rgba(165,243,252,0.8)_50%,transparent_55%,transparent_95%,rgba(165,243,252,0.8)_100%)] animate-[spin_0.5s_linear_infinite] mix-blend-screen pointer-events-none blur-[4px]"></div>

            {/* 2. Magnetic Field Lines (Rings) */}
            <div className="absolute inset-[-10%] border border-cyan-400/40 rounded-full animate-pulse-fast scale-110"></div>
            <div className="absolute inset-[10%] border border-cyan-200/50 rounded-full animate-pulse-fast animation-delay-300"></div>

            {/* 3. Core Density (Small, intense center) */}
            <div className="absolute inset-[30%] bg-white blur-[5px] rounded-full shadow-[0_0_20px_white]"></div>
        </>
    )
};
