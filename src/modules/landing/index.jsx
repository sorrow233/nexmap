import React, { useState, useEffect } from 'react';
import HeroSection from './components/HeroSection';
import GraphSection from './components/GraphSection';
import SproutSection from './components/SproutSection';
import ConcurrencySection from './components/ConcurrencySection';
import SpatialSection from './components/SpatialSection';

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
            `}</style>

            {/* 1. HERO */}
            <HeroSection onStart={handleStart} />

            {/* 2. GRAPH CONTEXT WALKING */}
            <div className="relative z-10 border-t border-white/5">
                <GraphSection />
            </div>

            {/* 3. RECURSIVE SPROUT */}
            <div className="relative z-10 border-t border-white/5">
                <SproutSection />
            </div>

            {/* 4. UNLIMITED CONCURRENCY */}
            <div className="relative z-10 border-t border-white/5">
                <ConcurrencySection />
            </div>

            {/* 5. SPATIAL ORGANIZATION */}
            <div className="relative z-10 border-t border-white/5">
                <SpatialSection />
            </div>

            {/* FOOTER / FINAL CTA */}
            <div className="py-24 bg-black border-t border-white/10 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-900/5 blur-3xl pointer-events-none" />

                <h2 className="text-4xl md:text-5xl font-bold mb-8 relative z-10">Start Thinking in <span className="text-blue-500">Connections</span>.</h2>
                <button
                    onClick={() => window.location.href = '/gallery'}
                    className="px-12 py-4 bg-white text-black rounded-full text-lg font-bold hover:scale-105 transition-transform hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] relative z-10"
                >
                    Launch Alpha
                </button>
                <div className="mt-12 text-white/20 text-sm">
                    &copy; 2024 Mixboard. All rights reserved.
                </div>
            </div>

        </div>
    );
};

export default LandingModule;

