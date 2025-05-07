import React, { useState, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { ArrowDown } from 'lucide-react';

const HeroSection = ({ scrollProgress, onStart }) => {
    // Only visible in the first phase
    const isVisible = scrollProgress < 0.6;

    const [text, setText] = useState('');
    const fullText = "Everything starts with a thought.";
    const [phase, setPhase] = useState('waiting'); // waiting -> typing -> done -> starting

    // Auto-Type Logic
    useEffect(() => {
        let timeout;

        const typeChar = (index) => {
            if (index < fullText.length) {
                setText(fullText.slice(0, index + 1));
                // Random typing speed for realism
                timeout = setTimeout(() => typeChar(index + 1), 50 + Math.random() * 50);
            } else {
                setPhase('done');
                // Auto-trigger start after a brief pause
                timeout = setTimeout(() => {
                    setPhase('starting');
                    onStart(); // Trigger the page scroll
                }, 1200);
            }
        };

        // Start typing after 1s
        if (phase === 'waiting') {
            timeout = setTimeout(() => {
                setPhase('typing');
                typeChar(0);
            }, 800);
        }

        return () => clearTimeout(timeout);
    }, []);

    // Fade out as user scrolls
    const fadeStyles = useSpring({
        opacity: isVisible ? 1 - scrollProgress * 2 : 0,
        transform: `scale(${1 - scrollProgress * 0.5})`,
    });

    return (
        <animated.div
            style={{
                ...fadeStyles,
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
            className="fixed inset-0 flex flex-col items-center justify-center z-50"
        >
            <div className="max-w-4xl text-center px-6">
                {/* The "Display" Box - Looks like an input but is a display */}
                <div className="relative group">
                    {/* Soft Glow */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-rose-200/30 to-teal-200/30 blur-2xl opacity-50 rounded-full"></div>

                    <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-2xl px-12 py-8 min-h-[120px] flex items-center justify-center min-w-[300px] md:min-w-[600px]">
                        <h1 className="text-4xl md:text-5xl font-lxgw text-slate-800 tracking-tight">
                            {text}
                            {/* Blinking Cursor */}
                            <span className="inline-block w-1 h-10 bg-rose-400 ml-1 animate-pulse align-middle"></span>
                        </h1>
                    </div>
                </div>

                {/* Hint - only shows after typing is done */}
                <div className={`mt-12 transition-opacity duration-1000 ${phase === 'starting' ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-slate-400 text-sm uppercase tracking-[0.3em] mb-4">Initialised</p>
                    <div className="animate-bounce text-slate-300">
                        <ArrowDown size={24} />
                    </div>
                </div>
            </div>
        </animated.div>
    );
};

export default HeroSection;
