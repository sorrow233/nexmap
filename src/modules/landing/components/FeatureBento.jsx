import React, { useRef, useState } from 'react';
import { Image, Download, History, MousePointer2, Layers, Type, Link, MoreHorizontal } from 'lucide-react';

const FeatureBento = ({ scrollProgress }) => {
    // Active range: 2.0 to 3.5 (Started earlier to overlap)
    // Display sequentially as user scrolls
    const localProgress = (scrollProgress - 2.2); // Shifted earlier from 2.5
    const isActive = scrollProgress > 1.8 && scrollProgress < 4.0;

    if (!isActive) return null;

    // Entrance: Staggered slide up
    const getStyle = (index) => {
        const trigger = index * 0.1;
        // Smoother, earlier ease-in
        const progress = Math.min(1, Math.max(0, (localProgress - trigger + 0.2) * 2));

        return {
            opacity: progress,
            transform: `translateY(${(1 - progress) * 50}px)`, // Reduced movement for stability
        };
    };

    // Fade entire module in/out gracefully
    // Fix: Align opacity with content appearance so we don't show a blank white screen
    // Content starts appearing around localProgress = -0.2
    // Content is fully visible around localProgress = 0.3
    let mainOpacity = 1;

    if (localProgress < 0.3) {
        // Fading in (approx scroll 2.0 to 2.5)
        // Matches the first content item's entrance curve
        mainOpacity = Math.min(1, Math.max(0, (localProgress + 0.2) * 2));
    } else if (localProgress > 1.0) {
        // Fading out
        mainOpacity = Math.max(0, 1 - (localProgress - 1.0) * 3);
    }

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-30 pointer-events-auto p-4 md:p-12 overflow-hidden"
            style={{ opacity: mainOpacity }}
        >
            {/* Background Context */}
            <div className="absolute inset-0 bg-[#FDFDFC] z-0" />

            <div className="relative z-10 w-full max-w-6xl h-full flex flex-col justify-center">
                <div className="text-center mb-12" style={getStyle(0)}>
                    <h2 className="text-4xl md:text-6xl font-bold text-[#1a1a1a] mb-4 tracking-tight">
                        Built for <span className="italic font-serif text-blue-600">Power Users</span>.
                    </h2>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        We stripped away the clutter so you can focus on the flow.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-3 md:grid-rows-2 gap-4 h-[600px]">

                    {/* Feature 1: Multimedia (Large, 2x2) */}
                    <TiltCard
                        className="md:col-span-2 md:row-span-2 bg-gray-50 border border-gray-100"
                        style={getStyle(0.1)}
                    >
                        <div className="absolute top-6 left-6 z-10">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                                <Image className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Multimedia First</h3>
                            <p className="text-gray-500 mt-2 max-w-xs">High-fidelity support for images, Markdown, and soon video. Your canvas is a rich media surface.</p>
                        </div>

                        {/* Interactive Visual: Floating images */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute right-0 bottom-0 w-3/4 h-3/4">
                                {/* Mock Images */}
                                <div className="absolute top-10 right-10 w-48 h-32 bg-white shadow-xl rounded-lg p-2 rotate-6 animate-float" style={{ animationDelay: '0s' }}>
                                    <div className="w-full h-full bg-gray-100 rounded overflow-hidden relative">
                                        <div className="absolute inset-0 bg-blue-100 opacity-50" />
                                        <div className="absolute bottom-2 left-2 w-1/2 h-2 bg-white rounded-full opacity-50" />
                                    </div>
                                </div>
                                <div className="absolute top-32 right-32 w-48 h-48 bg-white shadow-xl rounded-lg p-2 -rotate-3 animate-float" style={{ animationDelay: '2s' }}>
                                    <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center text-gray-600">
                                        <span className="text-4xl">Aa</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TiltCard>

                    {/* Feature 2: History (1x1) */}
                    <TiltCard className="bg-gray-900 text-white" style={getStyle(0.2)}>
                        <div className="h-full flex flex-col justify-between relative z-10">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <History className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Infinite Undo</h3>
                                <p className="text-gray-400 text-sm mt-1">Travel back in time.</p>
                            </div>
                        </div>
                        {/* Background subtle clock/time visual */}
                        <div className="absolute top-4 right-4 text-white/5 font-mono text-6xl font-bold -rotate-12 pointer-events-none">
                            CTRL+Z
                        </div>
                    </TiltCard>

                    {/* Feature 3: Export (1x1) */}
                    <TiltCard className="bg-blue-50 border border-blue-100 text-blue-900" style={getStyle(0.3)}>
                        <div className="h-full flex flex-col justify-between relative z-10">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Download className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">4K Export</h3>
                                <p className="text-blue-700/60 text-sm mt-1">Share your mind.</p>
                            </div>
                        </div>
                    </TiltCard>

                    {/* Feature 4: Collaboration (2x1 wide) */}
                    <TiltCard className="md:col-span-2 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100" style={getStyle(0.4)}>
                        <div className="flex items-center justify-between h-full relative z-10">
                            <div>
                                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                    <Layers className="w-3 h-3" />
                                    <span>Coming Soon</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Realtime Sync</h3>
                                <p className="text-gray-600 max-w-xs mt-2">Multiplayer mode for true collective intelligence.</p>
                            </div>

                            {/* Visual Cursors */}
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:block">
                                <div className="relative w-32 h-32">
                                    <div className="absolute top-0 left-0 animate-bounce" style={{ animationDuration: '2s' }}>
                                        <MousePointer2 className="w-6 h-6 text-blue-500 fill-blue-500" />
                                        <span className="absolute left-4 top-4 bg-blue-500 text-white text-xs px-2 py-1 rounded rounded-tl-none">Alex</span>
                                    </div>
                                    <div className="absolute bottom-0 right-0 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                                        <MousePointer2 className="w-6 h-6 text-pink-500 fill-pink-500" />
                                        <span className="absolute left-4 top-4 bg-pink-500 text-white text-xs px-2 py-1 rounded rounded-tl-none">Sarah</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TiltCard>

                </div>
            </div>
        </div>
    );
};

const TiltCard = ({ children, className, style }) => {
    const ref = useRef(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5; // Max 5 deg tilt
        const rotateY = ((x - centerX) / centerX) * 5;

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
            className={`rounded-3xl p-8 relative overflow-hidden transition-all duration-200 ease-out shadow-sm hover:shadow-xl ${className}`}
            style={{
                ...style,
                transform: `${style?.transform || ''} perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            }}
        >
            {children}
        </div>
    );
};

export default FeatureBento;
