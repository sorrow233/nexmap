import React, { useState, useEffect } from 'react';

const S7_Recursive = () => {
    const [depth, setDepth] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDepth(prev => (prev + 1) % 5);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="h-screen w-full bg-black flex items-center justify-center overflow-hidden relative">
            <div className="text-center absolute top-20 z-10">
                <h2 className="text-5xl font-bold text-white mb-2">Infinite Depth</h2>
                <p className="text-white/60">Worlds within worlds.</p>
            </div>

            <div
                className="relative w-[600px] h-[400px] transition-transform duration-[1500ms] ease-in-out"
                style={{
                    transform: `scale(${Math.pow(1.5, depth)})`
                }}
            >
                {/* Recursive Boxes */}
                {[0, 1, 2, 3, 4, 5].map((lvl) => {
                    const size = Math.pow(0.4, lvl) * 100; // % size
                    return (
                        <div
                            key={lvl}
                            className="absolute bg-zinc-900 border border-white/20 rounded-xl shadow-2xl flex items-center justify-center"
                            style={{
                                width: '100%',
                                height: '100%',
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) scale(${Math.pow(0.4, lvl)})`
                            }}
                        >
                            <div className="text-white font-mono text-sm opacity-50 absolute top-4 left-4">
                                Level {lvl}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default S7_Recursive;
