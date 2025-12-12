import React from 'react';

/**
 * Sun - Our Star
 * Simplified design - glowing yellow/orange sphere without harsh sunspots.
 */
export const sunTexture = {
    // Surface: Brilliant Yellow-Orange gradient
    background: 'radial-gradient(circle at 45% 45%, #fefce8 0%, #fef08a 20%, #fbbf24 45%, #f59e0b 70%, #d97706 90%, #b45309 100%)',
    // Coronal Glow
    shadow: 'shadow-[0_0_80px_rgba(251,191,36,0.6),_inset_0_0_40px_rgba(254,252,232,0.8)]',
    detail: (
        <>
            {/* 1. Photosphere granulation (subtle texture) */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj48ZmlsdGVyIGlkPSJnIj48ZmVUdXJidWxlbmNlIHR5cGU9InR1cmJ1bGVuY2UiIGJhc2VGcmVxdWVuY3k9IjAuMDMiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjZykiIG9wYWNpdHk9IjAuNCIvPjwvc3ZnPg==')] mix-blend-overlay opacity-50"></div>

            {/* 2. Limb darkening (natural solar edge) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_55%,rgba(180,83,9,0.3)_85%,rgba(180,83,9,0.6)_100%)] rounded-full mix-blend-multiply"></div>

            {/* 3. Core brightness */}
            <div className="absolute inset-[20%] bg-white/40 blur-[30px] rounded-full mix-blend-overlay animate-pulse-slow"></div>

            {/* 4. Subtle surface activity (soft, not harsh spots) */}
            <div className="absolute top-[35%] left-[40%] w-[8%] h-[8%] bg-orange-800/30 rounded-full blur-[4px] mix-blend-multiply"></div>
            <div className="absolute top-[55%] right-[32%] w-[6%] h-[6%] bg-orange-800/25 rounded-full blur-[3px] mix-blend-multiply"></div>

            {/* 5. Corona hint */}
            <div className="absolute inset-[-5%] border-[3px] border-yellow-200/20 rounded-full blur-[4px]"></div>

            {/* 6. Chromosphere rim */}
            <div className="absolute inset-0 rounded-full border-[2px] border-orange-400/30 blur-[1px]"></div>
        </>
    )
};
