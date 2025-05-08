import React, { useState } from 'react';

const Concept7_Multiverse = () => {
    const [selected, setSelected] = useState(0);

    const boards = [
        { name: 'AI Research', color: 'blue', desc: '127 cards' },
        { name: 'Personal', color: 'emerald', desc: '43 cards' },
        { name: 'Work Q4', color: 'purple', desc: '89 cards' },
        { name: 'Learning', color: 'amber', desc: '201 cards' },
        { name: 'Ideas', color: 'pink', desc: '64 cards' }
    ];

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-zinc-950 via-black to-zinc-900 overflow-hidden" style={{ perspective: '1200px' }}>
            {/* Starfield */}
            <div className="absolute inset-0">
                {[...Array(100)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/30 rounded-full"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>

            {/* Boards in 3D space */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
                {boards.map((board, i) => {
                    const angle = (i / boards.length) * Math.PI * 2;
                    const radius = 400;
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const isSelected = i === selected;

                    return (
                        <div
                            key={i}
                            onClick={() => setSelected(i)}
                            className={`absolute w-80 h-96 bg-zinc-800/50 backdrop-blur-sm border-2 rounded-2xl p-6 cursor-pointer transition-all duration-700 ${isSelected ? 'border-white/40 scale-110' : 'border-white/10 hover:border-white/30'
                                }`}
                            style={{
                                transform: `translateX(${x}px) translateZ(${z}px) rotateY(${-angle}rad)`,
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            <div className={`w-12 h-12 rounded-full bg-${board.color}-500/20 mb-4 flex items-center justify-center`}>
                                <div className={`w-2 h-2 rounded-full bg-${board.color}-400`} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">{board.name}</h3>
                            <p className="text-white/50 text-sm">{board.desc}</p>

                            {/* Mini cards preview */}
                            <div className="mt-6 grid grid-cols-3 gap-2">
                                {[...Array(6)].map((_, j) => (
                                    <div key={j} className="h-12 bg-white/5 rounded border border-white/10" />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-10">
                <h1 className="text-6xl font-bold text-white mb-2">Multiverse</h1>
                <p className="text-white/70 text-xl">All your projects, one universe</p>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {boards.map((_, i) => (
                    <div
                        key={i}
                        onClick={() => setSelected(i)}
                        className={`w-3 h-3 rounded-full cursor-pointer transition-all ${i === selected ? 'bg-blue-400 scale-125' : 'bg-white/30'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default Concept7_Multiverse;
