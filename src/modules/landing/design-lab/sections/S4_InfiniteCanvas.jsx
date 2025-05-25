import React, { useRef, useState, useEffect } from 'react';

const S4_InfiniteCanvas = () => {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const scrollY = window.scrollY;
            setOffset({ x: scrollY * 0.2, y: scrollY * 0.1 });
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section ref={containerRef} className="h-screen w-full bg-[#111] overflow-hidden relative cursor-grab active:cursor-grabbing">
            <div className="absolute inset-[-100%]" style={{
                transform: `translate(${offset.x % 100}px, ${offset.y % 100}px)`,
                backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                backgroundSize: '100px 100px', width: '300%', height: '300%', opacity: 0.2
            }} />
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="absolute bg-zinc-800 border border-white/10 rounded-lg shadow-xl p-4 flex flex-col gap-2"
                        style={{
                            left: `${20 + (i * 15) + (Math.sin(i) * 10)}%`, top: `${20 + (i * 10) + (Math.cos(i) * 20)}%`,
                            width: '200px', height: '140px',
                            transform: `translate(${offset.x * (0.5 + i * 0.1)}px, ${offset.y * (0.5 + i * 0.1)}px)`
                        }}
                    >
                        <div className="w-8 h-8 rounded-full bg-white/10 mb-2" />
                        <div className="w-3/4 h-3 bg-white/20 rounded" />
                        <div className="w-1/2 h-3 bg-white/10 rounded" />
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 backdrop-blur-md p-8 rounded-3xl border border-white/10 text-center">
                    <h2 className="text-6xl font-bold text-white mb-2">Infinite Canvas</h2>
                    <p className="text-xl text-gray-400">No boundaries. Just space.</p>
                </div>
            </div>
        </section>
    );
};
export default S4_InfiniteCanvas;
