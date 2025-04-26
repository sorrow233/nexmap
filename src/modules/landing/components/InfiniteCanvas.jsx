import React, { useMemo } from 'react';
import { useSprings, animated } from '@react-spring/web';

const InfiniteCanvas = ({ scrollProgress }) => {
    const cards = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 160,
        y: (Math.random() - 0.5) * 160,
        z: Math.random() * 1000,
        scale: 0.6 + Math.random() * 0.4,
        // Wireframe variant: 0 = solid glass, 1 = outline
        variant: Math.random() > 0.7 ? 'outline' : 'glass'
    })), []);

    const springs = useSprings(
        cards.length,
        cards.map((card) => {
            const active = scrollProgress > 0.1 && scrollProgress < 1.8;
            const flyZ = scrollProgress * 1200 - 600;

            return {
                opacity: active ? (1 - Math.abs(1 - scrollProgress) * 1.5) * 0.8 : 0, // Lower max opacity for subtlety
                transform: `
                    translate3d(${card.x}vw, ${card.y}vh, ${flyZ + card.z}px) 
                    scale(${card.scale})
                `,
                config: { mass: 10, tension: 100, friction: 80 }, // Heavier physics
            };
        })
    );

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transform-style-3d perspective-[1000px] font-inter-tight">
            {springs.map((style, i) => (
                <animated.div
                    key={i}
                    style={{
                        ...style,
                        position: 'absolute',
                        // High-End Glass / Wireframe Style
                        background: cards[i].variant === 'glass' ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '4px', // Sharper corners for modern look
                        boxShadow: cards[i].variant === 'glass' ? '0 10px 40px rgba(0,0,0,0.06)' : 'none',
                        width: '140px',
                        height: '90px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        backfaceVisibility: 'hidden',
                    }}
                >
                    {/* Mock Content - Abstract Lines */}
                    <div className="w-16 h-[1px] bg-black/10"></div>
                    <div className="w-10 h-[1px] bg-black/5"></div>

                    {/* Tiny "Label" for realism */}
                    {cards[i].variant === 'glass' && (
                        <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-black/10"></div>
                    )}
                </animated.div>
            ))}

            {/* Text Overlay */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
                <animated.div
                    style={{
                        opacity: scrollProgress > 0.6 && scrollProgress < 1.4 ? 1 : 0,
                        transform: `translateY(${(scrollProgress - 1) * -30}px)`
                    }}
                    className="text-center"
                >
                    <h2 className="text-4xl md:text-6xl font-medium mb-4 tracking-tighter text-[#1a1a1a]">Infinite Canvas</h2>
                    <p className="text-gray-500 text-lg font-normal tracking-wide">Think without boundaries.</p>
                </animated.div>
            </div>
        </div>
    );
};

export default InfiniteCanvas;
