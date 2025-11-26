import React from 'react';

export const uranusTexture = {
    background: 'radial-gradient(circle at 30% 30%, #cffafe 0%, #22d3ee 50%, #0e7490 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(21,94,117,0.6),_0_0_60px_rgba(103,232,249,0.3)]',
    detail: (
        <>
            {/* Icy Haze - Soft & Uniform */}
            <div className="absolute inset-[-10%] bg-cyan-100/20 blur-[40px] rounded-full mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.3)_50%,transparent_60%)] opacity-30"></div>
        </>
    )
};
