import React from 'react';
import { useNavigate } from 'react-router-dom';

const Concept10_TheAnswer = () => {
    const navigate = useNavigate();

    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-radial from-zinc-900/20 via-transparent to-transparent" />

            {/* Main content */}
            <div className="relative z-10 text-center space-y-16 animate-fade-in-slow">
                <div className="space-y-6">
                    <h1 className="text-7xl md:text-9xl font-bold text-white tracking-tight leading-none">
                        Are you ready
                    </h1>
                    <h2 className="text-5xl md:text-7xl font-light text-white/80 tracking-wide">
                        to think
                        <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            differently?
                        </span>
                    </h2>
                </div>

                <div className="flex flex-col items-center gap-6 pt-12">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="group relative px-12 py-6 bg-white text-black text-xl font-bold rounded-full overflow-hidden transition-all duration-300 hover:scale-105"
                    >
                        <span className="relative z-10">Enter Neural Canvas</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity" />
                    </button>

                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-8 py-3 text-white/60 hover:text-white transition-colors text-sm"
                    >
                        ← Back to main page
                    </button>
                </div>

                {/* Animated particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float-particle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${10 + Math.random() * 10}s`
                            }}
                        />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes fade-in-slow {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-slow {
                    animation: fade-in-slow 1.5s ease-out forwards;
                }

                @keyframes float-particle {
                    0%, 100% { transform: translate(0, 0); opacity: 0; }
                    10% { opacity: 0.5; }
                    90% { opacity: 0.5; }
                    100% { transform: translate(0, -100vh); opacity: 0; }
                }
                .animate-float-particle {
                    animation: float-particle 15s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Concept10_TheAnswer;
