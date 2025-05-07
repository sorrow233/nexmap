import React, { useEffect, useRef, useState } from 'react';

const Concept2_NeuralWeb = () => {
    const [connections, setConnections] = useState([]);

    // Cards representing thoughts
    const cards = [
        { id: 1, text: 'AI', x: 20, y: 30 },
        { id: 2, text: 'Canvas', x: 70, y: 25 },
        { id: 3, text: 'Spatial', x: 45, y: 60 },
        { id: 4, text: 'Infinite', x: 15, y: 75 },
        { id: 5, text: 'Organize', x: 75, y: 70 }
    ];

    useEffect(() => {
        // Simulate AI creating connections
        const delays = [
            { from: 1, to: 2, delay: 1000 },
            { from: 2, to: 3, delay: 1800 },
            { from: 1, to: 4, delay: 2400 },
            { from: 3, to: 5, delay: 3000 },
            { from: 4, to: 5, delay: 3600 }
        ];

        delays.forEach(({ from, to, delay }) => {
            setTimeout(() => {
                setConnections(prev => [...prev, { from, to, id: `${from}-${to}` }]);
            }, delay);
        });
    }, []);

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-[#0a0a1a] via-[#050510] to-[#0a0520] overflow-hidden">
            {/* Neural grid background */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            <svg className="absolute inset-0 w-full h-full">
                {connections.map(conn => {
                    const fromCard = cards.find(c => c.id === conn.from);
                    const toCard = cards.find(c => c.id === conn.to);
                    return (
                        <g key={conn.id}>
                            <line
                                x1={`${fromCard.x}%`}
                                y1={`${fromCard.y}%`}
                                x2={`${toCard.x}%`}
                                y2={`${toCard.y}%`}
                                stroke="url(#lineGradient)"
                                strokeWidth="2"
                                className="animate-draw-line"
                            />
                            {/* Animated pulse */}
                            <circle r="4" fill="#60a5fa" className="animate-pulse-along-line">
                                <animateMotion
                                    dur="2s"
                                    repeatCount="indefinite"
                                    path={`M ${fromCard.x},${fromCard.y} L ${toCard.x},${toCard.y}`}
                                />
                            </circle>
                        </g>
                    );
                })}
                <defs>
                    <linearGradient id="lineGradient">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
                    </linearGradient>
                </defs>
            </svg>

            {cards.map(card => (
                <div
                    key={card.id}
                    className="absolute w-32 h-32 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 group"
                    style={{
                        left: `${card.x}%`,
                        top: `${card.y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/40 transition-colors">
                        <span className="text-blue-300 font-bold text-sm">{card.text}</span>
                    </div>
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-xl border-2 border-blue-500/30 animate-ping-slow opacity-0 group-hover:opacity-100" />
                </div>
            ))}

            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-10">
                <h1 className="text-6xl font-bold text-white mb-4">Neural Web</h1>
                <p className="text-white/70 text-xl">AI connecting your thoughts in real-time</p>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-blue-300 text-sm font-medium">AI Processing...</span>
            </div>

            <style>{`
                @keyframes draw-line {
                    from { stroke-dasharray: 1000; stroke-dashoffset: 1000; }
                    to { stroke-dasharray: 1000; stroke-dashoffset: 0; }
                }
                .animate-draw-line {
                    animation: draw-line 1s ease-out forwards;
                }
                @keyframes ping-slow {
                    75%, 100% { transform: scale(1.2); opacity: 0; }
                }
                .animate-ping-slow {
                    animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default Concept2_NeuralWeb;
