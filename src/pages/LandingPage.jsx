import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpring, useSprings, useTrail, animated, config, useChain } from '@react-spring/web';
import { ArrowRight, Sparkles, Network, Cpu, Zap, Search } from 'lucide-react';

// --- Components ---

// 1. Hero Section: Spark to Universe
const HeroSection = ({ onScrollRequest }) => {
    const [started, setStarted] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Keyframes for the "Explosion"
    // 1. Input fades out
    const inputSpring = useSpring({
        opacity: started ? 0 : 1,
        transform: started ? 'scale(0.8)' : 'scale(1)',
        config: config.stiff
    });

    // 2. Nodes explode outward
    const NODE_COUNT = 40;
    const [nodes, setNodes] = useState([]);

    useEffect(() => {
        // Generate random nodes for explosion
        const newNodes = Array.from({ length: NODE_COUNT }).map((_, i) => ({
            id: i,
            angle: Math.random() * Math.PI * 2,
            distance: 100 + Math.random() * 400, // Distance from center
            size: 4 + Math.random() * 8,
            delay: Math.random() * 500,
        }));
        setNodes(newNodes);
    }, []);

    const nodeSprings = useSprings(
        nodes.length,
        nodes.map(node => ({
            to: {
                opacity: started ? 1 : 0,
                transform: started
                    ? `translate(${Math.cos(node.angle) * node.distance}px, ${Math.sin(node.angle) * node.distance}px) scale(1)`
                    : `translate(0px, 0px) scale(0)`,
            },
            config: { mass: 1, tension: 120, friction: 14 },
            delay: started ? node.delay : 0
        }))
    );

    // 3. Main Headline appears after explosion
    const titleSpring = useSpring({
        opacity: started ? 1 : 0,
        transform: started ? 'translateY(0px)' : 'translateY(20px)',
        delay: 1500, // Wait for explosion
        config: config.molasses
    });

    const handleInputSubmit = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        setStarted(true);
        // Optional: Pass the keyword to the app via URL or state
        // For now just visual
    };

    return (
        <section className="h-screen relative flex items-center justify-center overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none"></div>

            {/* Initial Input State */}
            <animated.div style={inputSpring} className="relative z-20 w-full max-w-md px-6">
                <form onSubmit={handleInputSubmit} className="relative group">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="What's on your mind? (e.g. Mars)"
                        className="w-full bg-slate-900/50 backdrop-blur-xl text-white text-xl md:text-2xl py-4 px-6 rounded-2xl border border-white/10 focus:border-white/30 focus:ring-4 focus:ring-white/5 outline-none transition-all text-center placeholder-slate-500 font-light"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <ArrowRight size={20} />
                    </button>
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity -z-10 animate-pulse"></div>
                </form>
                <p className="text-slate-500 text-center mt-4 text-sm font-mono">Press Enter to ignite</p>
            </animated.div>

            {/* Explosion Visualization */}
            {nodeSprings.map((style, i) => (
                <animated.div
                    key={i}
                    style={{
                        ...style,
                        width: nodes[i].size,
                        height: nodes[i].size,
                        position: 'absolute',
                        borderRadius: '50%',
                        background: 'white',
                        boxShadow: `0 0 ${nodes[i].size * 2}px rgba(255,255,255,0.8)`
                    }}
                />
            ))}

            {/* Connecting Lines (Svg) - Simplified for performance */}
            {started && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <animated.g style={{ opacity: titleSpring.opacity }}>
                        {nodes.slice(0, 15).map((node, i) => (
                            <line
                                key={i}
                                x1="50%"
                                y1="50%"
                                x2={`calc(50% + ${Math.cos(node.angle) * node.distance}px)`}
                                y2={`calc(50% + ${Math.sin(node.angle) * node.distance}px)`}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="1"
                            />
                        ))}
                    </animated.g>
                </svg>
            )}

            {/* Post-Explosion Title */}
            <animated.div style={titleSpring} className="absolute z-30 text-center px-6">
                <div className="inline-block px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
                    System Online
                </div>
                <h1 className="text-4xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
                    From Spark to <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Supernova.</span>
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                    Don't just chat. Build a universe of cognition. <br />
                    Your infinite canvas for thoughts, research, and creation.
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="px-8 py-4 bg-white text-slate-950 font-bold rounded-full hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
                    >
                        Start Creating <ArrowRight size={18} />
                    </button>
                    <button
                        onClick={onScrollRequest}
                        className="px-8 py-4 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 backdrop-blur-md transition-colors"
                    >
                        Explore Features
                    </button>
                </div>
            </animated.div>
        </section>
    );
};

// 2. Scale Section: "God's Eye View"
const ScaleSection = () => {
    // Generate many small nodes
    const nodes = Array.from({ length: 150 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 2000,
        color: Math.random() > 0.8 ? '#f43f5e' : (Math.random() > 0.6 ? '#3b82f6' : '#ffffffbf')
    }));

    return (
        <section className="h-screen min-h-[800px] relative flex md:flex-row flex-col items-center justify-between px-6 md:px-20 py-20 bg-slate-950 overflow-hidden border-t border-white/5">
            <div className="w-full md:w-1/2 z-20 md:pr-10">
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                    Scale Your <br />
                    <span className="text-indigo-400">Intellect.</span>
                </h2>
                <h3 className="text-xl md:text-2xl text-slate-300 font-light mb-8 border-l-4 border-indigo-500 pl-4">
                    Manage 1,000+ AI threads on a single surface.
                </h3>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                    Break free from the linear chat stream. Zoom out to see the big picture. Zoom in to refine the details. No more lost context, no more scrolling endless history.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-3xl font-bold text-white mb-1">∞</div>
                        <div className="text-sm text-slate-500 uppercase tracking-wider">Canvas Size</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-3xl font-bold text-white mb-1">100+</div>
                        <div className="text-sm text-slate-500 uppercase tracking-wider">Concurrent Threads</div>
                    </div>
                </div>
            </div>

            {/* Visualization of "The Hive" */}
            <div className="w-full md:w-1/2 h-[400px] md:h-[600px] relative mt-10 md:mt-0">
                <div className="absolute inset-0 rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden radial-fade-mask">
                    {/* The "Brain" of nodes */}
                    <div className="absolute inset-0 animate-slow-zoom origin-center">
                        {nodes.map((node, i) => (
                            <div
                                key={i}
                                className="absolute w-1 h-1 rounded-full animate-pulse-random"
                                style={{
                                    left: node.left,
                                    top: node.top,
                                    backgroundColor: node.color,
                                    animationDelay: `${node.delay}ms`,
                                    boxShadow: `0 0 4px ${node.color}`
                                }}
                            />
                        ))}
                        {/* Connecting lines for effect (SVG overlay) */}
                        <svg className="absolute inset-0 w-full h-full opacity-20">
                            <line x1="20%" y1="30%" x2="60%" y2="70%" stroke="white" strokeWidth="0.5" />
                            <line x1="80%" y1="10%" x2="40%" y2="50%" stroke="white" strokeWidth="0.5" />
                            <line x1="10%" y1="80%" x2="50%" y2="40%" stroke="white" strokeWidth="0.5" />
                        </svg>
                    </div>

                    {/* Overlay Vignette */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)] pointer-events-none"></div>
                </div>
            </div>
        </section>
    );
};

// 3. Parallel Section: "Parallel Minds"
const ParallelSection = () => {
    return (
        <section className="min-h-screen relative flex flex-col md:flex-row-reverse items-center justify-between px-6 md:px-20 py-20 bg-black border-t border-white/5">
            <div className="w-full md:w-1/2 z-20 md:pl-10 mb-12 md:mb-0">
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                    Parallel Minds <br />
                    <span className="text-teal-400">at Work.</span>
                </h2>
                <h3 className="text-xl md:text-2xl text-slate-300 font-light mb-8 border-l-4 border-teal-500 pl-4">
                    Why wait for one thought when you can have ten?
                </h3>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                    Fire off multiple ideas at once. Watch them evolve simultaneously. MixBoard treats every card as an independent agent, orchestrating a symphony of intelligence.
                </p>
                <button className="text-teal-400 font-bold hover:text-teal-300 hover:underline underline-offset-4 flex items-center gap-2">
                    See Concurrency in Action <ArrowRight size={16} />
                </button>
            </div>

            {/* Visualization of Parallelism */}
            <div className="w-full md:w-1/2 relative">
                <div className="grid grid-cols-1 gap-4 relative z-10">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-slate-900 border border-white/10 p-4 rounded-xl flex items-center gap-4 transform transition-transform hover:translate-x-2">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                                <Cpu size={16} className={`text-${i === 1 ? 'rose' : i === 2 ? 'amber' : i === 3 ? 'teal' : 'indigo'}-400`} />
                            </div>
                            <div className="flex-1">
                                <div className="h-2 w-1/3 bg-slate-700 rounded mb-2"></div>
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 animate-progress-indeterminate"
                                        style={{ animationDelay: `${i * 0.5}s`, width: '100%' }}
                                    ></div>
                                </div>
                            </div>
                            <div className="text-xs text-teal-400 font-mono animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    ))}
                </div>
                {/* Glow backing */}
                <div className="absolute inset-0 bg-teal-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            </div>
        </section>
    );
};

// 4. Final Section: Call to Action
const FooterSection = () => {
    const navigate = useNavigate();
    return (
        <section className="py-32 px-6 bg-slate-950 text-center relative overflow-hidden border-t border-white/5">
            <div className="relative z-10 max-w-4xl mx-auto">
                <Network size={64} className="mx-auto text-white mb-8 opacity-50" />
                <h2 className="text-5xl md:text-8xl font-bold text-white mb-10 tracking-tighter">
                    Start Your Map.
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="px-10 py-5 bg-white text-black text-xl font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                        Launch MixBoard
                    </button>
                    <a href="#" className="px-10 py-5 text-slate-400 font-medium hover:text-white transition-colors">
                        Documentation
                    </a>
                </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-b from-indigo-900/20 to-transparent rounded-full blur-[120px] pointer-events-none"></div>
        </section>
    );
};


const LandingPage = () => {
    const scaleRef = useRef(null);

    const scrollToScale = () => {
        scaleRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="w-full min-h-screen bg-slate-950 text-slate-200 selection:bg-teal-500 selection:text-black font-sans overflow-x-hidden">
            <style>{`
                @keyframes slow-zoom {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .animate-slow-zoom {
                    animation: slow-zoom 20s ease-in-out infinite;
                }
                @keyframes pulse-random {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                .animate-pulse-random {
                    animation: pulse-random 3s ease-in-out infinite;
                }
                @keyframes progress-indeterminate {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-progress-indeterminate {
                    animation: progress-indeterminate 2s infinite linear;
                }
                .radial-fade-mask {
                    mask-image: radial-gradient(circle at center, black 60%, transparent 100%);
                }
            `}</style>

            <nav className="fixed top-0 w-full z-50 px-6 py-6 flex justify-between items-center pointer-events-none mix-blend-difference">
                <div className="font-bold text-xl tracking-tight text-white pointer-events-auto">MixBoard.</div>
                <button onClick={() => window.location.href = '/gallery'} className="text-sm font-bold text-white uppercase tracking-widest pointer-events-auto hover:text-teal-400 transition-colors">Login</button>
            </nav>

            <HeroSection onScrollRequest={scrollToScale} />
            <div ref={scaleRef}>
                <ScaleSection />
            </div>
            <ParallelSection />
            <FooterSection />
        </div>
    );
};

export default LandingPage;
