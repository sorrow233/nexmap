import React from 'react';

export const neutronTexture = {
    background: 'radial-gradient(circle at 45% 45%, #ffffff 0%, #cffafe 20%, #22d3ee 50%, #0891b2 100%)',
    shadow: 'shadow-[0_0_60px_rgba(34,211,238,0.8),_inset_-4px_-4px_20px_rgba(8,145,178,0.8)]',
    detail: (
        <>
            {/* 1. Pulsar Beams (Dual Cones - Ultra Fast) */}
            <div className="absolute inset-[-120%] bg-[conic-gradient(from_0deg,transparent_42%,rgba(165,243,252,0.9)_48%,rgba(255,255,255,0.8)_50%,rgba(165,243,252,0.9)_52%,transparent_58%,transparent_92%,rgba(165,243,252,0.9)_98%,rgba(255,255,255,0.8)_100%)] animate-[spin_0.3s_linear_infinite] mix-blend-screen pointer-events-none blur-[3px]"></div>

            {/* 2. Secondary Beam (Offset axis) */}
            <div className="absolute inset-[-80%] bg-[conic-gradient(from_90deg,transparent_45%,rgba(34,211,238,0.5)_50%,transparent_55%)] animate-[spin_0.4s_linear_infinite_reverse] mix-blend-screen blur-[6px] opacity-60"></div>

            {/* 3. Magnetosphere (Magnetic Field Lines) */}
            <div className="absolute inset-[-15%] border-[2px] border-cyan-300/40 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]"></div>
            <div className="absolute inset-[-25%] border border-cyan-400/30 rounded-full animate-[pulse_1s_ease-in-out_infinite] animation-delay-200"></div>
            <div className="absolute inset-[-35%] border border-cyan-500/20 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] animation-delay-400"></div>

            {/* 4. "Hot Spots" (Radio emission origins) */}
            <div className="absolute top-[10%] left-[45%] w-[10%] h-[10%] bg-white blur-[3px] rounded-full shadow-[0_0_15px_white] animate-[pulse_0.2s_ease-in-out_infinite]"></div>
            <div className="absolute bottom-[10%] left-[45%] w-[10%] h-[10%] bg-white blur-[3px] rounded-full shadow-[0_0_15px_white] animate-[pulse_0.2s_ease-in-out_infinite]"></div>

            {/* 5. Core (Extreme Density - Small & Intense) */}
            <div className="absolute inset-[35%] bg-white blur-[4px] rounded-full shadow-[0_0_30px_white,_0_0_60px_cyan]"></div>

            {/* 6. "Glitch" Effect (Starquake Pulse) */}
            <div className="absolute inset-0 border-[1px] border-white/30 rounded-full animate-ping opacity-40"></div>
        </>
    )
};
