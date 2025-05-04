import React from 'react';

const Concept9_LiquidDeep = () => {
    return (
        <div className="w-full h-full bg-[#000] overflow-hidden relative flex items-center justify-center">
            {/* SVG Filter Definition */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
            </svg>

            <div className="relative w-full h-full" style={{ filter: 'url(#goo)' }}>
                {/* Background Blobs */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-500 rounded-full animate-drift mix-blend-screen opacity-80"></div>
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-600 rounded-full animate-drift-reverse mix-blend-screen opacity-80"></div>
                <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500 rounded-full animate-drift-slow mix-blend-screen opacity-80"></div>

                {/* Center Interactive Blob */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-96 h-96 bg-white rounded-full flex items-center justify-center animate-pulse-slow">
                        <span className="text-black text-xl font-bold tracking-widest z-50 mix-blend-normal">FLUIDITY</span>
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 z-50 flex flex-col justify-end p-20 pointer-events-none">
                <h1 className="text-white text-6xl font-light">Be shapeless.</h1>
                <p className="text-teal-400 mt-4">Like water.</p>
            </div>

            <style>{`
                @keyframes drift {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(50px, -50px) rotate(120deg); }
                    66% { transform: translate(-30px, 40px) rotate(240deg); }
                    100% { transform: translate(0, 0) rotate(360deg); }
                }
                @keyframes drift-reverse {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    33% { transform: translate(-40px, 60px) rotate(-120deg); }
                    66% { transform: translate(20px, -30px) rotate(-240deg); }
                    100% { transform: translate(0, 0) rotate(-360deg); }
                }
                 @keyframes drift-slow {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(20px, 20px) scale(1.1); }
                    100% { transform: translate(0, 0) scale(1); }
                }
                .animate-drift { animation: drift 15s infinite linear; }
                .animate-drift-reverse { animation: drift-reverse 18s infinite linear; }
                .animate-drift-slow { animation: drift-slow 20s infinite ease-in-out; }
            `}</style>
        </div>
    );
};

export default Concept9_LiquidDeep;
