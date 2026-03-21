import React from 'react';

/**
 * Venus - soft pearl atmosphere with restrained cloud motion.
 */
export const venusTexture = {
    background: 'radial-gradient(circle at 32% 28%, #fffdf8 0%, #fff6ea 18%, #f7e4cb 38%, #e8c59f 64%, #c89a78 84%, #9f6e55 100%)',
    shadow: 'shadow-[inset_-18px_-18px_42px_rgba(103,62,37,0.34),0_0_42px_rgba(248,225,197,0.26)]',
    detail: (
        <>
            <div className="absolute inset-[-6%] rounded-full bg-[radial-gradient(circle_at_24%_20%,rgba(255,255,255,0.9)_0%,rgba(255,249,240,0.55)_18%,transparent_42%)] mix-blend-screen"></div>

            <div className="absolute inset-[8%] rounded-full bg-[conic-gradient(from_32deg,rgba(243,214,184,0.0)_0deg,rgba(241,205,172,0.55)_88deg,rgba(221,171,132,0.22)_150deg,rgba(244,222,196,0.0)_220deg,rgba(236,198,167,0.38)_300deg,rgba(243,214,184,0.0)_360deg)] blur-2xl animate-[spin_90s_linear_infinite] opacity-75"></div>

            <div className="absolute inset-[14%] rounded-full bg-[conic-gradient(from_210deg,rgba(255,245,232,0.0)_0deg,rgba(255,245,232,0.6)_95deg,rgba(230,190,154,0.2)_155deg,rgba(255,245,232,0.0)_235deg,rgba(245,214,185,0.45)_320deg,rgba(255,245,232,0.0)_360deg)] blur-xl animate-[spin_120s_linear_infinite_reverse] opacity-70"></div>

            <div className="absolute top-[28%] left-[-10%] w-[120%] h-[16%] rounded-full bg-gradient-to-r from-transparent via-white/42 to-transparent blur-[16px] rotate-[-10deg] mix-blend-screen"></div>
            <div className="absolute top-[48%] left-[-6%] w-[112%] h-[14%] rounded-full bg-gradient-to-r from-transparent via-[#e8c7aa]/45 to-transparent blur-[18px] rotate-[4deg] mix-blend-multiply"></div>
            <div className="absolute bottom-[18%] left-[6%] w-[88%] h-[12%] rounded-full bg-gradient-to-r from-transparent via-[#dcae88]/34 to-transparent blur-[16px] rotate-[11deg] mix-blend-multiply"></div>

            <div className="absolute top-[16%] left-[18%] w-[34%] h-[34%] rounded-full bg-white/48 blur-[26px] mix-blend-screen"></div>
            <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[24%] rounded-full bg-[#f3d4b6]/26 blur-[28px] mix-blend-screen"></div>

            <div className="absolute inset-0 rounded-full border border-white/32"></div>
            <div className="absolute inset-[2%] rounded-full border border-[#f1dcc7]/35 blur-[1px]"></div>
        </>
    )
};
