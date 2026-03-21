import React from 'react';

/**
 * Terra - cleaner blue marble with softer continents and atmosphere.
 */
export const terraTexture = {
    background: 'radial-gradient(circle at 30% 28%, #c7f2ff 0%, #7fd4fb 18%, #3a9fd5 42%, #1d5f9c 72%, #143a67 100%)',
    shadow: 'shadow-[inset_-22px_-20px_52px_rgba(6,25,46,0.62),0_0_42px_rgba(104,193,244,0.28)]',
    detail: (
        <>
            <div className="absolute inset-[3%] rounded-full bg-[radial-gradient(circle_at_24%_20%,rgba(255,255,255,0.55)_0%,transparent_34%)] mix-blend-screen"></div>

            <div className="absolute top-[12%] left-[10%] w-[28%] h-[24%] bg-gradient-to-br from-[#8fcf91]/85 via-[#4f9d72]/82 to-[#2f6952]/76 blur-[5px] rounded-[40%_60%_42%_58%/48%_44%_56%_52%] rotate-[-14deg]"></div>
            <div className="absolute top-[40%] left-[18%] w-[12%] h-[30%] bg-gradient-to-b from-[#68b37f]/78 to-[#39745d]/75 blur-[4px] rounded-[48%_52%_40%_60%/36%_64%_40%_60%] rotate-[12deg]"></div>
            <div className="absolute top-[16%] left-[44%] w-[42%] h-[42%] bg-gradient-to-br from-[#d0b56d]/42 via-[#69a36d]/70 to-[#2f6e58]/76 blur-[6px] rounded-[48%_52%_40%_60%/44%_40%_60%_56%] rotate-[4deg]"></div>
            <div className="absolute bottom-[23%] right-[16%] w-[14%] h-[10%] bg-gradient-to-br from-[#d5ae72]/56 to-[#8b6b49]/44 blur-[4px] rounded-[60%_40%_48%_52%]"></div>

            <div className="absolute top-[-3%] left-1/2 -translate-x-1/2 w-[42%] h-[11%] rounded-full bg-white/82 blur-[8px]"></div>
            <div className="absolute bottom-[-2%] left-1/2 -translate-x-1/2 w-[52%] h-[13%] rounded-full bg-white/78 blur-[9px]"></div>

            <div className="absolute top-[22%] left-[2%] w-[76%] h-[8%] rounded-full bg-white/44 blur-[12px] rotate-[8deg] mix-blend-screen"></div>
            <div className="absolute top-[46%] left-[10%] w-[80%] h-[6%] rounded-full bg-white/34 blur-[14px] rotate-[-4deg] mix-blend-screen"></div>
            <div className="absolute bottom-[26%] right-[4%] w-[64%] h-[7%] rounded-full bg-white/38 blur-[13px] rotate-[5deg] mix-blend-screen"></div>

            <div className="absolute inset-0 rounded-full border-[3px] border-sky-200/44 blur-[1px]"></div>
            <div className="absolute inset-[-4%] rounded-full bg-[radial-gradient(circle_at_50%_50%,transparent_48%,rgba(157,220,255,0.12)_70%,rgba(157,220,255,0.2)_100%)] pointer-events-none"></div>
        </>
    )
};
