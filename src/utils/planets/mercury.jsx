import React from 'react';

/**
 * Mercury - The Swift Planet
 * Concept: Scorched, barren, sun-blasted rock with extreme temperature contrast.
 * "Extreme" Optimization: 
 * - Metallicity: High contrast metallic gradients.
 * - Heat: Intense heat shimmer on the sun-facing side.
 * - Topography: Deep crater shadows using mix-blend modes.
 */
export const mercuryTexture = {
    // Surface: Metallic Slate -> Scorched White (Sun side) -> Deep Shadow (Dark side)
    background: 'radial-gradient(circle at 30% 30%, #f8fafc 0%, #cbd5e1 20%, #64748b 50%, #334155 80%, #0f172a 100%)',
    // Atmosphere: Virtually none, just a hard, sharp shadow with a faint sodium glow
    // Surface: Metallic Slate/Gray with heat gradients
    background: 'radial-gradient(circle at 30% 30%, #e2e8f0 0%, #94a3b8 40%, #475569 80%, #1e293b 100%)',
    // Shadow: Sharp, rough terminator line
    shadow: 'shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.8),_0_0_15px_rgba(203,213,225,0.3)]',
    detail: (
        <>

            {/* 5. Tenuous Exosphere (Faint Sodium Tail hint) */}
            <div className="absolute inset-[-5%] bg-yellow-100/5 blur-[20px] rounded-full mix-blend-screen pointer-events-none"></div>
        </>
    )
};
