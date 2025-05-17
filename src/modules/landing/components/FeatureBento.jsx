import React, { useRef, useState, useEffect } from 'react';
import { BrainCircuit, Cpu, Eye, Sparkles, Network, Bot, Image as ImageIcon, Code2 } from 'lucide-react';

const FeatureBento = () => {
    return (
        <div className="w-full relative z-20 py-32 px-4 md:px-12 flex justify-center bg-[#050505]">
            <div className="w-full max-w-6xl flex flex-col justify-center">

                {/* HEADLINE */}
                <div className="text-center mb-24 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
                    <h2 className="relative text-4xl md:text-7xl font-bold text-white mb-6 tracking-tighter">
                        The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 animate-gradient-fast background-animate">AI Engine</span>.
                    </h2>
                    <p className="relative text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                        Stop pasting context. <br />
                        <span className="text-gray-500">We built an LLM interface that </span> <span className="text-white font-medium">actually understands</span> your workflow.
                    </p>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-3 md:grid-rows-2 gap-6 h-auto md:h-[800px]">

                    {/* 1. KEY FEATURE: SPATIAL CONTEXT (2x2) */}
                    <SpotlightCard className="md:col-span-2 md:row-span-2 bg-[#0A0A0A] border-white/5 group overflow-hidden">
                        <div className="relative z-20 p-8 h-full flex flex-col">
                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-white/10 backdrop-blur-sm">
                                <BrainCircuit className="w-7 h-7 text-indigo-400" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-3">Spatial Context Window</h3>
                            <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
                                The AI reads your <span className="text-white">entire canvas</span>. It understands spatial relationships, hierarchy, and connections—not just a linear chat history.
                            </p>
                        </div>

                        {/* Interactive Visual: Scanning Effect */}
                        <div className="absolute inset-0 z-10 opacity-50 group-hover:opacity-100 transition-all duration-700 pointer-events-none">
                            {/* Mini Map Representation */}
                            <div className="absolute right-10 bottom-10 w-64 h-64 opacity-50 group-hover:opacity-100 transition-opacity">
                                {/* Central Hub */}
                                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_20px_white]" />
                                {/* Scanning Beam */}
                                <div className="absolute top-1/2 left-1/2 w-[200px] h-[200px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-white/5" style={{ animationDuration: '4s' }} />
                                {/* Connecting Nodes */}
                                <div className="absolute top-10 left-20 w-2 h-2 bg-gray-500 rounded-full" />
                                <div className="absolute bottom-20 right-10 w-2 h-2 bg-gray-500 rounded-full" />
                                <div className="absolute top-20 right-20 w-2 h-2 bg-gray-500 rounded-full" />

                                {/* Active Connecting Lines */}
                                <svg className="absolute inset-0 w-full h-full overflow-visible">
                                    <line x1="50%" y1="50%" x2="30%" y2="20%" stroke="rgba(255,255,255,0.1)" />
                                    <line x1="50%" y1="50%" x2="80%" y2="70%" stroke="rgba(255,255,255,0.1)" />
                                </svg>
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* 2. MULTI-MODEL (1x1) */}
                    <SpotlightCard className="bg-[#0A0A0A] border-white/5 group relative overflow-hidden">
                        <div className="relative z-20 p-8 h-full flex flex-col justify-between">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:border-purple-500/30 transition-colors">
                                <Cpu className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Multi-Model</h3>
                                <p className="text-gray-400 text-sm">GPT-4, Claude 3.5, Gemini. <br /> Switch instantly.</p>
                            </div>
                        </div>
                        {/* Background Effect */}
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-75" />
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse delay-150" />
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* 3. VISUAL IMAGINATION (1x1) */}
                    <SpotlightCard className="bg-[#0A0A0A] border-white/5 group relative overflow-hidden">
                        <div className="relative z-20 p-8 h-full flex flex-col justify-between">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:border-pink-500/30 transition-colors">
                                <ImageIcon className="w-6 h-6 text-pink-400 group-hover:rotate-12 transition-transform" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Generative Vision</h3>
                                <p className="text-gray-400 text-sm">Words to Pixels. <br /> Integrated Image gen.</p>
                            </div>
                        </div>
                        {/* Image Reveal Effect */}
                        <div className="absolute inset-0 bg-gradient-to-t from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </SpotlightCard>

                    {/* 4. STRUCTURED OUTPUT (2x1 wide) */}
                    <SpotlightCard className="md:col-span-2 bg-[#0A0A0A] border-white/5 group overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-20 p-8 flex flex-col md:flex-row h-full items-center justify-between">
                            <div className="mb-6 md:mb-0 relative z-10">
                                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-white/5 text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    <Bot className="w-3 h-3" />
                                    <span>Smart Formatting</span>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-2">Structured Output</h3>
                                <p className="text-gray-400 max-w-xs">Don't just get text. Get <span className="text-white">Mind Maps, Tables, and Code</span> directly on canvas.</p>
                            </div>

                            {/* Floating Cards Visual */}
                            <div className="relative w-full md:w-64 h-32 pointer-events-none perspective-[800px]">
                                <div className="absolute top-4 right-4 bg-[#1a1a1a] border border-white/10 rounded-lg p-3 w-40 transform rotate-y-[-20deg] rotate-x-[10deg] shadow-xl group-hover:translate-y-[-10px] transition-transform duration-500">
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center"><Code2 size={14} className="text-blue-400" /></div>
                                        <div className="flex-1 space-y-1">
                                            <div className="w-full h-1.5 bg-white/20 rounded-full" />
                                            <div className="w-2/3 h-1.5 bg-white/10 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 bg-[#1a1a1a] border border-white/10 rounded-lg p-3 w-40 transform rotate-y-[20deg] rotate-x-[10deg] shadow-xl group-hover:translate-y-[10px] transition-transform duration-500">
                                    <div className="flex gap-2 items-center">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <div className="w-full h-1.5 bg-white/20 rounded-full" />
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        <div className="w-full h-1 bg-white/10 rounded-full" />
                                        <div className="w-full h-1 bg-white/10 rounded-full" />
                                    </div>
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
                @keyframes spin-slow {
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 10s linear infinite;
                }
            `}</style>
        </div>
    );
};

// --- Subcomponents ---

const SpotlightCard = ({ children, className = "" }) => {
    const divRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e) => {
        if (!divRef.current) return;
        const div = divRef.current;
        const rect = div.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setIsFocused(true);
        setOpacity(1);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setOpacity(0);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative rounded-3xl border border-white/10 bg-[#121212] overflow-hidden ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
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
