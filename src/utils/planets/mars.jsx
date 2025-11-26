import React from 'react';

export const marsTexture = {
    background: 'radial-gradient(circle at 35% 35%, #fdba74 0%, #ea580c 50%, #7c2d12 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(67,20,7,0.7),_0_0_40px_rgba(234,88,12,0.3)]',
    detail: (
        <>
            {/* Dust Storms */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,0,0,0.1)_50%,transparent_60%)] animate-pulse-slow mix-blend-overlay"></div>
            <div className="absolute bottom-[20%] left-[20%] w-[50%] h-[30%] bg-orange-900/40 blur-[20px] rounded-full mix-blend-multiply"></div>
        </>
    )
};
