import React, { useState, useEffect, useRef } from 'react';
import Background from './components/Background';
import HeroSection from './components/HeroSection';
import InfiniteCanvas from './components/InfiniteCanvas';
import ParallelMinds from './components/ParallelMinds';
import FractalGrowth from './components/FractalGrowth';

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
            // Map scroll to 0-4 range
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
        // KEY FIX: overflow-y-auto here overrides global body hidden
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

            <Background />

            {/* Fixed Viewport for Animations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <InfiniteCanvas scrollProgress={scrollProgress} />
                <ParallelMinds scrollProgress={scrollProgress} />
                <FractalGrowth scrollProgress={scrollProgress} />
                <HeroSection scrollProgress={scrollProgress} onStart={handleAutoStart} />
            </div>

            {/* Scroll Triggers (Invisible Layout Preservation) */}
            <div className="relative pointer-events-none">
                <div className="h-screen" /> {/* Hero Space */}
                <div className="h-screen" /> {/* Canvas Trigger */}
                <div className="h-screen" /> {/* Parallel Trigger */}
                <div className="h-screen" /> {/* Fractal Trigger */}
                <div className="h-[50vh]" /> {/* Footer Padding */}
            </div>
        </div>
    );
};

export default LandingModule;
