import React from 'react';

export const mercuryTexture = {
    background: 'radial-gradient(circle at 30% 30%, #f1f5f9 0%, #cbd5e1 40%, #64748b 100%)',
    shadow: 'shadow-[inset_-10px_-10px_20px_rgba(30,41,59,0.5),_0_0_20px_rgba(255,255,255,0.2)]',
    detail: (
        <>
            {/* Craters & Heat Haze */}
            <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_center,transparent_0,transparent_10px,rgba(0,0,0,0.05)_12px)] opacity-40 mix-blend-multiply"></div>
            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-slate-400/20 blur-[20px] rounded-full mix-blend-multiply"></div>
            <div className="absolute inset-[-10%] bg-orange-100/10 blur-[30px] animate-pulse-slow"></div>
        </>
    )
};
