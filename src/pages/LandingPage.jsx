import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpring, useSprings, animated, config, useTrail } from '@react-spring/web';
import { ArrowRight, Sparkles, Zap, Network, CornerDownRight } from 'lucide-react';

const Card = ({ style, content, color }) => (
    <animated.div
        style={{
            ...style,
            position: 'absolute',
            background: 'rgba(255, 255, 255, 0.4)', // More opacity for light mode
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)', // Softer shadow
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
        }}
    >
        {/* Colorful accents for "Japanese/Glass" vibe */}
        <div className="h-2 w-1/3 rounded-full opacity-60" style={{ backgroundColor: color }} />
        <div className="h-2 w-3/4 bg-slate-200/50 rounded-full" />
        <div className="h-2 w-1/2 bg-slate-200/50 rounded-full" />
    </animated.div>
);

const LandingPage = () => {
    const navigate = useNavigate();
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const [started, setStarted] = useState(false);

    // --- Data Generation ---
    const colors = ['#FDA4AF', '#FCD34D', '#34D399', '#60A5FA', '#818CF8', '#A78BFA'];
    const cards = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 120, // Spread %
        y: (Math.random() - 0.5) * 120,
        z: Math.random() * 500, // Depth
        scale: 0.5 + Math.random() * 0.8,
        delay: i * 50,
        color: colors[i % colors.length]
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
            const active = scrollProgress > 0.1 && scrollProgress < 1.8;
            const flyZ = scrollProgress * 800 - 400; // Move forward

            return {
                opacity: active ? 1 - Math.abs(1 - scrollProgress) * 1.2 : 0,
                transform: `
                    translate3d(${card.x}vw, ${card.y}vh, ${flyZ + card.z}px) 
                    scale(${card.scale})
                `,
                config: { mass: 5, tension: 200, friction: 50 },
                immediate: !active
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
                    : `translate3d(${card.x}vw, ${card.y}vh, 1000px) scale(0)`,
                border: active ? `1px solid ${card.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: active ? `0 0 10px ${card.color}40` : '0 0 0px transparent',
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
        <div ref={containerRef} className="bg-[#F9F9F8] text-slate-800 font-lxgw selection:bg-rose-200/50 min-h-[400vh] overflow-x-hidden">
            <style>{`
                .divine-text {
                    background: linear-gradient(135deg, #111827 0%, #4B5563 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                /* Hide scrollbar for immersion */
                ::-webkit-scrollbar { width: 0px; background: safe; }
            `}</style>

            {/* --- Fixed Viewport (The Canvas) --- */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none perspective-[1000px]">

                {/* Background Atmosphere - Light & Warm */}
                <div className="absolute inset-0 bg-[#F9F9F8]">
                    <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_center,rgba(255,228,230,0.5),transparent_70%)] opacity-50"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[100%] bg-[radial-gradient(circle,rgba(204,251,241,0.5),transparent_60%)] opacity-50"></div>
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none"></div>
                </div>

                {/* VISUAL LAYERS */}

                {/* Layer 1: The Spark (Hero) - Fades out */}
                <animated.div
                    style={{ opacity: Math.max(0, 1 - scrollProgress * 2), pointerEvents: scrollProgress > 0.2 ? 'none' : 'auto' }}
                    className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-auto"
                >
                    <div className="relative group cursor-text w-full max-w-2xl px-6" onClick={() => inputRef.current?.focus()}>
                        {/* Soft Glow backing */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[200%] bg-gradient-to-r from-rose-200/30 via-white/50 to-teal-200/30 blur-3xl opacity-50 pointer-events-none"></div>

                        <h1 className="text-center text-5xl md:text-7xl font-bold mb-12 tracking-tight text-slate-800 opacity-90">
                            Everything starts with <br /> a <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400">thought.</span>
                        </h1>

                        <div className="relative flex items-center justify-center">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="What will you create today?"
                                className="bg-white/60 backdrop-blur-xl border border-white/40 text-center text-2xl md:text-3xl py-6 px-10 rounded-full shadow-lg shadow-slate-200/50 focus:outline-none focus:ring-4 focus:ring-rose-100 transition-all font-light text-slate-700 placeholder-slate-400 w-full"
                                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                            />
                            <button
                                onClick={handleStart}
                                className="absolute right-4 p-3 bg-slate-800 text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-md z-50 pointer-events-auto"
                            >
                                <ArrowRight size={24} />
                            </button>
                        </div>

                        <div className="mt-8 text-center text-slate-400 font-medium tracking-widest text-xs uppercase animate-pulse">
                            Press Enter or Scroll to Begin
                        </div>
                    </div>
                </animated.div>

                {/* Layer 2: Infinite Galaxy (Phase 1) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform-style-3d">
                    {infiniteSprings.map((style, i) => (
                        <Card key={i} style={style} color={cards[i].color} />
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
                                background: `linear-gradient(to bottom, transparent, ${cards[i].color}, transparent)`,
                                borderRadius: '4px'
                            }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2 blur-[1px]" style={{ backgroundColor: cards[i].color }}></div>
                        </animated.div>
                    ))}
                </div>

                {/* Layer 4: Fractal Fission (Phase 3) */}
                {scrollProgress > 2.0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative">
                            {/* Core Node */}
                            <div className="w-4 h-4 bg-slate-800 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.1)] absolute top-0 left-1/2 -translate-x-1/2 z-10"></div>

                            {/* Branches */}
                            {fractalTrails.map((style, i) => (
                                <animated.div key={i} style={style} className="absolute top-0 left-1/2 origin-top ">
                                    <div
                                        className="w-[1px]"
                                        style={{
                                            height: `${120 + i * 25}px`,
                                            transform: `rotate(${(i - 4.5) * 18}deg)`,
                                            transformOrigin: 'top center',
                                            background: 'linear-gradient(to bottom, #1e293b, transparent)'
                                        }}
                                    >
                                        {/* Leaf Color */}
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow-sm bg-white border border-slate-100" >
                                            <div className="w-full h-full rounded-full opacity-50" style={{ backgroundColor: colors[i % colors.length] }}></div>
                                        </div>
                                    </div>
                                </animated.div>
                            ))}
                            {/* Text for visual anchor */}
                            <animated.div style={{ opacity: Math.max(0, scrollProgress - 2.5) }} className="absolute top-[280px] left-1/2 -translate-x-1/2 text-center w-[600px]">
                                <h3 className="text-4xl font-light tracking-tight text-slate-800">Growth is automatic.</h3>
                            </animated.div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Text Content Layers (Scrollytelling Triggers) --- */}

            {/* Spacer for Hero */}
            <div className="h-screen flex items-center justify-center relative pointer-events-none">
                {/* Hero is fixed */}
            </div>

            {/* Section 1 Text */}
            <div className="h-screen flex items-end pb-40 justify-center relative pointer-events-none z-10">
                <animated.div
                    style={{
                        opacity: scrollProgress > 0.5 && scrollProgress < 1.5 ? 1 : 0,
                        transform: `translateY(${scrollProgress * -30}px)`
                    }}
                    className="text-center p-8 glass-panel rounded-3xl border-white/50 backdrop-blur-md shadow-lg"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-2 tracking-tight text-slate-800">Infinite Canvas</h2>
                    <p className="text-slate-500 text-lg font-medium tracking-wide">Let your ideas breathe.</p>
                </animated.div>
            </div>

            {/* Section 2 Text */}
            <div className="h-screen flex items-end pb-40 justify-center relative pointer-events-none z-10">
                <animated.div
                    style={{
                        opacity: scrollProgress > 1.5 && scrollProgress < 2.5 ? 1 : 0,
                        transform: `translateY(${scrollProgress * -30}px)`
                    }}
                    className="text-center p-8 glass-panel rounded-3xl border-white/50 backdrop-blur-md shadow-lg"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-2 tracking-tight text-slate-800">Parallel Minds</h2>
                    <p className="text-indigo-500 text-lg font-medium tracking-wide">Why think linearly?</p>
                </animated.div>
            </div>

            {/* Section 3 Text */}
            <div className="h-screen flex items-center justify-center relative pointer-events-none z-10">
                {/* Text is integrated in the fractal layer for better positioning */}
                <div className="absolute bottom-24 pointer-events-auto">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="px-10 py-5 bg-slate-900 text-white rounded-full font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl flex items-center gap-3"
                    >
                        Start Creating <ArrowRight size={20} />
                    </button>
                </div>
            </div>

        </div>
    );
};

export default LandingPage;
