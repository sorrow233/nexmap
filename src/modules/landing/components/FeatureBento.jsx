import React, { useRef, useState, useEffect } from 'react';
import { Network, GitBranch, Cpu, Zap, Brain, Sparkles, Workflow, Bot, Database } from 'lucide-react';

const FeatureBento = () => {
    return (
        <div className="w-full relative z-20 py-32 px-4 md:px-12 flex justify-center bg-[#050505]">
            <div className="w-full max-w-7xl flex flex-col justify-center">

                {/* HEADLINE */}
                <div className="text-center mb-24 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
                    <h2 className="relative text-5xl md:text-8xl font-bold text-white mb-8 tracking-tighter">
                        Beyond <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient-fast background-animate">Chatbots</span>.
                    </h2>
                    <p className="relative text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
                        We didn't just wrap an API. We built a <span className="text-white font-medium">Graph-Native AI Orchestrator</span> that thinks recursively, manages unlimited concurrency, and sees your entire project structure.
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
                                    Traditional LLMs only see linear chat interactions. Our engine traverses the <span className="text-gray-200">connected graph</span> of your canvas, pruning irrelevant nodes and injecting precise neighbor context into every generation.
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
                                <p className="text-gray-400 text-sm leading-relaxed">It doesn't just answer—it actively suggests. Click "Sprout" to have the AI recursively branch one idea into five divergent concepts.</p>
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
                                <p className="text-gray-400 text-sm leading-relaxed">No "Thinking..." blockers. Fire off 50 streams at once. Our dedicated <span className="font-mono text-pink-400">AIManager</span> handles the queue, priority, and parsing.</p>
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

                    {/* 4. TRANSPARENT REASONING (Bottom Full Width) */}
                    <SpotlightCard className="md:col-span-3 bg-[#080808] border-white/5 group overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-20 p-8 flex flex-col md:flex-row h-full items-center gap-12">
                            <div className="flex-1 min-w-0">
                                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-white/5 text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    <Brain className="w-3 h-3" />
                                    <span>Chain of Thought</span>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-3">Transparent Reasoning</h3>
                                <p className="text-gray-400 max-w-xl leading-relaxed">
                                    We expose the raw <span className="font-mono text-blue-300 text-xs bg-blue-500/10 px-1 py-0.5 rounded">&lt;thinking&gt;</span> process. See exactly how the agent deconstructs your problem before it solutions it. Zero black boxes.
                                </p>
                            </div>

                            {/* Code/Reasoning Visualization */}
                            <div className="w-full md:w-1/2 bg-[#000] border border-white/10 rounded-xl p-4 font-mono text-xs overflow-hidden relative shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-8 bg-[#111] border-b border-white/5 flex items-center px-4 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <div className="ml-auto text-gray-600">agent_reasoning.log</div>
                                </div>
                                <div className="mt-6 space-y-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                    <div className="text-gray-500">&lt;thinking&gt;</div>
                                    <div className="text-emerald-600 pl-4">1. Analyze user intent: "Refactor auth middleware"</div>
                                    <div className="text-emerald-600 pl-4">2. Scan dependency graph: Found 3 connected services.</div>
                                    <div className="text-emerald-600 pl-4">3. Identified potential race condition in token refresh.</div>
                                    <div className="text-emerald-600 pl-4">4. Formulating strategy: Implement mutex lock pattern.</div>
                                    <div className="text-gray-500">&lt;/thinking&gt;</div>
                                    <div className="text-blue-400 mt-2">Based on the analysis of the auth service connections...</div>
                                </div>
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
                    to { stroke-dashoffset: 0; }
                }
                @keyframes scanline {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes spin-extremely-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-extremely-slow {
                    animation: spin-extremely-slow 60s linear infinite;
                }
            `}</style>
        </div>
    );
};

// --- Subcomponents ---

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
