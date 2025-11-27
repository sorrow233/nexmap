import React from 'react';

export const neutronTexture = {
    background: 'radial-gradient(circle at 45% 45%, #ffffff 0%, #cffafe 20%, #22d3ee 50%, #0891b2 100%)',
    shadow: 'shadow-[0_0_60px_rgba(34,211,238,0.8),_inset_-4px_-4px_20px_rgba(8,145,178,0.8)]',
    detail: (
        <>
            {/* 1. Pulsar Beams (Lighthouse effect - Extreme Velocity) */}
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_44%,rgba(165,243,252,1)_49%,rgba(255,255,255,1)_50%,rgba(165,243,252,1)_51%,transparent_56%,transparent_94%,rgba(165,243,252,1)_99%,rgba(255,255,255,1)_100%)] animate-[spin_0.15s_linear_infinite] mix-blend-screen pointer-events-none blur-[2px]"></div>

            {/* 2. Magnetic Field Tori (Donut shaped fields) */}
            <div className="absolute inset-[-20%] border-[2px] border-cyan-400/50 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] scale-x-110"></div>
            <div className="absolute inset-[-40%] border-[1px] border-cyan-500/30 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] scale-y-110 animation-delay-100"></div>

            {/* 3. Accretion Stream (Feeding from unseen companion) */}
            <div className="absolute top-[-50%] right-[-30%] w-[80%] h-[2px] bg-white/40 blur-[1px] rotate-[45deg] mix-blend-screen"></div>

            {/* 4. Gravitational Redshift (Surface Color Gradient) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.9)_0%,rgba(34,211,238,0.8)_40%,rgba(8,145,178,0.9)_100%)] blur-[2px] rounded-full"></div>

            {/* 5. Crustal Plates / Starquakes (Cracking) */}
            <div className="absolute inset-[10%] border-t border-l border-white/60 rounded-full animate-ping opacity-30"></div>

            {/* 6. Hot Spots (Magnetic Pole impact zones) */}
            <div className="absolute top-[15%] left-[45%] w-[10%] h-[10%] bg-white rounded-full shadow-[0_0_20px_white] animate-[pulse_0.15s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-[15%] left-[45%] w-[10%] h-[10%] bg-white rounded-full shadow-[0_0_20px_white] animate-[pulse_0.15s_ease-in-out_infinite]"></div>

            {/* 7. Core Density (Singularity-like intensity) */}
            <div className="absolute inset-[30%] bg-white blur-[5px] rounded-full shadow-[0_0_50px_white,_0_0_80px_cyan] mix-blend-screen"></div>

            {/* 8. Synchrotron Radiation Halo */}
            <div className="absolute inset-[-20%] bg-cyan-400/10 blur-[15px] rounded-full animate-pulse"></div>
        </>
    )
};
