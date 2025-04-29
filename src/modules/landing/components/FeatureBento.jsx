import React, { useRef, useState, useEffect } from 'react';
import { Image, Download, History, MousePointer2, Layers, Video, FileText, Music } from 'lucide-react';

const FeatureBento = () => {
    return (
        <div className="w-full relative z-20 py-32 px-4 md:px-12 flex justify-center bg-[#050505]">
            <div className="w-full max-w-6xl flex flex-col justify-center">

                {/* HEADLINE */}
                <div className="text-center mb-24 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
                    <h2 className="relative text-4xl md:text-7xl font-bold text-white mb-6 tracking-tighter">
                        Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-500 animate-gradient-fast background-animate">Power Users</span>.
                    </h2>
                    <p className="relative text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                        We stripped away the clutter. <br />
                        <span className="text-gray-500">You focus on the </span> <span className="text-white font-medium">flow</span>.
                    </p>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-3 md:grid-rows-2 gap-6 h-auto md:h-[800px]">

                    {/* 1. MEDIA CARD (2x2) */}
                    <SpotlightCard className="md:col-span-2 md:row-span-2 bg-[#0A0A0A] border-white/5 group overflow-hidden">
                        <div className="relative z-20 p-8 h-full flex flex-col">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-white/10 backdrop-blur-sm">
                                <Layers className="w-7 h-7 text-purple-400" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-3">Rich Media Canvas</h3>
                            <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
                                Don't just resize images. <span className="text-white">Crop, filter, and stack</span> videos, PDFs, and 3D models directly on the canvas.
                            </p>
                        </div>

                        {/* Interactive Visual Layer */}
                        <div className="absolute inset-0 z-10 opacity-80 group-hover:opacity-100 transition-all duration-700">
                            {/* Floating Media Stack */}
                            <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[120%] rotate-[-5deg] group-hover:rotate-0 transition-transform duration-700">
                                {/* Video Card */}
                                <div className="absolute bottom-1/4 right-1/3 w-64 h-40 bg-[#151515] border border-white/10 rounded-lg shadow-2xl p-2 transform transition-transform duration-500 group-hover:translate-y-[-20px] group-hover:translate-x-[-10px]">
                                    <div className="w-full h-full bg-[#222] rounded overflow-hidden relative group-hover:brightness-110 transition-all">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                                                <Video className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Image Card */}
                                <div className="absolute bottom-10 right-10 w-72 h-48 bg-[#181818] border border-white/10 rounded-lg shadow-2xl p-2 transform transition-transform duration-700 group-hover:z-30 group-hover:scale-105">
                                    <div className="w-full h-full bg-[#2a2a2a] rounded overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-emerald-500/20" />
                                        <div className="absolute bottom-3 left-3 flex gap-2">
                                            <div className="w-20 h-2 bg-white/20 rounded-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Music Card */}
                                <div className="absolute top-1/3 right-10 w-48 h-12 bg-[#1a1a1a] border border-white/10 rounded-full shadow-xl flex items-center px-3 gap-3 transform transition-transform duration-1000 group-hover:translate-y-[10px]">
                                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                                        <Music className="w-4 h-4 text-pink-400" />
                                    </div>
                                    <div className="h-2 w-20 bg-white/10 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </SpotlightCard>

                    {/* 2. UNDO CARD (1x1) */}
                    <SpotlightCard className="bg-[#0A0A0A] border-white/5 group relative overflow-hidden">
                        <div className="relative z-20 p-8 h-full flex flex-col justify-between">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                                <History className="w-6 h-6 text-emerald-400 transition-transform duration-500 group-hover:-rotate-180" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Time Travel</h3>
                                <p className="text-gray-400 text-sm">Infinite undo history. <br /> Never lose a thought.</p>
                            </div>
                        </div>
                        {/* Background Effect */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-[20px] border-emerald-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 scale-50 group-hover:scale-100" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-[10px] border-emerald-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 scale-50 group-hover:scale-100" />
                    </SpotlightCard>

                    {/* 3. EXPORT CARD (1x1) */}
                    <SpotlightCard className="bg-[#0A0A0A] border-white/5 group relative overflow-hidden">
                        <div className="relative z-20 p-8 h-full flex flex-col justify-between">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:bg-blue-500/20 transition-colors">
                                <Download className="w-6 h-6 text-blue-400 group-hover:animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">4K Export</h3>
                                <p className="text-gray-400 text-sm">PDF, PNG, or JSON. <br /> Pixel perfect.</p>
                            </div>
                        </div>
                        {/* Scanline Effect */}
                        <div className="absolute inset-0 bg-blue-500/5 z-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.5)] z-10 translate-y-full group-hover:translate-y-[-300px] transition-transform duration-1000 ease-linear opacity-0 group-hover:opacity-100 delay-100" />
                    </SpotlightCard>

                    {/* 4. SYNC CARD (2x1) */}
                    <SpotlightCard className="md:col-span-2 bg-[#0A0A0A] border-white/5 group overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-20 p-8 flex flex-col md:flex-row h-full items-center justify-between">
                            <div className="mb-6 md:mb-0 relative z-10">
                                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-white/5 text-orange-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                    <span>Coming Soon</span>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-2">Hive Mind</h3>
                                <p className="text-gray-400 max-w-xs">Real-time collaboration with <span className="text-white">zero latency</span>.</p>
                            </div>

                            {/* Cursors Container */}
                            <div className="relative w-full md:w-64 h-32 pointer-events-none">
                                <div className="absolute top-1/2 left-1/4 animate-float-slow">
                                    <Cursor color="text-pink-500" fill="fill-pink-500" label="Designer" delay="0s" />
                                </div>
                                <div className="absolute top-1/3 right-1/4 animate-float-medium">
                                    <Cursor color="text-cyan-500" fill="fill-cyan-500" label="Engineer" delay="1s" />
                                </div>
                                <div className="absolute bottom-1/4 left-1/2 animate-float-fast">
                                    <Cursor color="text-yellow-500" fill="fill-yellow-500" label="Manager" delay="0.5s" />
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
            `}</style>
        </div>
    );
};

// --- Subcomponents ---

const Cursor = ({ color, fill, label, delay }) => (
    <div className="relative" style={{ animationDelay: delay }}>
        <MousePointer2 className={`w-6 h-6 ${color} ${fill} drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]`} />
        <span className={`absolute left-5 top-5 ${color.replace('text', 'bg')} text-black text-[10px] font-bold px-2 py-0.5 rounded-full rounded-tl-none whitespace-nowrap`}>
            {label}
        </span>
    </div>
);

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
