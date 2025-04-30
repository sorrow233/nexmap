import React, { useRef, useState } from 'react';
import { Image, History, Download, Layers, MousePointer2 } from 'lucide-react';

const HeroSection = () => {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,30,30,0.5)_0%,transparent_70%)] pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-16 relative z-10 animate-fade-in-up">
                <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-6">
                    Built for <span className="text-blue-500">Power Users</span>.
                </h1>
                <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl">
                    We stripped away the clutter so you can focus on the flow.
                </p>
            </div>

            {/* Bento Grid */}
            <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 animate-fade-in-up delay-200">

                {/* Feature 1: Multimedia (Tall Card) */}
                <TiltCard className="md:row-span-2 bg-[#111] border border-white/10 overflow-hidden group">
                    <div className="h-full flex flex-col relative z-20">
                        <div className="absolute top-8 left-8 z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                                <Image className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">Multimedia First</h3>
                            <p className="text-gray-400 text-lg max-w-sm leading-relaxed">
                                High-fidelity support for images, Markdown, and soon video. Your canvas is a rich media surface.
                            </p>
                        </div>

                        {/* Interactive Visual */}
                        <div className="absolute inset-0 top-[40%]">
                            <div className="absolute right-[-10%] top-[10%] w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                                {/* Mock Images */}
                                <div className="absolute top-0 right-[10%] w-64 h-40 bg-[#1a1a1a] shadow-2xl border border-white/10 rounded-xl p-2 rotate-6 transition-transform group-hover:scale-110 duration-500 ease-out">
                                    <div className="w-full h-full bg-[#222] rounded-lg overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/10" />
                                        <div className="absolute bottom-3 left-3 w-1/2 h-2 bg-white/20 rounded-full" />
                                    </div>
                                </div>
                                <div className="absolute top-[30%] right-[30%] w-56 h-56 bg-[#1a1a1a] shadow-2xl border border-white/10 rounded-xl p-2 -rotate-3 transition-transform group-hover:scale-105 duration-500 ease-out delay-75">
                                    <div className="w-full h-full bg-[#222] rounded-lg flex items-center justify-center text-gray-700">
                                        <span className="text-6xl font-serif italic text-white/10">Aa</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TiltCard>

                {/* Feature 2: History (1x1) */}
                <TiltCard className="bg-[#111] border border-white/10 text-white relative overflow-hidden group min-h-[280px]">
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
                    <div className="absolute -top-4 -right-4 text-white/5 font-mono text-9xl font-bold -rotate-12 select-none group-hover:text-white/10 transition-colors">
                        Z
                    </div>
                </TiltCard>

                {/* Feature 3: Export (1x1) */}
                <TiltCard className="bg-[#111] border border-white/10 text-white group min-h-[280px]">
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
                <TiltCard className="md:col-span-2 bg-[#111] border border-white/10 group overflow-hidden min-h-[280px]">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between h-full relative z-10">
                        <div className="mb-8 md:mb-0 max-w-sm">
                            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/5 text-gray-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                <Layers className="w-3 h-3" />
                                <span>Coming Soon</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">Realtime Sync</h3>
                            <p className="text-gray-400">Multiplayer mode for true collective intelligence.</p>
                        </div>

                        {/* Visual Cursors */}
                        <div className="relative w-full md:w-1/2 h-32 md:h-full opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className="absolute top-1/4 left-1/4 animate-pulse">
                                <MousePointer2 className="w-6 h-6 text-blue-500 fill-blue-500 drop-shadow-lg" />
                                <span className="absolute left-5 top-4 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Alex</span>
                            </div>
                            <div className="absolute bottom-1/3 right-1/4 animate-pulse delay-700">
                                <MousePointer2 className="w-6 h-6 text-pink-500 fill-pink-500 drop-shadow-lg" />
                                <span className="absolute left-5 top-4 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Sarah</span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-green-500/5 pointer-events-none" />
                </TiltCard>

            </div>

            {/* Bottom Floating CTA */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up delay-500">
                <div className="flex items-center gap-4 pl-6 pr-2 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
                    <span className="text-sm font-medium text-gray-300">Ready to think unlimited?</span>
                    <button
                        onClick={() => window.location.href = '/gallery'}
                        className="px-5 py-2 bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform"
                    >
                        Launch Beta
                    </button>
                </div>
            </div>
        </div>
    );
};

// 3D Tilt Card Component
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

        const rotateX = ((y - centerY) / centerY) * -2; // Subtle tilt factor
        const rotateY = ((x - centerX) / centerX) * 2;

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
            className={`rounded-3xl p-8 relative transition-all duration-300 ease-out hover:z-50 hover:shadow-2xl hover:shadow-blue-900/10 ${className}`}
            style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                transformStyle: 'preserve-3d',
            }}
        >
            {children}
        </div>
    );
};

export default HeroSection;
