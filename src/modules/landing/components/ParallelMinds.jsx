import React, { useMemo } from 'react';
import { useSprings, animated } from '@react-spring/web';

const ParallelMinds = ({ scrollProgress }) => {
    const beams = useMemo(() => Array.from({ length: 24 }), []);

    const springs = useSprings(
        beams.length,
        beams.map((_, i) => {
            const active = scrollProgress > 1.4 && scrollProgress < 2.6;
            const column = i % 8; // More columns, thinner lines
            const row = Math.floor(i / 8);

            const targetX = (column - 3.5) * 12; // Tighter grid
            const targetY = (row - 1.5) * 30 + ((scrollProgress - 2) * 40);

            return {
                opacity: active ? (1 - Math.abs(2 - scrollProgress) * 0.6) : 0,
                transform: active
                    ? `translate3d(${targetX}vw, ${targetY}vh, 0px) scale(1)`
                    : `translate3d(${targetX}vw, ${targetY + 50}vh, 0px) scale(0)`,
                height: active ? '300px' : '0px',
                width: '1px',
                delay: i * 20,
            };
        })
    );

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-inter-tight">
            {springs.map((style, i) => (
                <animated.div
                    key={i}
                    style={{
                        ...style,
                        position: 'absolute',
                        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2), transparent)',
                    }}
                >
                </animated.div>
            ))}

            {/* Text Overlay */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
                <animated.div
                    style={{
                        opacity: scrollProgress > 1.6 && scrollProgress < 2.4 ? 1 : 0,
                        transform: `translateY(${(scrollProgress - 2) * -30}px)`
                    }}
                    className="text-center"
                >
                    <h2 className="text-4xl md:text-6xl font-medium mb-4 tracking-tighter text-[#1a1a1a]">Parallel Minds</h2>
                    <p className="text-gray-500 text-lg font-normal tracking-wide">Orchestrate complexity.</p>
                </animated.div>
            </div>
        </div>
    );
};

export default ParallelMinds;
