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
                        <div className="absolute inset-0 z-10 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="absolute right-[-100px] top-1/2 -translate-y-1/2 w-[600px] h-[600px]">
                                <GraphVisualization />
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* 2. RECURSIVE IDEATION (1x1) */}
                    <SpotlightCard className="bg-[#080808] border-white/5 group relative overflow-hidden min-h-[200px] md:min-h-0">
                        <div className="relative z-20 p-6 md:p-8 h-full flex flex-col justify-between">
                            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                <GitBranch className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">{t.bento.sprout.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{t.bento.sprout.text}</p>
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
                    <SpotlightCard className="bg-[#080808] border-white/5 group relative overflow-hidden min-h-[200px] md:min-h-0">
                        <div className="relative z-20 p-6 md:p-8 h-full flex flex-col justify-between">
                            <div className="w-14 h-14 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-2xl flex items-center justify-center border border-white/10 group-hover:rotate-180 transition-transform duration-700 ease-out">
                                <Cpu className="w-7 h-7 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">{t.bento.concurrency.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{t.bento.concurrency.text}</p>
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
                            <div className="w-full md:w-1/2 h-40 relative flex items-center justify-center">
                                {/* Zone Container */}
                                <div className="absolute inset-4 border border-dashed border-purple-500/30 rounded-3xl bg-purple-500/5 backdrop-blur-sm animate-pulse-slow flex items-center justify-center">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-300 uppercase tracking-widest">
                                        {t.bento.spatial.zoneExample}
                                    </div>

                                    {/* Nodes inside Zone */}
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/10 flex items-center justify-center shadow-lg transform group-hover:-translate-y-2 transition-transform duration-500">
                                            <div className="w-6 h-1 bg-white/20 rounded-full" />
                                        </div>
                                        <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/10 flex items-center justify-center shadow-lg transform group-hover:translate-x-2 transition-transform duration-500 delay-75">
                                            <div className="w-6 h-1 bg-white/20 rounded-full" />
                                        </div>
                                        <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/10 flex items-center justify-center shadow-lg transform group-hover:translate-y-2 transition-transform duration-500 delay-150">
                                            <div className="w-6 h-1 bg-white/20 rounded-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Floating "Add to Zone" cursor/action */}
                                <div className="absolute -right-4 bottom-0 bg-white text-black p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 group-hover:-translate-y-4 transition-all duration-300 pointer-events-none font-bold text-xs flex gap-2 items-center">
                                    <PlusIcon className="w-3 h-3" />
                                    <span>{t.bento.spatial.autoExpand}</span>
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
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.8; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.02); }
                }
                .animate-dash {
                    animation: dash 1s linear infinite;
                }
                .animate-ping-fast {
                    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
                .animate-pulse-slow {
                    animation: pulse-slow 4s ease-in-out infinite;
                }
                .animate-spin-extremely-slow {
                    animation: spin-extremely-slow 60s linear infinite;
                }
            `}</style>
        </div>
    );
};

// --- Subcomponents ---

const PlusIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="M12 5v14" /></svg>
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
