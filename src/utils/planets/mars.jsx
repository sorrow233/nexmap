import React from 'react';

/**
 * Mars - velvety rose rust with subtle canyon and haze layers.
 */
export const marsTexture = {
    background: 'radial-gradient(circle at 34% 26%, #ffd4b6 0%, #f6a475 18%, #dd6f4c 38%, #b4513d 62%, #78382d 84%, #4f241d 100%)',
    shadow: 'shadow-[inset_-18px_-18px_46px_rgba(62,22,18,0.58),0_0_34px_rgba(224,123,90,0.24)]',
    detail: (
        <>
            <div className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle_at_25%_22%,rgba(255,243,232,0.32)_0%,transparent_34%)] mix-blend-screen"></div>

            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjE1Ii8+PC9zdmc+')] opacity-20 mix-blend-soft-light"></div>

            <div className="absolute top-[49%] left-[16%] w-[58%] h-[4%] bg-[#6d2d24]/46 rounded-full blur-[4px] rotate-[-7deg] mix-blend-multiply"></div>
            <div className="absolute top-[46%] left-[24%] w-[38%] h-[2.5%] bg-[#8d4133]/34 rounded-full blur-[2px] rotate-[-9deg] mix-blend-multiply"></div>

            <div className="absolute top-[30%] left-[24%] w-[18%] h-[18%] bg-[#8c4031]/34 rounded-full blur-[5px] mix-blend-multiply"></div>
            <div className="absolute top-[28%] left-[20%] w-[26%] h-[26%] bg-[#ffd8bc]/12 rounded-full blur-[12px] mix-blend-screen"></div>
            <div className="absolute top-[38%] left-[44%] w-[11%] h-[11%] bg-[#8a3d31]/26 rounded-full blur-[4px] mix-blend-multiply"></div>
            <div className="absolute top-[46%] left-[32%] w-[13%] h-[13%] bg-[#8a3d31]/22 rounded-full blur-[4px] mix-blend-multiply"></div>

            <div className="absolute top-[-4%] left-1/2 -translate-x-1/2 w-[42%] h-[13%] bg-white/84 blur-[8px] rounded-full"></div>
            <div className="absolute bottom-[-4%] left-1/2 -translate-x-1/2 w-[36%] h-[10%] bg-[#ffd2b4]/28 blur-[10px] rounded-full mix-blend-screen"></div>

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_68%,transparent_40%,rgba(255,181,144,0.08)_70%,rgba(213,101,72,0.22)_100%)] mix-blend-screen"></div>
            <div className="absolute top-[18%] left-[16%] w-[46%] h-[46%] bg-[#ffe7d6]/18 blur-[28px] rounded-full mix-blend-screen"></div>
        </>
    )
};
