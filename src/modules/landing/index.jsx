import React, { useState, useEffect, useRef } from 'react';
import VisualHero from './components/VisualHero';
import DemoInfinite from './components/DemoInfinite';
import DemoAI from './components/DemoAI';
import FeatureBento from './components/FeatureBento';

// The Orchestrator
const LandingModule = () => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const scrollContainerRef = useRef(null);
    const audioRef = useRef(null);

    // --- Scroll Listener (Attached to Wrapper) ---
    useEffect(() => {
        const handleScroll = (e) => {
            if (!scrollContainerRef.current) return;
            const scrTop = scrollContainerRef.current.scrollTop;
            const innerH = window.innerHeight;
            // Map scroll to 0-4 range (Hero -> Infinite -> AI -> Bento -> Footer)
            // Using a slightly larger divisor to make the scroll feel "heavier" and more cinematic
            const progress = Math.max(0, scrTop / innerH);

            // DEBUG: Log scroll state
            console.log('📊 Scroll Debug:', {
                scrollTop: scrTop,
                scrollProgress: progress.toFixed(2),
                windowHeight: innerH,
                maxScroll: scrollContainerRef.current.scrollHeight - innerH
            });

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
            className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#FDFDFC] text-[#1a1a1a] font-sans selection:bg-blue-500/20 z-50 overscroll-none"
            style={{
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');
                
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
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(2deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }
                
                /* Utility to hide cursor when idle could be added here for extra cinema mode */
            `}</style>

            {/* Global Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Subtle noise texture */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

                {/* Ambient colorful gradient blobs that move slowly */}
                <div
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/20 blur-[120px] rounded-full transition-transform duration-[2000ms]"
                    style={{ transform: `translate(${scrollProgress * 50}px, ${scrollProgress * 20}px)` }}
                />
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/20 blur-[120px] rounded-full transition-transform duration-[2000ms]"
                    style={{ transform: `translate(${-scrollProgress * 30}px, ${-scrollProgress * 40}px)` }}
                />
            </div>

            {/* Fixed Viewport for Animations - The "Stage" */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
                <VisualHero scrollProgress={scrollProgress} onStart={handleAutoStart} />
                <DemoInfinite scrollProgress={scrollProgress} />
                <DemoAI scrollProgress={scrollProgress} />
                <FeatureBento scrollProgress={scrollProgress} />
            </div>

            {/* Scroll Triggers (Invisible Layout Preservation) */}
            {/* The height of these determines how "fast" each section scrolls */}
            <div className="relative z-20 pointer-events-none opacity-0">
                <div className="h-[120vh]" /> {/* Hero: Slower exit */}
                <div className="h-[150vh]" /> {/* Infinite: Long zoom */}
                <div className="h-[150vh]" /> {/* AI: Complex animation */}
                <div className="h-[120vh]" /> {/* Bento: Quick glance */}
                <div className="h-[50vh]" /> {/* Buffer for footer */}
            </div>

            {/* Persistent CTA that appears at the end */}
            <div
                className={`fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-auto transition-all duration-500 transform ${scrollProgress > 3.8 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
            >
                <div className="bg-white/80 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-gray-200/50 flex items-center gap-4 pr-6">
                    <button
                        onClick={() => window.location.href = '/gallery'}
                        className="px-8 py-3 bg-black text-white rounded-full text-lg font-bold hover:scale-105 transition-transform active:scale-95"
                    >
                        Get Started
                    </button>
                    <span className="text-gray-500 text-sm font-medium">Free during beta</span>
                </div>
            </div>
        </div>
    );
};

export default LandingModule;
