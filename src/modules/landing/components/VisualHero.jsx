import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MousePointer2 } from 'lucide-react';

const VisualHero = ({ scrollProgress, onStart }) => {
    const navigate = useNavigate();

    // Core animation values based on scroll
    // 0 -> 1 range
    const opacity = Math.max(0, 1 - scrollProgress * 2.5);
    const scale = 1 + scrollProgress * 1.5; // Zoom in effect
    const blur = scrollProgress * 20; // Blur as it zooms out
    const translateY = scrollProgress * 100;

    // Background Parallax
    const gridScale = 1 + scrollProgress * 0.2;
    const gridOpacity = Math.max(0, 0.4 - scrollProgress);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 overflow-hidden pointer-events-none">
            {/* Dynamic Background Grid */}
            <div
                className="absolute inset-0 z-0 opacity-40 pointer-events-none"
                style={{
                    opacity: gridOpacity,
                    transform: `scale(${gridScale})`,
                    backgroundSize: '40px 40px',
                    backgroundImage: `
                       linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                   `,
                    maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black, transparent 80%)'
                }}
            />

            {/* Main Content */}
            <div
                className="relative z-10 text-center px-4 will-change-transform"
                style={{
                    opacity,
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    filter: `blur(${blur}px)`,
                }}
            >
                <div className="relative inline-block mb-6 pt-20">
                    <div className="absolute -top-12 -left-12 opacity-20 animate-pulse hidden md:block">
                        <MousePointer2 className="w-12 h-12 -rotate-12" />
                    </div>

                    <h1
                        className="text-7xl md:text-9xl lg:text-[12rem] font-bold tracking-tighter text-[#1a1a1a] leading-[0.85] mix-blend-multiply"
                        style={{ fontFamily: '"Inter Tight", sans-serif' }}
                    >
                        Think inside<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-600 animate-gradient-x">
                            the Infinite.
                        </span>
                    </h1>
                </div>

                <p className="text-xl md:text-3xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed mt-8 mb-12">
                    The canvas that grows with your mind. <br className="hidden md:block" />
                    From messy thoughts to clear masterplans.
                </p>

                <div className="pointer-events-auto flex flex-col md:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="group relative px-10 py-5 bg-[#1a1a1a] text-white rounded-full text-xl font-medium overflow-hidden transition-all hover:scale-105 hover:shadow-2xl shadow-xl active:scale-95"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            Start Creating Free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    <button
                        onClick={onStart}
                        className="px-8 py-5 text-gray-500 hover:text-black font-medium transition-colors text-lg"
                    >
                        See how it works
                    </button>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div
                className="absolute bottom-12 flex flex-col items-center gap-2 opacity-40 animate-bounce pointer-events-auto cursor-pointer transition-opacity hover:opacity-100"
                onClick={onStart}
            >
                <span className="text-sm font-medium uppercase tracking-widest">Scroll to Explore</span>
                <div className="w-px h-12 bg-gradient-to-b from-gray-800 to-transparent" />
            </div>
        </div>
    );
};

export default VisualHero;
