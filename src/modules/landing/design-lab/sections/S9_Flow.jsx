import React from 'react';
import { useSpring, animated } from '@react-spring/web';

const S9_TheGrid = () => {
    return (
        <section className="h-screen w-full bg-white relative flex items-center justify-center overflow-hidden">
            {/* Rigid Grid */}
            <div className="absolute inset-0"
                style={{
                    backgroundImage: 'linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 w-full h-full max-w-7xl mx-auto items-center">
                {/* Brutalist Blocks */}
                <div className="bg-black text-white p-6 h-64 flex flex-col justify-between hover:scale-105 transition-transform duration-300">
                    <span className="text-4xl font-mono">01</span>
                    <span className="text-xl font-bold">Research</span>
                </div>
                <div className="bg-blue-600 text-white p-6 h-64 flex flex-col justify-between translate-y-12 hover:scale-105 transition-transform duration-300 shadow-2xl">
                    <span className="text-4xl font-mono">02</span>
                    <span className="text-xl font-bold">Sythesis</span>
                </div>
                <div className="border-4 border-black p-6 h-64 flex flex-col justify-between -translate-y-8 hover:bg-black hover:text-white transition-colors duration-300">
                    <span className="text-4xl font-mono">03</span>
                    <span className="text-xl font-bold">Structure</span>
                </div>
                <div className="bg-zinc-200 p-6 h-64 flex flex-col justify-between translate-y-4 hover:scale-105 transition-transform duration-300">
                    <span className="text-4xl font-mono text-black">04</span>
                    <span className="text-xl font-bold text-black">Output</span>
                </div>
            </div>

            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-600 z-20 mix-blend-multiply" />
        </section>
    );
};
export default S9_TheGrid;
