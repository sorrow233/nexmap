import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpring, useSprings, animated, config, useTrail } from '@react-spring/web';
import { ArrowRight, Sparkles, Zap, Network, CornerDownRight } from 'lucide-react';

const Card = ({ style, content }) => (
    <animated.div
        style={{
            ...style,
            position: 'absolute',
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
        }}
    >
        <div className="h-2 w-1/3 bg-white/10 rounded-full" />
        <div className="h-2 w-3/4 bg-white/5 rounded-full" />
        <div className="h-2 w-1/2 bg-white/5 rounded-full" />
    </animated.div>
);

const LandingPage = () => {
    const navigate = useNavigate();
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef(null);
    const [started, setStarted] = useState(false);

    // --- Data Generation ---
    const cards = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 120, // Spread %
        y: (Math.random() - 0.5) * 120,
        z: Math.random() * 500, // Depth
        scale: 0.5 + Math.random() * 0.8,
        delay: i * 50,
    })), []);

    // --- Scroll Listener ---
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const scrollY = window.scrollY;
            const innerHeight = window.innerHeight;
            // Map scroll to 0-3 range (roughly representing sections)
            const progress = Math.max(0, scrollY / innerHeight);
            setScrollProgress(progress);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Animations based on scroll phase ---

    // Phase 1: Infinite Canvas (0.5 -> 1.5)
    // Camera moves "forward" through the starfield of cards
    const infiniteSprings = useSprings(
        cards.length,
        cards.map((card, i) => {
            // Logic: As progress moves from 0 to 1, cards fly towards viewer
            const active = scrollProgress > 0.2 && scrollProgress < 1.8;
            const flyZ = scrollProgress * 800 - 400; // Move forward

            return {
                opacity: active ? 1 - Math.abs(1 - scrollProgress) : 0, // Fade in/out around 1.0
                transform: `
                    translate3d(${card.x}vw, ${card.y}vh, ${flyZ + card.z}px) 
                    scale(${card.scale})
                `,
                config: { mass: 5, tension: 200, friction: 50 } // Heavy, dreamy feel
            };
        })
    );

    // Phase 2: Parallel Minds (1.5 -> 2.5)
    // Cards align into vertical beams
    const beamSprings = useSprings(
        cards.length,
        cards.map((card, i) => {
            const active = scrollProgress > 1.2 && scrollProgress < 2.8;
            const column = i % 5; // 5 columns
            const row = Math.floor(i / 5);
            // Target positions for "Beams"
            const targetX = (column - 2) * 20; // Spread horizontally
            const targetY = (row - 3) * 15 + ((scrollProgress - 2) * 20); // Move vertically with scroll

            return {
                opacity: active ? 1 : 0,
                transform: active
                    ? `translate3d(${targetX}vw, ${targetY}vh, 0px) scale(0.8)`
                    : `translate3d(${card.x}vw, ${card.y}vh, 1000px) scale(0)`, // Explode out/in
                border: active ? '1px solid rgba(0, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: active ? '0 0 20px rgba(0, 255, 255, 0.1)' : '0 0 0px transparent',
            };
        })
    );

    // Phase 3: Fission / Fractal (2.5 -> 3.5)
    // A single seed grows branches
    const fractalTrails = useTrail(10, {
        opacity: scrollProgress > 2.2 ? 1 : 0,
        transform: scrollProgress > 2.2 ? 'scale(1) translateY(0px)' : 'scale(0) translateY(50px)',
        from: { opacity: 0, transform: 'scale(0)' },
        config: config.active,
        delay: 200,
    });


    // --- Hero Interaction ---
    const handleStart = () => {
        setStarted(true);
        // Auto-scroll to trigger sequence
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    };

    return (
        <div ref={containerRef} className="bg-[#020204] text-slate-100 font-sans selection:bg-teal-500/30 min-h-[400vh] overflow-x-hidden">
            <style>{`
                .divine-text {
                    background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.7) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    text-shadow: 0 0 30px rgba(255,255,255,0.1);
                }
                .divine-glow {
                    box-shadow: 0 0 60px -20px rgba(255,255,255,0.1);
                }
                /* Hide scrollbar for immersion */
                ::-webkit-scrollbar { width: 0px; background: transparent; }
            `}</style>

            {/* --- Fixed Viewport (The Canvas) --- */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none perspective-[1000px]">

                {/* Background Atmosphere */}
                <div className="absolute inset-0 bg-[#020204]">
                    <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.03),transparent_70%)] animate-pulse" style={{ animationDuration: '8s' }}></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[100%] bg-[radial-gradient(circle,rgba(99,102,241,0.03),transparent_60%)]"></div>
                </div>

                {/* VISUAL LAYERS */}

                {/* Layer 1: The Spark (Hero) - Fades out */}
                <animated.div
                    style={{ opacity: Math.max(0, 1 - scrollProgress * 1.5), pointerEvents: scrollProgress > 0.5 ? 'none' : 'auto' }}
                    className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-auto"
                >
                    <div className="relative group cursor-text" onClick={() => document.getElementById('hero-input')?.focus()}>
                        <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 via-indigo-500/20 to-purple-500/20 rounded-full blur-xl group-hover:opacity-100 opacity-50 transition-opacity duration-1000"></div>
                        <input
                            id="hero-input"
                            type="text"
                            placeholder="What creates a universe?"
                            className="bg-transparent border-b border-white/20 text-center text-3xl md:text-5xl py-4 focus:outline-none focus:border-white/50 transition-all font-light text-white/90 placeholder-white/20 w-[90vw] md:w-[600px]"
                            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        />
                        <div className="mt-8 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">
                            <span className="text-xs tracking-[0.3em] text-white/40 uppercase">Press Enter to Ignite</span>
                        </div>
                    </div>
                </animated.div>

                {/* Layer 2: Infinite Galaxy (Phase 1) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform-style-3d">
                    {infiniteSprings.map((style, i) => (
                        <Card key={i} style={style} />
                    ))}
                </div>

                {/* Layer 3: Parallel Beams (Phase 2) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {beamSprings.map((props, i) => (
                        <animated.div
                            key={`beam-${i}`}
                            style={{
                                ...props,
                                position: 'absolute',
                                width: '2px', // Thin beam
                                height: '150px',
                                background: 'linear-gradient(to bottom, rgba(0,255,255,0), rgba(0,255,255,0.5), rgba(0,255,255,0))',
                                borderRadius: '4px'
                            }}
                        >
                            {/* Optional: Add a "head" to the beam for a data packet feel */}
                            <div className="w-1 h-8 bg-white absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2 blur-[2px]"></div>
                        </animated.div>
                    ))}
                </div>

                {/* Layer 4: Fractal Fission (Phase 3) */}
                {scrollProgress > 2.0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                            {/* Core Node */}
                            <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_40px_white] absolute top-0 left-1/2 -translate-x-1/2 z-10"></div>

                            {/* Branches */}
                            {fractalTrails.map((style, i) => (
                                <animated.div key={i} style={style} className="absolute top-0 left-1/2 origin-top ">
                                    <div
                                        className="w-[1px] bg-gradient-to-b from-white to-transparent"
                                        style={{
                                            height: `${100 + i * 20}px`,
                                            transform: `rotate(${(i - 4.5) * 15}deg)`,
                                            transformOrigin: 'top center'
                                        }}
                                    >
                                        {/* Leaf Node */}
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/50 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                                    </div>
                                </animated.div>
                            ))}
                            {/* Text for visual anchor */}
                            <animated.div style={{ opacity: Math.max(0, scrollProgress - 2.5) }} className="absolute top-[200px] left-1/2 -translate-x-1/2 text-center w-[500px]">
                                <h3 className="text-3xl font-light tracking-wide text-white/90">From Spark to Supernova</h3>
                            </animated.div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Text Content Layers (Scrollytelling Triggers) --- */}

            {/* Spacer for Hero */}
            <div className="h-screen flex items-center justify-center relative pointer-events-none">
                {/* Hero is fixed, this is just space */}
            </div>

            {/* Section 1 Text */}
            <div className="h-screen flex items-end pb-32 justify-center relative pointer-events-none z-10">
                <animated.div
                    style={{
                        opacity: scrollProgress > 0.5 && scrollProgress < 1.5 ? 1 : 0,
                        transform: `translateY(${scrollProgress * -50}px)`
                    }}
                    className="text-center"
                >
                    <h2 className="divine-text text-5xl md:text-7xl font-bold mb-4 tracking-tighter">Scale Your Intellect</h2>
                    <p className="text-white/60 text-lg font-light tracking-wide uppercase">One Infinite Canvas. Zero Limits.</p>
                </animated.div>
            </div>

            {/* Section 2 Text */}
            <div className="h-screen flex items-end pb-32 justify-center relative pointer-events-none z-10">
                <animated.div
                    style={{
                        opacity: scrollProgress > 1.5 && scrollProgress < 2.5 ? 1 : 0,
                        transform: `translateY(${scrollProgress * -50}px)`
                    }}
                    className="text-center"
                >
                    <h2 className="divine-text text-5xl md:text-7xl font-bold mb-4 tracking-tighter">Parallel Minds</h2>
                    <p className="text-teal-400/80 text-lg font-light tracking-wide uppercase">Orchestrate 100 threads at once.</p>
                </animated.div>
            </div>

            {/* Section 3 Text */}
            <div className="h-screen flex items-center justify-center relative pointer-events-none z-10">
                {/* Text is integrated in the fractal layer for better positioning */}
                <div className="absolute bottom-20 pointer-events-auto">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_50px_rgba(255,255,255,0.4)] flex items-center gap-2"
                    >
                        Enter the Void <ArrowRight size={20} />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default LandingPage;
