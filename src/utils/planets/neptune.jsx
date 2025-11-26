import React from 'react';

export const neptuneTexture = {
    background: 'radial-gradient(circle at 30% 30%, #818cf8 0%, #4338ca 50%, #1e1b4b 100%)',
    shadow: 'shadow-[inset_-10px_-10px_50px_rgba(30,27,75,0.8),_0_0_60px_rgba(99,102,241,0.4)]',
    detail: (
        <>
            {/* Dark Spot & Windy Atmosphere */}
            <div className="absolute top-[20%] right-[20%] w-[30%] h-[20%] bg-indigo-950/60 blur-[15px] rounded-full mix-blend-multiply"></div>
            <div className="absolute inset-[-20%] bg-blue-500/10 blur-[50px] mix-blend-screen animate-pulse-slow"></div>
        </>
    )
};
