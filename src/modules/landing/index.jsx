import React, { useState, useEffect, useRef } from 'react';
import VisualHero from './components/VisualHero';
import DemoInfinite from './components/DemoInfinite';
import DemoAI from './components/DemoAI';
import DemoFractal from './components/DemoFractal';

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
            // Map scroll to 0-4 range (Hero -> Infinite -> AI -> Fractal -> Footer)
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
            `}</style>

            {/* Background elements can go here if global */}
            <div className="fixed inset-0 pointer-events-none">
                {/* Subtle grid or noise could go here */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            {/* Fixed Viewport for Animations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <VisualHero scrollProgress={scrollProgress} onStart={handleAutoStart} />
                <DemoInfinite scrollProgress={scrollProgress} />
                <DemoAI scrollProgress={scrollProgress} />
                <DemoFractal scrollProgress={scrollProgress} />
            </div>

            {/* Scroll Triggers (Invisible Layout Preservation) */}
            <div className="relative pointer-events-none">
                <div className="h-screen" /> {/* Hero Space (0 - 1) */}
                <div className="h-screen" /> {/* Infinite Trigger (1 - 2) */}
                <div className="h-screen" /> {/* AI Trigger (2 - 3) */}
                <div className="h-screen" /> {/* Fractal Trigger (3 - 4) */}
                <div className="h-[50vh]" /> {/* Buffer */}
            </div>

            {/* Final CTA at bottom */}
            {scrollProgress > 3.5 && (
                <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-auto animate-fade-in-up">
                    <button
                        onClick={() => window.location.href = '/gallery'}
                        className="px-8 py-4 bg-black text-white rounded-full text-xl font-bold shadow-2xl hover:scale-110 transition-transform"
                    >
                        Start Your Journey
                    </button>
                </div>
            )}
        </div>
    );
};

export default LandingModule;
