import React from 'react';

/**
 * Planet Visual Definitions and Configuration
 * Now imports textures from modularized files in ./planets/
 */

// Import all planet textures from individual modules
import {
    mercuryTexture,
    venusTexture,
    terraTexture,
    marsTexture,
    jupiterTexture,
    saturnTexture,
    uranusTexture,
    neptuneTexture,
    sunTexture,
    supernovaTexture,
    neutronTexture,
    blackholeTexture
} from './planets';

// Texture Map for easy lookup
const textureMap = {
    mercury: mercuryTexture,
    venus: venusTexture,
    terra: terraTexture,
    mars: marsTexture,
    jupiter: jupiterTexture,
    saturn: saturnTexture,
    uranus: uranusTexture,
    neptune: neptuneTexture,
    sun: sunTexture,
    supernova: supernovaTexture,
    neutron: neutronTexture,
    blackhole: blackholeTexture
};

// Dynamic Planet Texture Getter
export const getPlanetTexture = (planetName) => {
    const id = (planetName || '').toLowerCase();
    return textureMap[id] || { background: 'bg-slate-200', shadow: 'shadow-lg', detail: null };
};

// Configuration Hook
export const usePlanetTiers = (t) => {
    return React.useMemo(() => [
        { id: 'mercury', name: t.stats?.planets?.mercury?.name || 'Mercury', color: 'slate', limit: 100000, gradient: 'from-slate-400 via-stone-400 to-gray-500', shadow: 'shadow-slate-400', lore: t.stats?.planets?.mercury?.lore },
        { id: 'venus', name: t.stats?.planets?.venus?.name || 'Venus', color: 'orange', limit: 250000, gradient: 'from-orange-200 via-stone-400 to-amber-200', shadow: 'shadow-stone-400', lore: t.stats?.planets?.venus?.lore },
        { id: 'terra', name: t.stats?.planets?.terra?.name || 'Terra', color: 'emerald', limit: 1000000, gradient: 'from-blue-400 via-teal-400 to-emerald-500', shadow: 'shadow-emerald-400', lore: t.stats?.planets?.terra?.lore },
        { id: 'mars', name: t.stats?.planets?.mars?.name || 'Mars', color: 'red', limit: 500000, gradient: 'from-orange-400 via-red-400 to-red-600', shadow: 'shadow-orange-400', lore: t.stats?.planets?.mars?.lore },
        { id: 'jupiter', name: t.stats?.planets?.jupiter?.name || 'Jupiter', color: 'amber', limit: 2500000, gradient: 'from-orange-200 via-amber-300 to-orange-400', shadow: 'shadow-amber-400', lore: t.stats?.planets?.jupiter?.lore },
        { id: 'saturn', name: t.stats?.planets?.saturn?.name || 'Saturn', color: 'yellow', limit: 5000000, gradient: 'from-yellow-100 via-yellow-200 to-amber-200', shadow: 'shadow-yellow-400', lore: t.stats?.planets?.saturn?.lore },
        { id: 'uranus', name: t.stats?.planets?.uranus?.name || 'Uranus', color: 'cyan', limit: 10000000, gradient: 'from-cyan-200 via-sky-300 to-blue-300', shadow: 'shadow-cyan-400', lore: t.stats?.planets?.uranus?.lore },
        { id: 'neptune', name: t.stats?.planets?.neptune?.name || 'Neptune', color: 'indigo', limit: 20000000, gradient: 'from-blue-600 via-indigo-600 to-violet-700', shadow: 'shadow-indigo-500', lore: t.stats?.planets?.neptune?.lore },
        { id: 'sun', name: t.stats?.planets?.sun?.name || 'Sun', color: 'amber', limit: 50000000, gradient: 'from-yellow-300 via-orange-500 to-red-500', shadow: 'shadow-amber-500', lore: t.stats?.planets?.sun?.lore },

        // Ultimate Goal
        { id: 'blackhole', name: t.stats?.planets?.blackhole?.name || 'Black Hole', color: 'indigo', limit: 100000000, gradient: 'from-gray-900 via-indigo-900 to-black', shadow: 'shadow-indigo-900', lore: t.stats?.planets?.blackhole?.lore }
    ].sort((a, b) => a.limit - b.limit), [t]);
};
