import React, { useState, useEffect, useRef } from 'react';
import VisualHero from './components/VisualHero';
import DemoInfinite from './components/DemoInfinite';
import DemoAI from './components/DemoAI';
import FeatureBento from './components/FeatureBento';

// The Orchestrator
const LandingModule = () => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const scrollContainerRef = useRef(null);

    // --- Scroll Listener (Attached to Wrapper, not Window) ---
    useEffect(() => {
        const handleScroll = (e) => {
            if (!scrollContainerRef.current) return;
            const scrollY = scrollContainerRef.current.scrollTop;
            const innerHeight = window.innerHeight;
            // Map scroll to 0-4 range (Hero -> Infinite -> AI -> Bento -> Footer)
            const progress = Math.max(0, scrollY / innerHeight);
            setScrollProgress(progress);
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    // --- Actions ---
    const handleAutoStart = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: window.innerHeight * 0.8,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div
            ref={scrollContainerRef}
            className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#FDFDFC] text-[#1a1a1a] font-sans selection:bg-black/10 z-50 overscroll-none"
            style={{
                WebkitOverflowScrolling: 'touch', // Smooth momentum scroll on iOS
            }}
        >
            <style>{`
                /* Font Helper */
                @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');
                
                .font-inter-tight {
                    font-family: 'Inter Tight', sans-serif;
                }
                
                /* Hide scrollbar for cinematic feel but keep functionality */
                ::-webkit-scrollbar { width: 0px; background: transparent; }
                
                @keyframes gradient-x {
                    0%, 100% {
                        background-size: 200% 200%;
                        background-position: left center;
                    }
                    50% {
                        background-size: 200% 200%;
                        background-position: right center;
                    }
                }
                .animate-gradient-x {
                    animation: gradient-x 3s ease infinite;
                }
            `}</style>

            {/* Background elements can go here if global */}
            <div className="fixed inset-0 pointer-events-none">
                {/* Subtle noise texture */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
            </div>

            {/* Fixed Viewport for Animations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <VisualHero scrollProgress={scrollProgress} onStart={handleAutoStart} />
                <DemoInfinite scrollProgress={scrollProgress} />
                <DemoAI scrollProgress={scrollProgress} />
                <FeatureBento scrollProgress={scrollProgress} />
            </div>

            {/* Scroll Triggers (Invisible Layout Preservation) */}
            <div className="relative pointer-events-none">
                <div className="h-screen" /> {/* Hero Trigger (0 - 1) */}
                <div className="h-screen" /> {/* Infinite Trigger (1 - 2) */}
                <div className="h-screen" /> {/* AI Trigger (2 - 3) */}
                <div className="h-screen" /> {/* Bento Trigger (3 - 4) */}
                <div className="h-[50vh]" /> {/* Buffer */}
            </div>

            {/* Final CTA at bottom */}
            {scrollProgress > 3.5 && (
                <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-auto animate-fade-in-up">
                    <button
                        onClick={() => window.location.href = '/gallery'}
                        className="px-10 py-4 bg-black text-white rounded-full text-xl font-bold shadow-2xl hover:scale-110 transition-transform active:scale-95 flex items-center gap-2"
                    >
                        Start Your Journey
                    </button>
                </div>
            )}
        </div>
    );
};

export default LandingModule;
