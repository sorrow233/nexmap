import React, { useState, useEffect, useRef } from 'react';
import Background from './components/Background';
import HeroSection from './components/HeroSection';
import InfiniteCanvas from './components/InfiniteCanvas';
import ParallelMinds from './components/ParallelMinds';
import FractalGrowth from './components/FractalGrowth';

// The Orchestrator
const LandingModule = () => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef(null);

    // --- Scroll Listener ---
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const innerHeight = window.innerHeight;
            // Map scroll to 0-4 range
            const progress = Math.max(0, scrollY / innerHeight);
            setScrollProgress(progress);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Actions ---
    const handleAutoStart = () => {
        // Automatically scroll to the first section to "Show" the infinite canvas
        // Doing a smooth scroll start
        window.scrollTo({
            top: window.innerHeight * 0.8,
            behavior: 'smooth'
        });
    };

    return (
        <div ref={containerRef} className="bg-[#F9F9F8] text-slate-800 font-sans min-h-[450vh]">
            <style>{`
                /* Hide scrollbar for cinematic feel */
                ::-webkit-scrollbar { width: 0px; background: transparent; }
            `}</style>

            <Background />

            {/* Fixed Viewport for Animations */}
            <div className="fixed inset-0 overflow-hidden">
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
