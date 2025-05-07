import React from 'react';
import { useTrail, animated, config } from '@react-spring/web';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FractalGrowth = ({ scrollProgress }) => {
    const navigate = useNavigate();
    const active = scrollProgress > 2.4;

    // Create organic branches
    const branches = useTrail(16, {
        opacity: active ? 1 : 0,
        height: active ? 120 : 0,
        config: { mass: 5, tension: 120, friction: 60 },
        from: { opacity: 0, height: 0 },
        delay: 200,
    });

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-inter-tight">
            {active && (
                <div className="relative">
                    {/* Core Seed */}
                    <div className="w-2 h-2 bg-[#1a1a1a] rounded-full absolute top-0 left-1/2 -translate-x-1/2 z-20"></div>

                    {/* Branches - Minimalist Ink Lines */}
                    {branches.map((style, i) => (
                        <animated.div
                            key={i}
                            style={{
                                opacity: style.opacity,
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transformOrigin: 'top center',
                                transform: `rotate(${(i - 7.5) * 15}deg)`, // Fan out
                            }}
                        >
                            <animated.div
                                style={{
                                    width: '1px',
                                    height: style.height.to(h => `${h * (0.8 + Math.random() * 0.4)}px`),
                                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
                                }}
                                className="relative"
                            >
                            </animated.div>
                        </animated.div>
                    ))}

                    {/* Final CTA Text */}
                    <animated.div
                        style={{ opacity: Math.max(0, (scrollProgress - 2.8) * 3) }}
                        className="absolute top-[220px] left-1/2 -translate-x-1/2 text-center w-[600px] flex flex-col items-center gap-8 pointer-events-auto"
                    >
                        <h3 className="text-4xl font-medium tracking-tighter text-[#1a1a1a]">Growth is automatic.</h3>
                        <button
                            onClick={() => navigate('/gallery')}
                            className="group px-8 py-3 bg-[#1a1a1a] text-white rounded-full font-medium text-lg hover:shadow-xl transition-all flex items-center gap-3 relative overflow-hidden"
                        >
                            <span className="relative z-10">Start Creating</span>
                            <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-gray-800 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                        </button>
                    </animated.div>
                </div>
            )}
        </div>
    );
};

export default FractalGrowth;
