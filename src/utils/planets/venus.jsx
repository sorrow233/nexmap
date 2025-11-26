import React from 'react';

export const venusTexture = {
    background: 'radial-gradient(circle at 40% 30%, #fef3c7 0%, #f59e0b 50%, #b45309 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(120,53,15,0.6),_0_0_50px_rgba(251,191,36,0.3)]',
    detail: (
        <>
            {/* Toxic Clouds - Rotating Thick Atmosphere */}
            <div className="absolute inset-[-20%] bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.2),transparent)] animate-[spin_20s_linear_infinite] opacity-60 mix-blend-soft-light blur-[20px]"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/30 to-yellow-200/30 mix-blend-overlay"></div>
        </>
    )
};
