import React, { useRef, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

const S7_DeepDive = () => {
    return (
        <section className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden perspective-[1000px]">
            {/* Recursive frames */}
            {[...Array(5)].map((_, i) => (
                <div key={i} className="absolute border-[20px] border-[#222] animate-tunnel"
                    style={{
                        width: '100vw',
                        height: '100vh',
                        animationDelay: `${i * 2}s`,
                        animationDuration: '10s'
                    }}
                >
                    <div className="absolute top-4 left-4 text-[#333] font-mono text-xl">LAYER_{i}</div>
                </div>
            ))}

            <div className="relative z-10 text-center bg-black/80 backdrop-blur-xl p-12 border border-white/10 rounded-3xl">
                <h2 className="text-6xl font-black text-white mb-2">INFINITE DEPTH</h2>
                <p className="text-gray-500 tracking-widest uppercase text-sm">Zoom forever</p>
            </div>

            <style>{`
                @keyframes tunnel {
                    0% { transform: translateZ(-2000px) rotate(0deg); opacity: 0; }
                    20% { opacity: 1; }
                    100% { transform: translateZ(1000px) rotate(10deg); opacity: 0; }
                }
                .animate-tunnel {
                    animation: tunnel 10s linear infinite;
                    box-shadow: 0 0 100px rgba(0,0,0,0.8);
                }
             `}</style>
        </section>
    );
};
export default S7_DeepDive;
