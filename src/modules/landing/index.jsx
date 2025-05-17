import React, { useState, useEffect, useRef } from 'react';
import VisualHero from './components/VisualHero';
import DemoInfinite from './components/DemoInfinite';
import DemoAI from './components/DemoAI';
import FeatureBento from './components/FeatureBento';

// The Orchestrator
const LandingModule = () => {
    const [scrollProgress, setScrollProgress] = useState(0);

    // --- Global Scroll Listener ---
    // --- Global Scroll Listener & Body Overflow Override ---
    useEffect(() => {
        // Enable native scrolling for Landing Page
        // We must also target #root because index.css forces it to height: 100% & overflow: hidden
        document.documentElement.style.overflowY = 'auto';
        document.body.style.overflowY = 'auto';

        const rootEl = document.getElementById('root');
        if (rootEl) {
            rootEl.style.overflowY = 'visible';
            rootEl.style.height = 'auto';
        }

        const handleScroll = () => {
            const scrTop = window.scrollY;
            const innerH = window.innerHeight;
            const progress = scrTop / innerH;
            setScrollProgress(progress);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        // Initial call
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            // Revert to app-mode (no scroll) when leaving landing page
            document.documentElement.style.overflowY = '';
            document.body.style.overflowY = '';

            if (rootEl) {
                rootEl.style.overflowY = '';
                rootEl.style.height = '';
            }
        };
    }, []);

    const handleAutoStart = () => {
        window.scrollTo({ top: window.innerHeight * 1.2, behavior: 'smooth' });
    };

    return (
        <div
            className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden"
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');
                ::-webkit-scrollbar { width: 0px; background: transparent; }
                .font-inter-tight { font-family: 'Inter Tight', sans-serif; }
                
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

            {/* Global Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vh] bg-blue-500/10 blur-[150px] rounded-full mix-blend-screen animate-float-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vh] bg-purple-500/10 blur-[150px] rounded-full mix-blend-screen animate-float-slow" style={{ animationDelay: '-5s' }} />
                <div
                    className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150"
                    style={{ backgroundRepeat: 'repeat' }}
                />
            </div>

            {/* sticky-stacking context */}
            <div className="relative z-10">
                {/* 1. HERO - Sticky until 1.5, now just self-contained mostly */}
                <div className="h-[200vh] relative">
                    <div className="sticky top-0 h-screen overflow-hidden">
                        <VisualHero scrollProgress={scrollProgress} onStart={handleAutoStart} />
                    </div>
                </div>

                {/* 2. FEATURES BENTO - Moved here as requested (Pro Page) */}
                <div className="relative bg-[#050505] z-30">
                    {/* Added z-index to sit on top if needed, though normal flow is fine */}
                    <FeatureBento />
                </div>

                {/* 3. INFINITE / CHAOS */}
                <DemoInfinite />

                {/* 4. AI MAGIC */}
                <DemoAI />
            </div>

            {/* Persistent CTA Bottom Bar */}
            <div
                className={`fixed bottom-8 left-0 right-0 z-[60] flex justify-center pointer-events-none transition-all duration-700 transform ${scrollProgress > 0.1 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
            >
                <div className="pointer-events-auto bg-white/10 backdrop-blur-md p-1.5 pl-2 pr-2 rounded-full shadow-2xl border border-white/10 flex items-center gap-2">
                    <span className="text-white/60 text-xs font-medium px-2 hidden md:block">Ready to think unlimited?</span>
                    <button
                        onClick={() => window.location.href = '/gallery'}
                        className="px-6 py-2.5 bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                        Launch Beta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandingModule;
