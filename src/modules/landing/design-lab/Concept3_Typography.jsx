import React, { useState, useEffect } from 'react';

const Concept3_InfiniteDepth = () => {
    const [zoomLevel, setZoomLevel] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setZoomLevel(prev => (prev + 1) % 4);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const levels = [
        { title: 'Project Dashboard', color: 'blue' },
        { title: 'AI Research', color: 'purple' },
        { title: 'Neural Networks', color: 'emerald' },
        { title: 'Backpropagation', color: 'amber' }
    ];

    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            <div
                className="relative transition-transform duration-2000 ease-in-out"
                style={{
                    transform: `scale(${Math.pow(3, zoomLevel)}) translateZ(0)`,
                    transformOrigin: 'center center'
                }}
            >
                {levels.map((level, depth) => {
                    const scale = Math.pow(0.33, depth);
                    const colorMap = {
                        blue: 'from-blue-600/30 to-blue-900/50 border-blue-400/40',
                        purple: 'from-purple-600/30 to-purple-900/50 border-purple-400/40',
                        emerald: 'from-emerald-600/30 to-emerald-900/50 border-emerald-400/40',
                        amber: 'from-amber-600/30 to-amber-900/50 border-amber-400/40'
                    };

                    return (
                        <div
                            key={depth}
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                                transform: `scale(${scale})`,
                                transformOrigin: 'center center'
                            }}
                        >
                            <div className={`w-[600px] h-[400px] bg-gradient-to-br ${colorMap[level.color]} backdrop-blur-sm border-2 rounded-2xl p-8 flex flex-col shadow-2xl`}>
                                <h2 className="text-4xl font-bold text-white mb-4">{level.title}</h2>
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="bg-white/10 rounded-lg backdrop-blur-sm border border-white/20"
                                        />
                                    ))}
                                </div>
                                {depth < levels.length - 1 && (
                                    <div className="absolute bottom-12 right-12 w-24 h-24 bg-zinc-900 rounded-lg border-2 border-white/30 flex items-center justify-center shadow-xl">
                                        <div className="text-white/50 text-xs">→ Zoom In</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-50 pointer-events-none">
                <h1 className="text-6xl font-bold text-white mb-2">Infinite Depth</h1>
                <p className="text-white/70 text-xl">Zoom forever. Every card contains a universe.</p>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/60 text-sm z-50">
                Level {zoomLevel + 1} / ∞
            </div>
        </div>
    );
};

export default Concept3_InfiniteDepth;
