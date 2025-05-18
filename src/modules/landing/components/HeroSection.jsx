import React, { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

const HeroSection = ({ onStart }) => {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#050505] text-white">

            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vh] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vh] bg-purple-600/10 blur-[150px] rounded-full mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] brightness-100 contrast-150" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-8 animate-fade-in-up hover:border-white/20 transition-colors cursor-default">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-sm font-medium text-gray-300 tracking-wide">For Professional LLM Users</span>
                </div>

                {/* Headline */}
                <h1 className="text-6xl md:text-8xl lg:text-[9rem] leading-[0.9] font-bold tracking-tighter mb-8 font-inter-tight">
                    Build the <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 relative">
                        Ultimate Engine.
                    </span>
                </h1>

                {/* Subheadline - The Narrative */}
                <p className="max-w-3xl mx-auto text-xl md:text-2xl text-gray-400 leading-relaxed font-light mb-12 animate-fade-in-up delay-100">
                    We <span className="text-white font-semibold">uncapped concurrency</span> for massive parallel workloads,
                    engineered a <span className="text-white font-semibold">recursive graph-walker</span> for deep context,
                    and implemented <span className="text-white font-semibold">spatial zoning</span> for city-scale architecture.
                </p>

                {/* CTA */}
                <div className="flex flex-col md:flex-row gap-6 justify-center items-center animate-fade-in-up delay-[200ms]">
                    <button
                        onClick={() => window.location.href = '/gallery'}
                        className="group relative px-10 py-5 bg-white text-black rounded-full text-xl font-bold overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Initialize Engine
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>

                    <button
                        onClick={onStart}
                        className="px-8 py-5 text-gray-400 hover:text-white transition-colors flex items-center gap-2 font-medium"
                    >
                        Explore Architecture <span className="animate-bounce mt-1">↓</span>
                    </button>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-50 animate-pulse">
                <div className="w-[1px] h-24 bg-gradient-to-b from-transparent via-white/50 to-transparent" />
            </div>
        </div>
    );
};

export default HeroSection;
