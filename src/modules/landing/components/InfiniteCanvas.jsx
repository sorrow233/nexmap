import React, { useMemo } from 'react';
import { useSprings, animated } from '@react-spring/web';

const InfiniteCanvas = ({ scrollProgress }) => {
    // Generate static data once
    const colors = ['#FDA4AF', '#FCD34D', '#34D399', '#60A5FA', '#818CF8', '#A78BFA'];
    const cards = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 140, // Wider spread
        y: (Math.random() - 0.5) * 140,
        z: Math.random() * 800, // Deep depth
        scale: 0.4 + Math.random() * 0.6,
        color: colors[i % colors.length]
    })), []);

    // Animation Logic
    const springs = useSprings(
        cards.length,
        cards.map((card) => {
            // Visual Phase 1: 0.2 -> 1.8
            const active = scrollProgress > 0.1 && scrollProgress < 1.8;
            // Move forward as we scroll
            const flyZ = scrollProgress * 1000 - 500;

            return {
                opacity: active ? 1 - Math.abs(1 - scrollProgress) * 1.5 : 0,
                transform: `
                    translate3d(${card.x}vw, ${card.y}vh, ${flyZ + card.z}px) 
                    scale(${card.scale})
                `,
                config: { mass: 5, tension: 120, friction: 60 }, // Slow, floaty
            };
        })
    );

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform-style-3d perspective-[1000px]">
            {springs.map((style, i) => (
                <animated.div
                    key={i}
                    style={{
                        ...style,
                        position: 'absolute',
                        background: 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                        width: '120px',
                        height: '70px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        backfaceVisibility: 'hidden',
                    }}
                >
                    <div className="h-1.5 w-1/3 rounded-full opacity-60" style={{ backgroundColor: cards[i].color }} />
                    <div className="h-1.5 w-3/4 bg-slate-400/20 rounded-full" />
                    <div className="h-1.5 w-1/2 bg-slate-400/20 rounded-full" />
                </animated.div>
            ))}

            {/* Text Overlay for this section */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
                <animated.div
                    style={{
                        opacity: scrollProgress > 0.6 && scrollProgress < 1.4 ? 1 : 0,
                        transform: `translateY(${(scrollProgress - 1) * -50}px)`
                    }}
                    className="text-center p-8 backdrop-blur-sm"
                >
                    <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-slate-800">Infinite Canvas</h2>
                    <p className="text-slate-500 text-xl font-light tracking-wide">Think without boundaries.</p>
                </animated.div>
            </div>
        </div>
    );
};

export default InfiniteCanvas;
