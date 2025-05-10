import React from 'react';
import { useNavigate } from 'react-router-dom';

const S10_CTA = () => {
    const navigate = useNavigate();

    return (
        <section className="h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
            {/* Tunnel Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black animate-pulse" />

            <div className="relative z-10 text-center space-y-8">
                <h2 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tighter">
                    Ready to <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        Think Deep?
                    </span>
                </h2>

                <button
                    onClick={() => navigate('/gallery')}
                    className="group relative px-12 py-6 bg-white text-black font-bold text-xl rounded-full overflow-hidden transition-transform hover:scale-105"
                >
                    <span className="relative z-10 flex items-center gap-3">
                        Launch Neural Canvas
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>

                <p className="text-gray-500 text-sm mt-8">
                    Free for early adopters. No credit card required.
                </p>
            </div>
        </section>
    );
};

export default S10_CTA;
