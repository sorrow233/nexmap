import React from 'react';

export const supernovaTexture = {
    background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #fef08a 10%, #f0abfc 25%, #d946ef 50%, #4c1d95 100%)',
    shadow: 'shadow-[0_0_60px_rgba(232,121,249,0.8),_inset_0_0_40px_rgba(255,255,255,0.8)]',
    detail: (
        <>
            {/* Explosive Debris Field */}
            <div className="absolute inset-[-20%] bg-[radial-gradient(circle,transparent_20%,rgba(255,255,255,0.2)_21%,transparent_22%)] animate-[spin_3s_linear_infinite] opacity-70 mix-blend-overlay scale-150"></div>
            <div className="absolute inset-[-10%] bg-[radial-gradient(circle,transparent_40%,rgba(232,121,249,0.4)_41%,transparent_45%)] animate-pulse-fast scale-125 mix-blend-screen"></div>

            {/* Cross Flare */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[2px] bg-white blur-[2px] animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[150%] bg-white blur-[2px] animate-pulse"></div>

            {/* Core Instability */}
            <div className="absolute inset-0 bg-white/30 animate-ping opacity-20 rounded-full"></div>
        </>
    )
};
