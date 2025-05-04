import React from 'react';

const Concept7_InfiniteScroll = () => {
    return (
        <div className="w-full h-full bg-[#111] overflow-hidden flex flex-col justify-between">
            {/* Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-[#111] z-20">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="font-mono text-zinc-500 text-xs">STREAMING_DATA_V1.0</div>
            </div>

            {/* Marquee Streams */}
            <div className="flex-1 flex flex-col justify-center gap-8 -rotate-6 scale-110">
                {/* Stream 1 */}
                <div className="w-full bg-zinc-900 border-y border-white/5 py-8 overflow-hidden">
                    <div className="animate-scroll-left flex gap-12 whitespace-nowrap">
                        {[...Array(10)].map((_, i) => (
                            <span key={i} className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-700">
                                DATA STREAMING
                            </span>
                        ))}
                    </div>
                </div>

                {/* Stream 2 (Reversed) */}
                <div className="w-full bg-blue-900/10 border-y border-blue-500/20 py-8 overflow-hidden">
                    <div className="animate-scroll-right flex gap-12 whitespace-nowrap">
                        {[...Array(10)].map((_, i) => (
                            <span key={i} className="text-4xl font-bold text-blue-500">
                                REAL TIME COLLABORATION
                            </span>
                        ))}
                    </div>
                </div>

                {/* Stream 3 */}
                <div className="w-full bg-zinc-900 border-y border-white/5 py-8 overflow-hidden">
                    <div className="animate-scroll-left flex gap-12 whitespace-nowrap">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-2/3"></div>
                                </span>
                                <span className="font-mono text-zinc-500">PROCESS_{i}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Center Focus */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="bg-[#111]/80 backdrop-blur-sm p-12 border border-white/10 rounded-2xl text-center">
                    <h1 className="text-6xl font-black text-white mb-4">FLOW</h1>
                    <p className="text-zinc-400">Don't stop the movement.</p>
                </div>
            </div>

            <style>{`
                @keyframes scroll-left {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes scroll-right {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0); }
                }
                .animate-scroll-left { animation: scroll-left 20s linear infinite; }
                .animate-scroll-right { animation: scroll-right 20s linear infinite; }
            `}</style>
        </div>
    );
};

export default Concept7_InfiniteScroll;
