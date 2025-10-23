import React, { useRef, useState, useEffect } from 'react';
import { Network, GitBranch, Cpu, Zap, Brain, Sparkles, Workflow, Bot, Database, Shield, Radio } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const FeatureBento = () => {
    const { t } = useLanguage();

    return (
        <div className="w-full relative z-20 py-16 md:py-32 px-4 md:px-12 flex justify-center bg-[#050505]">
            <div className="w-full max-w-7xl flex flex-col justify-center">

                {/* HEADLINE */}
                <div className="text-center mb-24 relative">
                    <h2 className="relative text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-bold text-white mb-4 md:mb-8 tracking-tighter">
                        {t.bento.headline.pre} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient-fast background-animate">{t.bento.headline.highlight}</span> {t.bento.headline.post}
                    </h2>
                    <p className="relative text-base md:text-xl text-gray-400 max-w-4xl mx-auto font-light leading-relaxed px-2">
                        {t.bento.subtext}
                    </p>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 h-auto md:h-[900px]">

                    {/* 1. KEY Differentiator: GRAPH CONTEXT (2x2) */}
                    <SpotlightCard className="md:col-span-2 md:row-span-2 bg-[#080808] border-white/5 group overflow-hidden min-h-[300px] md:min-h-0">
                        <div className="relative z-20 p-6 md:p-10 h-full flex flex-col items-start justify-between pointer-events-none">
                            <div className="w-full max-w-lg">
                                <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                                    <Network className="w-3 h-3" />
                                    <span>{t.bento.graph.badge}</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">{t.bento.graph.title}</h3>
                                <p className="text-gray-400 text-lg leading-relaxed">
                                    {t.bento.graph.text}
                                </p>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <div className="flex flex-col gap-1">
                                    <span className="text-3xl font-mono text-white font-bold">128k</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t.bento.graph.stat1}</span>
                                </div>
                                <div className="w-px h-12 bg-white/10" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-3xl font-mono text-white font-bold">∞</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t.bento.graph.stat2}</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Visual: Graph Traversal */}
                        <div className="absolute inset-0 z-10 opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                            <div className="absolute right-0 top-0 w-full h-full">
                                <GraphVisualization />
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* 2. RECURSIVE IDEATION (1x1) */}
                    <SpotlightCard className="bg-[#080808] border-white/5 group relative overflow-hidden min-h-[200px] md:min-h-0">
                        <div className="relative z-20 p-6 md:p-8 h-full flex flex-col justify-between pointer-events-none">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500 z-10 bg-[#080808]">
                                <GitBranch className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div className="z-10">
                                <h3 className="text-2xl font-bold text-white mb-2">{t.bento.sprout.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{t.bento.sprout.text}</p>
                            </div>
                        </div>
                        {/* Recursive Branching Visual */}
                        <SproutVisualization />
                    </SpotlightCard>


                    {/* 3. UNLIMITED CONCURRENCY (1x1) */}
                    <SpotlightCard className="bg-[#080808] border-white/5 group relative overflow-hidden min-h-[200px] md:min-h-0">
                        <div className="relative z-20 p-6 md:p-8 h-full flex flex-col justify-between pointer-events-none">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-2xl flex items-center justify-center border border-white/10 group-hover:rotate-180 transition-transform duration-700 ease-out z-10 bg-[#080808]">
                                <Cpu className="w-7 h-7 text-pink-400" />
                            </div>
                            <div className="z-10">
                                <h3 className="text-2xl font-bold text-white mb-2">{t.bento.concurrency.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{t.bento.concurrency.text}</p>
                            </div>
                        </div>
                        {/* Concurrency lines */}
                        <ConcurrencyVisualization />
                    </SpotlightCard>


                    {/* 4. SEMANTIC ZONING (Bottom Full Width) - REPLACED DIRECT-TO-API */}
                    <SpotlightCard className="md:col-span-3 bg-[#080808] border-white/5 group overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-20 p-6 md:p-8 flex flex-col md:flex-row h-full items-center gap-6 md:gap-12">
                            <div className="flex-1 min-w-0">
                                <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-white/5 text-purple-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    <Database className="w-3 h-3" />
                                    <span>{t.bento.spatial.badge}</span>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-3">{t.bento.spatial.title}</h3>
                                <p className="text-gray-400 max-w-xl leading-relaxed">
                                    {t.bento.spatial.text}
                                </p>
                            </div>

                            {/* Zoning Visualization */}
                            <div className="w-full md:w-1/2 h-full min-h-[160px] relative flex items-center justify-center overflow-hidden">
                                <SpatialVisualization />

                                {/* Representational UI Overlay */}
                                <div className="relative z-10 border border-dashed border-purple-500/30 rounded-3xl bg-purple-500/5 backdrop-blur-sm p-6 flex gap-4 animate-pulse-slow">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-300 uppercase tracking-widest">
                                        {t.bento.spatial.zoneExample}
                                    </div>
                                    <div className="w-12 h-12 bg-purple-400/10 rounded-xl border border-purple-400/20 shadow-inner" />
                                    <div className="w-12 h-12 bg-purple-400/10 rounded-xl border border-purple-400/20 shadow-inner" />
                                    <div className="w-12 h-12 bg-purple-400/10 rounded-xl border border-purple-400/20 shadow-inner" />
                                </div>
                            </div>
                        </div>
                    </SpotlightCard>

                </div>

                {/* Legal Footer */}
                <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                    <div>
                        &copy; {new Date().getFullYear()} NexMap. All rights reserved.
                    </div>
                    <div className="flex gap-6">
                        <a href="/legal/terms" className="hover:text-slate-300 transition-colors">Terms</a>
                        <a href="/legal/privacy" className="hover:text-slate-300 transition-colors">Privacy</a>
                        <a href="/legal/tokushoho" className="hover:text-slate-300 transition-colors">特定商取引法</a>
                    </div>
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
                    to { stroke-dashoffset: 0; }
                }
                @keyframes scanline {
                    0% { transform: translateX(-100%); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateX(100%); opacity: 0; }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.4; transform: scale(1); filter: blur(0px); }
                    50% { opacity: 1; transform: scale(1.5); filter: blur(2px); }
                }
                @keyframes float-up {
                    0% { transform: translateY(20px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes beam {
                    0% { opacity: 0; transform: scaleX(0); }
                    50% { opacity: 1; transform: scaleX(1); }
                    100% { opacity: 0; transform: scaleX(0); }
                }
                .animate-beam {
                     transform-origin: left;
                     animation: beam 2s ease-in-out infinite;
                }
                .animate-dash {
                    animation: dash 2s ease-out forwards;
                }
                .bg-grid-pattern {
                    background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}</style>
        </div>
    );
};

// --- Subcomponents ---

const PlusIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);

const GraphVisualization = () => {
    // Desktop-class heavy visualization
    const nodes = [
        { x: 50, y: 50, r: 4 },
        { x: 30, y: 30, r: 2 }, { x: 70, y: 30, r: 2 },
        { x: 30, y: 70, r: 2 }, { x: 70, y: 70, r: 2 },
        { x: 50, y: 20, r: 3 }, { x: 50, y: 80, r: 3 },
        { x: 20, y: 50, r: 3 }, { x: 80, y: 50, r: 3 },
        { x: 35, y: 40, r: 2 }, { x: 65, y: 40, r: 2 },
        { x: 35, y: 60, r: 2 }, { x: 65, y: 60, r: 2 },
    ];

    // Connections
    const edges = [
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
        [1, 5], [2, 5], [3, 6], [4, 6], [7, 1], [7, 3], [8, 2], [8, 4],
        [9, 1], [9, 3], [10, 2], [10, 4]
    ];

    return (
        <div className="relative w-full h-full animate-spin-extremely-slow" style={{ animationDuration: '60s' }}>
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-indigo-600/20 rounded-full blur-[50px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" />

            {/* Edges */}
            <svg className="absolute inset-0 w-full h-full overflow-visible">
                {edges.map(([a, b], i) => (
                    <line
                        key={i}
                        x1={`${nodes[a].x}%`} y1={`${nodes[a].y}%`}
                        x2={`${nodes[b].x}%`} y2={`${nodes[b].y}%`}
                        stroke="rgba(99, 102, 241, 0.15)"
                        strokeWidth="1"
                    />
                ))}
                {/* Active Data Packets traveling */}
                {edges.map(([a, b], i) => (
                    i % 3 === 0 && (
                        <circle key={`p-${i}`} r="1.5" fill="#a5b4fc">
                            <animateMotion
                                dur={`${2 + i % 3}s`}
                                repeatCount="indefinite"
                                path={`M${nodes[a].x * 3 /* scale fix attempt? No, SVG coords differ */}...`}
                            // CSS motion on lines is harder purely with SVG coords in % without exact pixels.
                            // Fallback to CSS animation wrapper
                            />
                            {/* Alternative: CSS animation on line stroke-dashoffset or a traveling div */}
                        </circle>
                    )
                ))}
            </svg>

            {/* Simulated Traveling Signals via DOM for easier relative positioning */}
            {edges.slice(0, 8).map(([a, b], i) => {
                // Calculate angle and length for custom moving particle
                // Simplified: Just use pulsing nodes
                return null;
            })}

            {/* Dynamic Pulses on Nodes */}
            {nodes.map((node, i) => (
                <div key={i} className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                    <div className={`w-full h-full rounded-full ${i === 0 ? 'bg-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.6)]' : 'bg-indigo-500/50'}`} />
                    {i === 0 && <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-75" />}
                    {(i % 3 === 0) && <div className="absolute inset-0 border border-indigo-400 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: `${i * 0.2}s` }} />}
                </div>
            ))}
        </div>
    );
};

const SproutVisualization = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity duration-700">
        {/* Fractal Tree SVG */}
        <svg className="w-full h-full max-w-[200px]" viewBox="0 0 200 200" fill="none" stroke="currentColor">
            {/* Main Trunk */}
            <motion-path d="M100 200 L100 150" className="stroke-emerald-500 stroke-2" />

            {/* Branch Level 1 */}
            <path d="M100 150 Q 60 100 40 80" className="stroke-emerald-500/80 stroke-2" strokeDasharray="120" strokeDashoffset="120" style={{ animation: 'dash 1.5s ease-out forwards 0.2s' }} />
            <path d="M100 150 Q 140 100 160 80" className="stroke-emerald-500/80 stroke-2" strokeDasharray="120" strokeDashoffset="120" style={{ animation: 'dash 1.5s ease-out forwards 0.4s' }} />
            <path d="M100 150 L 100 90" className="stroke-emerald-500/80 stroke-2" strokeDasharray="120" strokeDashoffset="120" style={{ animation: 'dash 1.5s ease-out forwards 0.3s' }} />

            {/* Branch Level 2 (Tips) */}
            <circle cx="40" cy="80" r="3" className="fill-emerald-300 animate-pulse" />
            <circle cx="160" cy="80" r="3" className="fill-emerald-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            <circle cx="100" cy="90" r="3" className="fill-emerald-300 animate-pulse" style={{ animationDelay: '0.3s' }} />

            {/* "Thoughts" popping */}
            <circle cx="30" cy="60" r="1.5" className="fill-emerald-200/50 animate-ping" style={{ animationDuration: '2s' }} />
            <circle cx="170" cy="60" r="1.5" className="fill-emerald-200/50 animate-ping" style={{ animationDuration: '2.5s' }} />
        </svg>
    </div>
);

const ConcurrencyVisualization = () => (
    <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
        {/* Matrix Rain / High speed scanlines */}
        {[...Array(20)].map((_, i) => (
            <div
                key={i}
                className="absolute h-[1px] w-1/2 bg-gradient-to-r from-transparent via-pink-400 to-transparent blur-[0.5px]"
                style={{
                    top: `${Math.random() * 100}%`,
                    left: 0,
                    animation: `scanline ${0.5 + Math.random()}s linear infinite`,
                    animationDelay: `${Math.random() * 2}s`
                }}
            />
        ))}
        {/* Particles */}
        {[...Array(10)].map((_, i) => (
            <div
                key={`p-${i}`}
                className="absolute w-1 h-1 bg-pink-300 rounded-full shadow-[0_0_5px_currentColor]"
                style={{
                    top: `${Math.random() * 100}%`,
                    left: 0,
                    animation: `scanline ${1 + Math.random()}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                    animationDelay: `${Math.random()}s`
                }}
            />
        ))}
    </div>
);

const SpatialVisualization = () => {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* 3D-ish Isometric Grid effect via CSS transform */}
            <div className="absolute inset-0 perspective-[1000px] opacity-0 group-hover:opacity-100 transition-all duration-700">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] flex flex-wrap gap-2 rotate-x-60 rotate-z-12 bg-grid-pattern opacity-20" />

                {/* Rising Blocks */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-purple-500/20 border border-purple-400/30 backdrop-blur-sm shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                        style={{
                            width: '40px', height: '40px',
                            left: `${40 + (i % 3) * 15}%`,
                            top: `${30 + Math.floor(i / 3) * 30}%`,
                            animation: 'pulse-glow 3s infinite ease-in-out',
                            animationDelay: `${i * 0.2}s`
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

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
