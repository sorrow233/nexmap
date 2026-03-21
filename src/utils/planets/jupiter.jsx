import React from 'react';

/**
 * Jupiter - The King of Planets
 * Simplified design focusing on iconic bands and Great Red Spot.
 */
export const jupiterTexture = {
    // Highly distinct, regal gas giant banding
    background: 'linear-gradient(165deg, #271001 0%, #78350f 15%, #c2410c 22%, #fde68a 30%, #fef3c7 35%, #92400e 45%, #b45309 52%, #fef3c7 62%, #ea580c 70%, #7c2d12 85%, #271001 100%)',
    // Majestic, deep volumetric shadows
    shadow: 'shadow-[inset_-35px_-35px_70px_rgba(20,5,0,0.95),0_0_60px_rgba(217,119,6,0.5),0_0_120px_rgba(245,158,11,0.2)]',
    detail: (
        <>
            {/* Intricate swirling storm turbulence */}
            <div className="absolute inset-[-10%] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJudXJiIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC4wMSAwLjUiIG51bU9jdGF2ZXM9IjUiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMSA0IDAgMCAwICAwIDEgMCAwIDAgIDAgMCAxIDAgMCAgMCAwIDAgMTAgLTUiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbnVyYikiIG9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==')] opacity-[0.85] mix-blend-color-burn rounded-full overflow-hidden blur-[1px]"></div>

            {/* Equatorial Bright Zone (Thick, glowing clouds) */}
            <div className="absolute top-[32%] left-[-10%] w-[120%] h-[12%] bg-gradient-to-r from-transparent via-orange-100/40 to-transparent blur-[6px] mix-blend-overlay rotate-[10deg]"></div>
            <div className="absolute top-[34%] left-[-10%] w-[120%] h-[8%] bg-white/20 blur-[4px] mix-blend-screen rotate-[10deg]"></div>

            {/* Temperate Banding with Flow */}
            <div className="absolute top-[60%] left-[-10%] w-[120%] h-[10%] bg-gradient-to-r from-transparent via-amber-200/30 to-transparent blur-[5px] mix-blend-color-dodge rotate-[10deg]"></div>
            
            {/* The Great Red Spot (Iconic, glowing, deep) */}
            <div className="absolute top-[52%] left-[22%] w-[32%] h-[18%] bg-gradient-to-br from-red-600/80 to-red-950/90 rounded-[50%] blur-[4px] rotate-[-5deg] mix-blend-multiply shadow-[0_0_15px_rgba(185,28,28,0.5)]"></div>
            
            {/* Eye of the storm */}
            <div className="absolute top-[54%] left-[26%] w-[22%] h-[12%] bg-gradient-to-br from-orange-400/60 to-red-700/80 rounded-[50%] blur-[2px] rotate-[-5deg] shadow-[inset_3px_3px_8px_rgba(0,0,0,0.6)] flex items-center justify-center">
                <div className="w-[40%] h-[40%] bg-red-950/60 rounded-[50%] blur-[1px]"></div>
            </div>

            {/* Oval BA (Red Spot Jr.) & string of pearls */}
            <div className="absolute top-[68%] left-[45%] w-[12%] h-[6%] bg-white/50 blur-[3px] rounded-[50%] rotate-[-5deg] mix-blend-screen shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.4)]"></div>
            <div className="absolute top-[70%] left-[60%] w-[8%] h-[4%] bg-white/40 blur-[2px] rounded-[50%] rotate-[-5deg] mix-blend-screen"></div>
            <div className="absolute top-[72%] left-[70%] w-[6%] h-[3%] bg-white/30 blur-[2px] rounded-[50%] rotate-[-5deg] mix-blend-screen"></div>

            {/* Northern Storms (Brown Barges) */}
            <div className="absolute top-[25%] left-[30%] w-[15%] h-[6%] bg-amber-950/80 rounded-[50%] blur-[3px] rotate-[10deg] mix-blend-multiply"></div>
            <div className="absolute top-[22%] left-[50%] w-[18%] h-[5%] bg-amber-950/70 rounded-[50%] blur-[3px] rotate-[10deg] mix-blend-multiply"></div>

            {/* Intense Polar Haze & Darkening */}
            <div className="absolute top-[-5%] left-[-5%] w-[110%] h-[20%] bg-gradient-to-b from-blue-900/40 to-transparent blur-[15px] mix-blend-multiply rounded-full"></div>
            <div className="absolute bottom-[-5%] left-[-5%] w-[110%] h-[20%] bg-gradient-to-t from-blue-900/40 to-transparent blur-[15px] mix-blend-multiply rounded-full"></div>

            {/* Specular Highlight (Gas giants have soft, broad highlights) */}
            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-yellow-100/15 blur-[40px] rounded-full mix-blend-screen pointer-events-none"></div>

            {/* Atmospheric Rim Glow */}
            <div className="absolute inset-0 rounded-full border-[2px] border-orange-200/30 blur-[2px] mix-blend-screen"></div>
        </>
    )
};
