import React from 'react';

export const saturnTexture = {
    background: 'radial-gradient(circle at 40% 40%, #fef9c3 0%, #eab308 60%, #a16207 100%)',
    shadow: 'shadow-[inset_-10px_-10px_40px_rgba(113,63,18,0.6),_0_0_50px_rgba(234,179,8,0.4)]',
    detail: (
        <>
            {/* Rings (Simulated with div + perspective) */}
            <div className="absolute inset-[-20%] border-[20px] border-amber-200/20 rounded-full scale-[1.4] skew-x-[60deg] skew-y-[10deg] blur-[5px] mix-blend-screen"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/10 to-transparent mix-blend-multiply"></div>
        </>
    )
};
