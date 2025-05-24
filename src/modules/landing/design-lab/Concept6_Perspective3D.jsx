import React from 'react';

const Concept6_Velocity = () => {
    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            {/* Motion blur streaks */}
            <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-streak"
                        style={{
                            top: `${(i * 5) + 10}%`,
                            width: `${30 + Math.random() * 40}%`,
                            left: '-50%',
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: `${0.8 + Math.random() * 0.4}s`
                        }}
                    />
                ))}
            </div>

            {/* Speed metrics */}
            <div className="relative z-10 text-center space-y-12">
                <div className="animate-slide-in">
                    <div className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 leading-none">
                        10,000
                    </div>
                    <div className="text-white/60 text-2xl mt-4">Cards. Zero lag.</div>
                </div>

                <div className="animate-slide-in delay-500">
                    <div className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 leading-none">
                        60 FPS
                    </div>
                    <div className="text-white/60 text-2xl mt-4">Buttery smooth.</div>
                </div>

                <div className="animate-slide-in delay-1000">
                    <div className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 leading-none">
                        &lt;16ms
                    </div>
                    <div className="text-white/60 text-2xl mt-4">Response time.</div>
                </div>
            </div>

            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center">
                <h1 className="text-6xl font-bold text-white mb-2">Velocity</h1>
                <p className="text-white/70 text-xl">Think at the speed of light</p>
            </div>

            <style>{`
                @keyframes streak {
                    0% { transform: translateX(0); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(200vw); opacity: 0; }
                }
                .animate-streak {
                    animation: streak 1.2s ease-out infinite;
                }
                @keyframes slide-in {
                    from { transform: translateX(-100px); opacity: 0; filter: blur(10px); }
                    to { transform: translateX(0); opacity: 1; filter: blur(0); }
                }
                .animate-slide-in {
                    animation: slide-in 0.6s ease-out forwards;
                    opacity: 0;
                }
                .delay-500 { animation-delay: 0.5s; }
                .delay-1000 { animation-delay: 1s; }
            `}</style>
        </div>
    );
};

export default Concept6_Velocity;
