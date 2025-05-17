import React, { useRef, useState, useEffect } from 'react';
import { Network, GitBranch, Cpu, Zap, Brain, Sparkles, Workflow, Bot, Database, Shield, Radio } from 'lucide-react';

const FeatureBento = () => {
    return (
        <div className="w-full relative z-20 py-32 px-4 md:px-12 flex justify-center bg-[#050505]">
            <div className="w-full max-w-7xl flex flex-col justify-center">

                {/* HEADLINE */}
                <div className="text-center mb-24 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                    <h2 className="relative text-5xl md:text-8xl font-bold text-white mb-8 tracking-tighter">
                        For <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient-fast background-animate">Professional</span> LLM Users.
                    </h2>
                    <p className="relative text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
                        The interface for the <span className="text-white font-medium">Top 1%</span>. A graph-native orchestrator constructed for maximum concurrency, context depth, and architectural purity.
                    </p>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-4 md:grid-rows-2 gap-6 h-auto md:h-[900px]">

                    {/* 1. KEY Differentiator: GRAPH CONTEXT (2x2) */}
                    <SpotlightCard className="md:col-span-2 md:row-span-2 bg-[#080808] border-white/5 group overflow-hidden">
                        <div className="relative z-20 p-10 h-full flex flex-col items-start justify-between pointer-events-none">
                            <div className="w-full max-w-lg">
                                <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                                    <Network className="w-3 h-3" />
                                    <span>Graph Context Walking</span>
                                </div>
                                <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">It reads the <br />connections.</h3>
                                <p className="text-gray-400 text-lg leading-relaxed">
                                    Traditional chat UIs are oblivious to structure. Our engine traverses the <span className="text-gray-200">semantic graph</span> of your canvas, pruning irrelevant nodes and injecting precise neighbor context into every generation.
                                </p>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <div className="flex flex-col gap-1">
                                    <span className="text-3xl font-mono text-white font-bold">128k</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">Token Window</span>
                                </div>
                                <div className="w-px h-12 bg-white/10" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-3xl font-mono text-white font-bold">∞</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">Depth</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Visual: Graph Traversal */}
                        <div className="absolute inset-0 z-10 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="absolute right-[-100px] top-1/2 -translate-y-1/2 w-[600px] h-[600px]">
                                <GraphVisualization />
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* 2. RECURSIVE IDEATION (1x1) */}
                    <SpotlightCard className="bg-[#080808] border-white/5 group relative overflow-hidden">
                        <div className="relative z-20 p-8 h-full flex flex-col justify-between">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                <GitBranch className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Recursive "Sprout"</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">Active ideation. Click "Sprout" to have the AI recursively branch one thought into five divergent execution paths.</p>
                            </div>
                        </div>
                        {/* Recursive Branching Visual */}
                        <div className="absolute top-10 right-10 w-32 h-32 opacity-20 group-hover:opacity-100 transition-opacity duration-700">
                            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                                <path d="M10 50 C 40 50, 40 20, 90 20" className="text-emerald-500 stroke-2" strokeDasharray="100" strokeDashoffset="100" style={{ animation: 'dash 2s ease-out forwards' }} />
                                <path d="M10 50 C 40 50, 40 50, 90 50" className="text-emerald-500 stroke-2" strokeDasharray="100" strokeDashoffset="100" style={{ animation: 'dash 2s ease-out 0.2s forwards' }} />
                                <path d="M10 50 C 40 50, 40 80, 90 80" className="text-emerald-500 stroke-2" strokeDasharray="100" strokeDashoffset="100" style={{ animation: 'dash 2s ease-out 0.4s forwards' }} />
                                <circle cx="90" cy="20" r="3" className="fill-emerald-400 animate-pulse" />
                                <circle cx="90" cy="50" r="3" className="fill-emerald-400 animate-pulse delay-100" />
                                <circle cx="90" cy="80" r="3" className="fill-emerald-400 animate-pulse delay-200" />
                            </svg>
                        </div>
                    </SpotlightCard>

                    {/* 3. UNLIMITED CONCURRENCY (1x1) */}
                    <SpotlightCard className="bg-[#080808] border-white/5 group relative overflow-hidden">
                        <div className="relative z-20 p-8 h-full flex flex-col justify-between">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-2xl flex items-center justify-center border border-white/10 group-hover:rotate-180 transition-transform duration-700 ease-out">
                                <Cpu className="w-7 h-7 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Unlimited Concurrency</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">No "Thinking..." blockers. Fire off 50 streams simultaneous. Our non-blocking <span className="font-mono text-pink-400">AIManager</span> handles the load.</p>
                            </div>
                        </div>
                        {/* Concurrency lines */}
                        <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="absolute h-[1px] bg-gradient-to-r from-transparent via-pink-500/50 to-transparent w-full"
                                    style={{ top: `${20 + i * 15}%`, animation: `scanline 2s linear infinite ${i * 0.2}s` }} />
                            ))}
                        </div>
                    </SpotlightCard>

                    {/* 4. DIRECT PIPELINE (Bottom Full Width) - REPLACED TRANSPARENT REASONING */}
                    <SpotlightCard className="md:col-span-3 bg-[#080808] border-white/5 group overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-20 p-8 flex flex-col md:flex-row h-full items-center gap-12">
                            <div className="flex-1 min-w-0">
                                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-white/5 text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    <Zap className="w-3 h-3" />
                                    <span>Zero-Latency Architecture</span>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-3">Direct-to-API Pipeline</h3>
                                <p className="text-gray-400 max-w-xl leading-relaxed">
                                    We eliminated the middleware bottleneck. Your client connects <span className="text-white">directly</span> to the inference provider (Gemini/OpenAI). Pure speed. Absolute privacy. No server logs.
                                </p>
                            </div>

                            {/* Direct Connection Visualization */}
                            <div className="w-full md:w-1/2 h-32 relative flex items-center justify-center">
                                {/* Nodes */}
                                <div className="absolute left-10 flex flex-col items-center gap-2 z-10">
                                    <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center shadow-2xl">
                                        <span className="font-bold text-white">Client</span>
                                    </div>
                                </div>

                                <div className="absolute right-10 flex flex-col items-center gap-2 z-10">
                                    <div className="w-16 h-16 bg-blue-900/40 border border-blue-500/50 rounded-2xl flex items-center justify-center shadow-glow-blue">
                                        <Brain className="text-blue-400" size={24} />
                                    </div>
                                </div>

                                {/* Bypassed Node (Middleware) */}
                                <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40 grayscale">
                                    <div className="w-12 h-12 border border-dashed border-gray-600 rounded-xl flex items-center justify-center">
                                        <span className="text-[10px] text-gray-500">Middleware</span>
                                    </div>
                                    <XIcon className="text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8" />
                                </div>

                                {/* Connection Line */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                                    <defs>
                                        <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                                            <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d="M 100 64 L 350 64"
                                        stroke="url(#gradient-line)"
                                        strokeWidth="2"
                                        fill="none"
                                        strokeDasharray="200"
                                        className="animate-dash"
                                    />
                                    <circle cx="100" cy="64" r="3" className="fill-indigo-400 animate-ping-fast" />
                                    <circle cx="350" cy="64" r="3" className="fill-blue-400 animate-ping-fast delay-75" />
                                </svg>
                            </div>
                        </div>
                    </SpotlightCard>

                </div>
            </div>

            <style>{`
                .background-animate {
                    background-size: 200%;
                    animation: hue-rotate 3s infinite linear;
                }
                @keyframes hue-rotate {
                     0% { filter: hue-rotate(0deg); }
                     100% { filter: hue-rotate(30deg); }
                }
                @keyframes dash {
                    to { stroke-dashoffset: -400; }
                }
                @keyframes scanline {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes spin-extremely-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-dash {
                    animation: dash 1s linear infinite;
                }
                .animate-ping-fast {
                    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
                .animate-spin-extremely-slow {
                    animation: spin-extremely-slow 60s linear infinite;
                }
            `}</style>
        </div>
    );
};

// --- Subcomponents ---

const XIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
);

const GraphVisualization = () => (
    <div className="relative w-full h-full animate-spin-extremely-slow">
        {/* Central Hub */}
        <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-indigo-500 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />

        {/* Orbiting Nodes */}
        {[...Array(6)].map((_, i) => {
            const angle = (i * 60) * (Math.PI / 180);
            const radius = 150;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
                <div key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(${x}px, ${y}px)` }}>
                    <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: `${i * 0.2}s` }} />
                    <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] pointer-events-none" style={{ left: -x, top: -y }}>
                        <line x1="150" y1="150" x2={150 + x} y2={150 + y} stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1" />
                    </svg>
                </div>
            );
        })}
    </div>
);

const SpotlightCard = ({ children, className = "" }) => {
    const divRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e) => {
        if (!divRef.current) return;
        const div = divRef.current;
        const rect = div.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setOpacity(1)}
            onMouseLeave={() => setOpacity(0)}
            className={`relative rounded-3xl border border-white/10 bg-[#121212] overflow-hidden transition-all duration-300 hover:border-white/20 ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-10"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,.06), transparent 40%)`,
                }}
            />
            {children}
        </div>
    );
};

export default FeatureBento;
