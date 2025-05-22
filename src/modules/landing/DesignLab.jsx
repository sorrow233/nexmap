import React, { useState } from 'react';

// We will import concepts as we build them.
import Concept1_TheVoid from './design-lab/Concept1_TheVoid';
import Concept2_BentoGrid from './design-lab/Concept2_BentoGrid';
import Concept3_Typography from './design-lab/Concept3_Typography';
import Concept4_Cyberpunk from './design-lab/Concept4_Cyberpunk';
import Concept5_Glassmorphism from './design-lab/Concept5_Glassmorphism';
import Concept6_Perspective3D from './design-lab/Concept6_Perspective3D';
import Concept7_InfiniteScroll from './design-lab/Concept7_InfiniteScroll';
import Concept8_MagneticField from './design-lab/Concept8_MagneticField';
import Concept9_LiquidDeep from './design-lab/Concept9_LiquidDeep';
import Concept10_MinimalZen from './design-lab/Concept10_MinimalZen';

const DesignLab = () => {
    const [currentConcept, setCurrentConcept] = useState(1);
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    const concepts = [
        { id: 1, name: "The Void", component: Concept1_TheVoid, description: "Deep space aesthetic with particle starfield." },
        { id: 2, name: "Bento Grid", component: Concept2_BentoGrid, description: "Modern, interactive bento box layout." },
        { id: 3, name: "Typography", component: Concept3_Typography, description: "Massive, bold typography obsession." },
        { id: 4, name: "Cyberpunk", component: Concept4_Cyberpunk, description: "Neon terminals and glitch effects." },
        { id: 5, name: "Glassmorphism", component: Concept5_Glassmorphism, description: "Frosted glass and moving gradients." },
        { id: 6, name: "Perspective 3D", component: Concept6_Perspective3D, description: "CSS 3D transformed floating elements." },
        { id: 7, name: "Infinite Scroll", component: Concept7_InfiniteScroll, description: "Overwhelming data visualization streams." },
        { id: 8, name: "Magnetic Field", component: Concept8_MagneticField, description: "Mouse-interactive distortions." },
        { id: 9, name: "Liquid Deep", component: Concept9_LiquidDeep, description: "Fluid, merging SVG filter effects." },
        { id: 10, name: "Minimal Zen", component: Concept10_MinimalZen, description: "Extreme minimalism and negative space." },
    ];

    const ActiveComponent = concepts.find(c => c.id === currentConcept)?.component || (() => <div className="text-white p-10">Concept not found</div>);

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-hidden relative">
            {/* Sidebar Navigation */}
            <div
                className={`fixed top-0 left-0 h-full bg-zinc-900/90 backdrop-blur-md border-r border-white/10 z-50 transition-all duration-300 ${isMenuOpen ? 'w-64' : 'w-0'}`}
                style={{ overflow: 'hidden' }}
            >
                <div className="p-6 h-full overflow-y-auto w-64">
                    <h1 className="text-xl font-bold mb-6 text-white/90">Design Lab</h1>
                    <div className="space-y-2">
                        {concepts.map((concept) => (
                            <button
                                key={concept.id}
                                onClick={() => setCurrentConcept(concept.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${currentConcept === concept.id
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                        : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <div className="font-medium">{concept.id}. {concept.name}</div>
                                <div className="text-xs opacity-60 mt-1 line-clamp-1">{concept.description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="fixed top-4 left-4 z-[60] p-2 bg-zinc-800 rounded-md hover:bg-zinc-700 transition-colors border border-white/10"
            >
                {isMenuOpen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                )}
            </button>

            {/* Main Content Area */}
            <div className={`h-screen w-full transition-all duration-300 ${isMenuOpen ? 'pl-64' : 'pl-0'}`}>
                <ActiveComponent />
            </div>
        </div>
    );
};

export default DesignLab;
