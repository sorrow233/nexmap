import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

const S6_SpeedOfThought = () => {
    const [scrollSpeed, setScrollSpeed] = useState(0);

    // Naive scroll velocity tracker (usually better with a hook, simplified here)
    useEffect(() => {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const update = () => {
            const currentY = window.scrollY;
            const delta = currentY - lastScrollY;
            setScrollSpeed(delta);
            lastScrollY = currentY;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Skew based on scroll velocity
    const skew = Math.min(Math.max(scrollSpeed * 0.5, -20), 20);

    return (
        <section className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
            <div className="relative w-full text-center mix-blend-difference z-10">
                <div style={{ transform: `skewX(${skew}deg)` }} className="transition-transform duration-100 ease-out">
                    <h2 className="text-[12vw] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-800 leading-[0.8]">
                        VELOCITY
                    </h2>
                    <h2 className="text-[12vw] font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-800 to-black leading-[0.8] blur-sm opacity-50 absolute top-4 left-4 -z-10">
                        VELOCITY
                    </h2>
                </div>
            </div>

            {/* Passing lines */}
            <div className="absolute inset-0 z-0">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="absolute w-full h-[2px] bg-white/20 animate-warp-speed"
                        style={{ top: `${i * 20}%`, animationDuration: `${0.2 + i * 0.1}s` }} />
                ))}
            </div>

            <style>{`
                @keyframes warp-speed {
                    0% { transform: translateX(-100%) scaleX(0.5); opacity: 0; }
                    50% { opacity: 1; transform: translateX(0) scaleX(2); }
                    100% { transform: translateX(100%) scaleX(0.5); opacity: 0; }
                }
                .animate-warp-speed {
                    animation: warp-speed 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
        </section>
    );
};
export default S6_SpeedOfThought;
