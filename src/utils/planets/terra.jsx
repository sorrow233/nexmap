import React from 'react';

export const terraTexture = {
    background: 'radial-gradient(circle at 55% 40%, #60a5fa 0%, #3b82f6 40%, #172554 100%)',
    shadow: 'shadow-[inset_-15px_-15px_60px_rgba(2,6,23,0.8),_0_0_60px_rgba(59,130,246,0.4)]',
    detail: (
        <>
            {/* Dynamic Clouds */}
            <div className="absolute inset-[-10%] bg-[radial-gradient(circle,transparent_40%,rgba(255,255,255,0.8)_100%)] opacity-30 animate-[spin_60s_linear_infinite] mix-blend-overlay blur-[5px]"></div>
            {/* Landmass hint (Abstract) */}
            <div className="absolute top-[20%] right-[30%] w-[40%] h-[50%] bg-emerald-500/20 blur-[15px] rounded-[40%] mix-blend-color-dodge"></div>
        </>
    )
};
