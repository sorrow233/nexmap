import React from 'react';

export const neutronTexture = {
    background: 'radial-gradient(circle at 40% 40%, #ffffff 0%, #cffafe 30%, #22d3ee 60%, #0891b2 100%)',
    shadow: 'shadow-[0_0_80px_rgba(103,232,249,0.9),_inset_-4px_-4px_20px_rgba(8,145,178,0.8)]',
    detail: (
        <>
            {/* Ultra-fast Spin Blur */}
            <div className="absolute inset-[-5%] border-[2px] border-cyan-100/30 rounded-full animate-[spin_0.2s_linear_infinite] skew-x-12"></div>

            {/* Pulsar Beams (Conic) */}
            <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_45%,rgba(165,243,252,0.6)_50%,transparent_55%,transparent_95%,rgba(165,243,252,0.6)_100%)] animate-[spin_2s_linear_infinite] mix-blend-overlay pointer-events-none blur-[8px]"></div>

            {/* Magnetic Field Rings */}
            <div className="absolute inset-[-20%] border border-cyan-500/30 rounded-[100%] rotate-45 animate-pulse-fast"></div>
            <div className="absolute inset-[-20%] border border-cyan-500/30 rounded-[100%] -rotate-45 animate-pulse-fast animation-delay-500"></div>
        </>
    )
};
