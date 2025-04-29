import React, { useRef, useState } from 'react';
import { Image, Download, History, MousePointer2, Layers } from 'lucide-react';

const FeatureBento = () => {
    // This section is now static at the bottom (relative positioning in index.jsx)
    // No more scroll progress needed for opacity/visibility once scrolled into view.

    return (
        <div className="w-full relative z-20 py-32 px-4 md:px-12 flex justify-center bg-[#050505]">
            <div className="w-full max-w-6xl flex flex-col justify-center">
                <div className="text-center mb-24">
                    <h2 className="text-4xl md:text-7xl font-bold text-white mb-6 tracking-tighter">
                        Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Power Users</span>.
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light">
                        We stripped away the clutter so you can focus on the flow.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-3 md:grid-rows-2 gap-6 h-auto md:h-[800px]">

                    {/* Feature 1: Multimedia (Large, 2x2) */}
                    <TiltCard className="md:col-span-2 md:row-span-2 bg-[#111] border border-white/10 group">
                        <div className="absolute top-8 left-8 z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                                <Image className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">Multimedia First</h3>
                            <p className="text-gray-400 text-lg max-w-sm leading-relaxed">High-fidelity support for images, Markdown, and soon video. Your canvas is a rich media surface.</p>
                        </div>

                        {/* Interactive Visual: Floating images */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute right-[-10%] bottom-[-10%] w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                                {/* Mock Images */}
                                <div className="absolute top-1/2 right-[10%] w-64 h-40 bg-[#1a1a1a] shadow-2xl border border-white/10 rounded-xl p-2 rotate-6 animate-float-medium transition-transform group-hover:scale-110">
                                    <div className="w-full h-full bg-[#222] rounded-lg overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/10" />
                                        <div className="absolute bottom-3 left-3 w-1/2 h-2 bg-white/20 rounded-full" />
                                    </div>
                                </div>
                                <div className="absolute top-[60%] right-[30%] w-56 h-56 bg-[#1a1a1a] shadow-2xl border border-white/10 rounded-xl p-2 -rotate-3 animate-float-slow transition-transform group-hover:scale-105" style={{ animationDelay: '1s' }}>
                                    <div className="w-full h-full bg-[#222] rounded-lg flex items-center justify-center text-gray-700">
                                        <span className="text-6xl font-serif italic text-white/10">Aa</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TiltCard>

                    {/* Feature 2: History (1x1) */}
                    <TiltCard className="bg-[#111] border border-white/10 text-white relative overflow-hidden group">
                        <div className="h-full flex flex-col justify-between relative z-10">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-colors">
                                <History className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Infinite Undo</h3>
                                <p className="text-gray-400 text-sm">Travel back in time.</p>
                            </div>
                        </div>
                        {/* Background visual */}
                        <div className="absolute -top-4 -right-4 text-white/5 font-mono text-8xl font-bold -rotate-12 select-none group-hover:text-white/10 transition-colors">
                            Z
                        </div>
                    </TiltCard>

                    {/* Feature 3: Export (1x1) */}
                    <TiltCard className="bg-[#111] border border-white/10 text-white group">
                        <div className="h-full flex flex-col justify-between relative z-10">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:bg-white/10 transition-colors">
                                <Download className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-1">4K Export</h3>
                                <p className="text-gray-400 text-sm">Share your mind.</p>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TiltCard>

                    {/* Feature 4: Collaboration (2x1 wide) */}
                    <TiltCard className="md:col-span-2 bg-[#111] border border-white/10 group overflow-hidden">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between h-full relative z-10 p-2">
                            <div className="mb-8 md:mb-0">
                                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/5 text-gray-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    <Layers className="w-3 h-3" />
                                    <span>Coming Soon</span>
                                </div>
                                <h3 className="text-3xl font-bold text-white mb-2">Realtime Sync</h3>
                                <p className="text-gray-400 max-w-xs">Multiplayer mode for true collective intelligence.</p>
                            </div>

                            {/* Visual Cursors */}
                            <div className="relative w-full md:w-1/2 h-32 md:h-full opacity-50 group-hover:opacity-100 transition-opacity">
                                <div className="absolute top-1/4 left-1/4 animate-float-medium" style={{ animationDuration: '3s' }}>
                                    <MousePointer2 className="w-6 h-6 text-blue-500 fill-blue-500 drop-shadow-lg" />
                                    <span className="absolute left-5 top-4 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Alex</span>
                                </div>
                                <div className="absolute bottom-1/3 right-1/4 animate-float-medium" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                                    <MousePointer2 className="w-6 h-6 text-pink-500 fill-pink-500 drop-shadow-lg" />
                                    <span className="absolute left-5 top-4 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Sarah</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-green-500/5 pointer-events-none" />
                    </TiltCard>

                </div>
            </div>
        </div>
    );
};

const TiltCard = ({ children, className }) => {
    const ref = useRef(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -3; // Subtle tilt
        const rotateY = ((x - centerX) / centerX) * 3;

        setRotation({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 });
    };

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`rounded-3xl p-8 relative transition-all duration-300 ease-out hover:z-10 ${className}`}
            style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            }}
        >
            {children}
        </div>
    );
};

export default FeatureBento;
