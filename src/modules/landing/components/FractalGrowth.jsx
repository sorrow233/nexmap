import React from 'react';
import { useTrail, animated, config } from '@react-spring/web';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FractalGrowth = ({ scrollProgress }) => {
    const navigate = useNavigate();
    const active = scrollProgress > 2.4;

    // Create organic branches
    const branches = useTrail(12, {
        opacity: active ? 1 : 0,
        height: active ? 100 : 0,
        config: config.molasses, // Slow, organic growth
        from: { opacity: 0, height: 0 },
        delay: 200,
    });

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {active && (
                <div className="relative">
                    {/* Core Seed */}
                    <div className="w-6 h-6 bg-slate-800 rounded-full shadow-lg absolute top-0 left-1/2 -translate-x-1/2 z-20 animate-pulse"></div>

                    {/* Branches */}
                    {branches.map((style, i) => (
                        <animated.div
                            key={i}
                            style={{
                                opacity: style.opacity,
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transformOrigin: 'top center',
                                transform: `rotate(${(i - 5.5) * 20}deg)`, // Spread out like a fan/tree
                            }}
                        >
                            <animated.div
                                style={{
                                    width: '1px',
                                    height: style.height.to(h => `${h * (1 + Math.random())}px`), // Randomize lengths slightly
                                    background: 'linear-gradient(to bottom, #1e293b, transparent)',
                                }}
                                className="relative"
                            >
                                {/* Leaf/Fruit at end */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-rose-300/60 shadow-sm" />
                            </animated.div>
                        </animated.div>
                    ))}

                    {/* Final CTA Text - Always visible at end */}
                    <animated.div
                        style={{ opacity: Math.max(0, (scrollProgress - 2.8) * 2) }}
                        className="absolute top-[200px] left-1/2 -translate-x-1/2 text-center w-[600px] flex flex-col items-center gap-6 pointer-events-auto"
                    >
                        <h3 className="text-4xl font-light tracking-tight text-slate-800">Growth is automatic.</h3>
                        <button
                            onClick={() => navigate('/gallery')}
                            className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl flex items-center gap-2"
                        >
                            Start Creating <ArrowRight size={20} />
                        </button>
                    </animated.div>
                </div>
            )}
        </div>
    );
};

export default FractalGrowth;
