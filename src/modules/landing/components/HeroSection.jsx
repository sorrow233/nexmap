import React, { useState, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { ArrowDown } from 'lucide-react';

const HeroSection = ({ scrollProgress, onStart }) => {
    // Only visible in the first phase
    const isVisible = scrollProgress < 0.6;

    const [text, setText] = useState('');
    const fullText = "Everything starts with a thought.";
    const [phase, setPhase] = useState('waiting');

    // Auto-Type Logic
    useEffect(() => {
        let timeout;

        const typeChar = (index) => {
            if (index < fullText.length) {
                setText(fullText.slice(0, index + 1));
                // Slower, more deliberate typing
                timeout = setTimeout(() => typeChar(index + 1), 60 + Math.random() * 40);
            } else {
                setPhase('done');
                timeout = setTimeout(() => {
                    setPhase('starting');
                    onStart();
                }, 1500);
            }
        };

        if (phase === 'waiting') {
            timeout = setTimeout(() => {
                setPhase('typing');
                typeChar(0);
            }, 1000);
        }

        return () => clearTimeout(timeout);
    }, []);

    // Staggered Fade
    const fadeStyles = useSpring({
        opacity: isVisible ? 1 - scrollProgress * 1.5 : 0,
        transform: `translateY(${scrollProgress * 50}px)`,
        config: { mass: 5, tension: 200, friction: 50 }
    });

    return (
        <animated.div
            style={{
                ...fadeStyles,
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
            className="fixed inset-0 flex flex-col items-center justify-center z-50 font-inter-tight"
        >
            <div className="max-w-4xl text-center px-6 mix-blend-multiply">

                {/* Pure Typography - No Input Box */}
                <div className="relative min-h-[160px] flex items-center justify-center">
                    <h1 className="text-5xl md:text-7xl font-medium tracking-tight text-[#1a1a1a] leading-tight">
                        {text}
                        {/* Minimalist Caret */}
                        <span className="inline-block w-0.5 h-12 md:h-16 bg-[#1a1a1a] ml-1 animate-pulse align-bottom opacity-50"></span>
                    </h1>
                </div>

                {/* Minimalist Hint */}
                <div className={`mt-16 transition-all duration-1000 transform ${phase === 'starting' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-semibold">Scroll to Explore</span>
                        <div className="w-[1px] h-12 bg-gradient-to-b from-gray-300 to-transparent"></div>
                    </div>
                </div>
            </div>
        </animated.div>
    );
};

export default HeroSection;
