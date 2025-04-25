import React from 'react';

const Background = () => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#F9F9F8]">
            {/* Soft Ambient Orbs */}
            <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_center,rgba(255,228,230,0.4),transparent_70%)] opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[100%] bg-[radial-gradient(circle,rgba(204,251,241,0.4),transparent_60%)] opacity-60"></div>

            {/* Grain Texture for Paper Feel */}
            <div className="absolute inset-0 opacity-[0.035] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-multiply"></div>
        </div>
    );
};

export default Background;
