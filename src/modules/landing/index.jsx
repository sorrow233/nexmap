import React, { useState, useEffect } from 'react';
import VisualHero from './components/VisualHero';
import SpatialSection from './components/SpatialSection';
import ConcurrencySection from './components/ConcurrencySection';
import SproutSection from './components/SproutSection';
import GraphSection from './components/GraphSection';
import FooterSection from './components/FooterSection';
import DemoInfinite from './components/DemoInfinite';
import FeatureBento from './components/FeatureBento';

// The New Landing Orchestrator
const LandingModule = () => {
    // --- Global Scroll Fix ---
    // This ensures that the landing page overrides the app's default "hidden" overflow 
    // which is used for the infinite canvas, allowing the user to scroll normally here.
    useEffect(() => {
        const doc = document.documentElement;
        const body = document.body;
        const rootEl = document.getElementById('root');

        // 1. Force the document to be scrollable
        doc.style.height = 'auto';
        doc.style.overflowY = 'auto';
        doc.style.overflowX = 'hidden';

        // 2. Allow body to grow
        body.style.height = 'auto';
        body.style.overflowY = 'visible';
        body.style.overflowX = 'hidden';

        // 3. Unlock root
        if (rootEl) {
            rootEl.style.height = 'auto';
            rootEl.style.overflowY = 'visible';
            rootEl.style.overflowX = 'hidden';
        }

        return () => {
            // Revert to CSS defaults (empty string removes inline style)
            doc.style.height = '';
            doc.style.overflowY = '';
            doc.style.overflowX = '';

            body.style.height = '';
            body.style.overflowY = '';
            body.style.overflowX = '';

            if (rootEl) {
                rootEl.style.height = '';
                rootEl.style.overflowY = '';
                rootEl.style.overflowX = '';
            }
        };
    }, []);

    const [scrollProgress, setScrollProgress] = useState(0);

    // Track scroll for VisualHero
    useEffect(() => {
        const handleScroll = () => {
            const scrTop = window.scrollY;
            const innerH = window.innerHeight;
            const progress = scrTop / innerH;
            setScrollProgress(progress);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleStart = () => {
        const nextSection = window.innerHeight;
        window.scrollTo({ top: nextSection, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');
                ::-webkit-scrollbar { width: 0px; background: transparent; }
                .font-inter-tight { font-family: 'Inter Tight', sans-serif; }
                
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
                
                @keyframes float-slow {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(10px, -10px) rotate(2deg); }
                    66% { transform: translate(-5px, 15px) rotate(-1deg); }
                }
                .animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
                
                @keyframes float-medium {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
            `}</style>

            {/* 1. VISUAL HERO (Replaces previous HeroSection) */}
            <div className="h-screen w-full sticky top-0 z-0">
                <VisualHero scrollProgress={scrollProgress} onStart={handleStart} />
            </div>

            {/* Content Spacer to allow scrolling past sticky hero */}
            <div className="h-[50vh]" />

            {/* 2. UNLIMITED CONCURRENCY */}
            <div className="relative z-10 bg-[#050505] border-t border-white/5">
                <ConcurrencySection />
            </div>

            {/* 3. SPATIAL ORGANIZATION */}
            <div className="relative z-10 border-t border-white/5">
                <SpatialSection />
            </div>

            {/* 4. RECURSIVE SPROUT */}
            <div className="relative z-10 border-t border-white/5">
                <SproutSection />
            </div>

            {/* 5. GRAPH CONTEXT WALKING */}
            <div className="relative z-10 border-t border-white/5">
                <GraphSection />
            </div>

            {/* 6. DEMO INFINITE (Appended) */}
            <div className="relative z-10 border-t border-white/5">
                <DemoInfinite scrollProgress={scrollProgress} />
            </div>

            {/* 7. FEATURE BENTO (Appended) */}
            <div className="relative z-10 border-t border-white/5">
                <FeatureBento />
            </div>

            {/* FOOTER / FINAL CTA */}
            <div className="relative z-20">
                <FooterSection />
            </div>

        </div>
    );
};

export default LandingModule;
