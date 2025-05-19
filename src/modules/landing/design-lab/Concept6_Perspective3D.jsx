import React from 'react';

const Concept6_Perspective3D = () => {
    return (
        <div className="w-full h-full bg-slate-900 perspective-1000 overflow-hidden flex items-center justify-center">
            <div className="relative w-[600px] h-[600px] preserve-3d animate-spin-slow">
                {/* Central Core */}
                <div className="absolute inset-0 m-auto w-40 h-40 bg-blue-500 rounded-full shadow-[0_0_100px_rgba(59,130,246,0.5)] flex items-center justify-center z-10">
                    <span className="text-white font-bold tracking-widest">CORE</span>
                </div>

                {/* Orbiting Plane 1 */}
                <div className="absolute inset-0 border border-white/10 rounded-full transform rotate-x-60 animate-pulse"></div>

                {/* Floating Cards */}
                <div className="absolute top-0 right-0 w-48 h-64 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl transform translate-z-50 rotate-y-12 shadow-2xl">
                    <div className="h-4 w-20 bg-white/20 rounded mb-4"></div>
                    <div className="h-2 w-full bg-white/10 rounded mb-2"></div>
                    <div className="h-2 w-3/4 bg-white/10 rounded"></div>
                </div>

                <div className="absolute bottom-20 left-20 w-48 h-32 bg-purple-500/20 backdrop-blur-md border border-purple-500/30 p-4 rounded-xl transform translate-z-20 -rotate-x-12 shadow-2xl">
                    <h3 className="text-purple-300 font-bold">Data Node</h3>
                    <p className="text-xs text-purple-200/50 mt-2">Processing...</p>
                </div>

                <div className="absolute top-20 left-0 w-32 h-32 bg-pink-500/20 backdrop-blur-md border border-pink-500/30 rounded-full transform translate-z-80 rotate-y-45 flex items-center justify-center">
                    <span className="text-pink-300 text-xs text-center px-2">Creative<br />Sphere</span>
                </div>

                {/* Text Layer */}
                <div className="absolute inset-0 pointer-events-none transform translate-z-100 flex items-center justify-center">
                    <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-transparent opacity-20">3D</h1>
                </div>
            </div>

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .translate-z-50 { transform: translateZ(50px); }
                .translate-z-20 { transform: translateZ(20px); }
                .translate-z-80 { transform: translateZ(80px); }
                .translate-z-100 { transform: translateZ(100px); }
                
                @keyframes spin-slow {
                    0% { transform: rotateY(0deg) rotateX(10deg); }
                    100% { transform: rotateY(360deg) rotateX(10deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 20s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Concept6_Perspective3D;
