import React, { useState, useEffect, useRef } from 'react';
import VisualHero from './components/VisualHero';
import DemoInfinite from './components/DemoInfinite';
import DemoAI from './components/DemoAI';
import FeatureBento from './components/FeatureBento';

// The Orchestrator
const LandingModule = () => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const scrollContainerRef = useRef(null);

    // --- Global Scroll Listener ---
    useEffect(() => {
        const handleScroll = () => {
            if (!scrollContainerRef.current) return;
            const scrTop = scrollContainerRef.current.scrollTop;
            const innerH = window.innerHeight;
            const progress = scrTop / innerH;
            setScrollProgress(progress);
        };

        const container = scrollContainerRef.current;
        if (container) container.addEventListener('scroll', handleScroll);
        return () => { if (container) container.removeEventListener('scroll', handleScroll); };
    }, []);

    // --- Compute Global Background ---
    // Transition from Light to Dark for DemoAI
    // AI starts appearing at 1.5, becomes prominent by 2.0, ends by 3.0
    const isDark = scrollProgress > 1.3 && scrollProgress < 2.9;
    const bgTranslate = isDark ? '#080c14' : '#FDFDFC'; // Deeper dark for AI

    const handleAutoStart = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        }
    };

    return (
        <div
            ref={scrollContainerRef}
            className="fixed inset-0 overflow-y-auto overflow-x-hidden transition-colors duration-700 font-sans selection:bg-blue-500/20 z-50 overscroll-none"
            style={{
                backgroundColor: bgTranslate,
                WebkitOverflowScrolling: 'touch'
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');
                ::-webkit-scrollbar { width: 0px; background: transparent; }
                .font-inter-tight { font-family: 'Inter Tight', sans-serif; }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(2deg); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
            `}</style>

            {/* Global Background Particles - Extremely subtle */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.4]">
                {/* Always active gradients */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/10 blur-[120px] rounded-full" />

                {/* AI Star Field - Only visible when dark */}
                <div
                    className="absolute inset-0 transition-opacity duration-1000"
                    style={{
                        opacity: isDark ? 0.3 : 0,
                        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            {/* THE STAGE: All animations happen here */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
                <VisualHero scrollProgress={scrollProgress} onStart={handleAutoStart} />
                <DemoInfinite scrollProgress={scrollProgress} />
                <DemoAI scrollProgress={scrollProgress} />
                <FeatureBento scrollProgress={scrollProgress} />
            </div>

            {/* SCROLLABLE SURFACE: Determines scroll length */}
            <div className="relative z-0 pointer-events-none opacity-0">
                <div className="h-[120vh]" /> {/* Hero */}
                <div className="h-[150vh]" /> {/* Infinite */}
                <div className="h-[150vh]" /> {/* AI */}
                <div className="h-[120vh]" /> {/* Bento */}
                <div className="h-[50vh]" />  {/* Footer */}
            </div>

            {/* CTA Overlay */}
            <div
                className={`fixed bottom-10 left-0 right-0 z-[60] flex justify-center pointer-events-auto transition-all duration-500 transform ${scrollProgress > 3.8 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
            >
                <div className="bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-gray-200/50 flex items-center gap-4 pr-6">
                    <button
                        onClick={() => window.location.href = '/gallery'}
                        className="px-8 py-3 bg-black text-white rounded-full text-lg font-bold hover:scale-105 transition-transform"
                    >
                        Get Started
                    </button>
                    <span className="text-gray-500 text-sm font-medium">Free Beta</span>
                </div>
            </div>
        </div>
    );
};

export default LandingModule;
