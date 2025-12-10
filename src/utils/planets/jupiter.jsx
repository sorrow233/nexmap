import React from 'react';

export const jupiterTexture = {
    background: 'linear-gradient(160deg, #fde68a 0%, #d97706 20%, #92400e 40%, #78350f 60%, #451a03 100%)',
    shadow: 'shadow-[inset_-15px_-15px_50px_rgba(69,26,3,0.7),_0_0_60px_rgba(217,119,6,0.3)]',
    detail: (
        <>
            {/* Storm Bands - Animated */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.1),rgba(0,0,0,0.1)_20px,transparent_20px,transparent_40px)] mix-blend-multiply blur-[2px] opacity-60"></div>
            {/* Great Red Spot */}
            <div className="absolute top-[60%] left-[30%] w-[25%] h-[15%] bg-red-800/60 blur-[10px] rounded-full mix-blend-multiply shadow-inner"></div>
            <div className="absolute inset-[-10%] bg-orange-200/10 blur-[40px] mix-blend-overlay"></div>
        </>
    )
};
