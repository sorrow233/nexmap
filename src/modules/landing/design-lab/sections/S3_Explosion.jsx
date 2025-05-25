import React, { useRef, useEffect } from 'react';
import { useSpring, animated, to } from '@react-spring/web';

const calc = (x, y) => [x - window.innerWidth / 2, y - window.innerHeight / 2];
const trans1 = (x, y) => `translate3d(${x / 10}px,${y / 10}px,0)`;
const trans2 = (x, y) => `translate3d(${x / 8 + 35}px,${y / 8 - 230}px,0)`;
const trans3 = (x, y) => `translate3d(${x / 6 - 250}px,${y / 6 + 200}px,0)`;
const trans4 = (x, y) => `translate3d(${x / 3.5}px,${y / 3.5}px,0)`;

const S3_ZeroGravity = () => {
    const [props, set] = useSpring(() => ({ xy: [0, 0], config: { mass: 10, tension: 550, friction: 140 } }));

    return (
        <section
            className="h-screen w-full bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center"
            onMouseMove={({ clientX: x, clientY: y }) => set({ xy: calc(x, y) })}
        >
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="text-[30vw] font-bold text-[#2a2a2a]">ØG</div>
            </div>

            <animated.div className="absolute w-[400px] h-[500px] bg-zinc-800 rounded-xl shadow-2xl border border-white/5"
                style={{ transform: props.xy.to(trans1) }} />

            <animated.div className="absolute w-[250px] h-[250px] bg-red-600 rounded-full mix-blend-multiply opacity-80 blur-xl"
                style={{ transform: props.xy.to(trans2) }} />

            <animated.div className="absolute w-[300px] h-[400px] bg-blue-600 rounded-xl mix-blend-exclusion opacity-50 blur-md"
                style={{ transform: props.xy.to(trans3) }} />

            <animated.div className="absolute z-10 p-12 bg-black/40 backdrop-blur-xl border border-white/10 text-white max-w-xl"
                style={{ transform: props.xy.to(trans4) }}>
                <h3 className="text-4xl font-bold mb-4">Weightless Interaction</h3>
                <p className="text-lg text-gray-300">
                    The canvas has no friction. Ideas float in suspension until you tether them.
                    Experience true spatial freedom.
                </p>
            </animated.div>
        </section>
    );
};

export default S3_ZeroGravity;
