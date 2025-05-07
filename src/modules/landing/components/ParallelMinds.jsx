import React, { useMemo } from 'react';
import { useSprings, animated } from '@react-spring/web';

const ParallelMinds = ({ scrollProgress }) => {
    const beams = useMemo(() => Array.from({ length: 20 }), []);
    const colors = ['#FDA4AF', '#FCD34D', '#34D399', '#60A5FA'];

    const springs = useSprings(
        beams.length,
        beams.map((_, i) => {
            const active = scrollProgress > 1.4 && scrollProgress < 2.6;
            const column = i % 4; // 4 columns of thought
            const row = Math.floor(i / 4);

            // Target positions: Align grid
            const targetX = (column - 1.5) * 25; // Spread horizontally
            const targetY = (row - 2) * 20 + ((scrollProgress - 2) * 50); // Flow up/down

            // Random start position logic is handled by the toggle/active check

            return {
                opacity: active ? (1 - Math.abs(2 - scrollProgress) * 0.5) : 0,
                transform: active
                    ? `translate3d(${targetX}vw, ${targetY}vh, 0px) scale(1)`
                    : `translate3d(${targetX}vw, ${targetY + 100}vh, 200px) scale(0)`,
                height: active ? '180px' : '0px',
                config: { tension: 100, friction: 30 },
                delay: i * 30, // Ripple effect
            };
        })
    );

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {springs.map((style, i) => (
                <animated.div
                    key={i}
                    style={{
                        ...style,
                        position: 'absolute',
                        width: '2px', // Thin beam
                        background: `linear-gradient(to bottom, transparent, ${colors[i % colors.length]}, transparent)`,
                        borderRadius: '4px',
                    }}
                >
                    {/* Glowing Head */}
                    <div
                        className="w-2 h-2 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[2px]"
                        style={{ backgroundColor: colors[i % colors.length] }}
                    />
                </animated.div>
            ))}

            {/* Text Overlay */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
                <animated.div
                    style={{
                        opacity: scrollProgress > 1.6 && scrollProgress < 2.4 ? 1 : 0,
                        transform: `translateY(${(scrollProgress - 2) * -50}px)`
                    }}
                    className="text-center p-8 backdrop-blur-sm"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-slate-800">Parallel Minds</h2>
                    <p className="text-indigo-400 text-xl font-light tracking-wide">Orchestrate complexity.</p>
                </animated.div>
            </div>
        </div>
    );
};

export default ParallelMinds;
