import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const VisualHero = ({ scrollProgress, onStart }) => {
    const navigate = useNavigate();
    const titleRef = useRef(null);

    const opacity = Math.max(0, 1 - scrollProgress * 2);
    const scale = 1 + scrollProgress * 0.5;
    const translateY = scrollProgress * 100;

    return (
        <div
            className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none"
            style={{
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                transition: 'opacity 0.1s linear'
            }}
        >
            <div className="text-center space-y-8 px-4">
                <h1
                    ref={titleRef}
                    className="text-7xl md:text-9xl font-bold tracking-tighter text-[#1a1a1a] mix-blend-multiply"
                    style={{ fontFamily: '"Inter Tight", sans-serif' }}
                >
                    Think inside<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
                        the Infinite.
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
                    A canvas that grows with your mind. No limits, no boundaries.
                </p>

                <div className="pt-8 pointer-events-auto">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="group relative px-8 py-4 bg-[#1a1a1a] text-white rounded-full text-lg font-medium overflow-hidden transition-all hover:scale-105 hover:shadow-2xl"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Start Creating
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-12 animate-bounce opacity-50">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </div>
        </div>
    );
};

export default VisualHero;
