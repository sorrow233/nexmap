import React from 'react';

export const sunTexture = {
    background: 'radial-gradient(circle at 45% 45%, #fff7ed 0%, #fbbf24 30%, #ea580c 70%, #9a3412 100%)',
    shadow: 'shadow-[0_0_100px_rgba(251,146,60,0.8),_inset_0_0_60px_rgba(255,237,213,0.5)]',
    detail: (
        <>
            {/* Plasma Surface Activity */}
            <div className="absolute inset-[-10%] bg-[url('https://raw.githubusercontent.com/catzz/aimainmap-assets/main/noise-texture.png')] opacity-20 mix-blend-overlay animate-[spin_100s_linear_infinite]"></div>
            {/* Coronal Ejection Simulation */}
            <div className="absolute inset-[-20%] bg-orange-500/20 blur-[60px] animate-pulse rounded-full mix-blend-screen"></div>
            <div className="absolute inset-0 bg-yellow-400/10 mix-blend-color-dodge hover:bg-yellow-400/30 transition-colors duration-700"></div>
        </>
    )
};
