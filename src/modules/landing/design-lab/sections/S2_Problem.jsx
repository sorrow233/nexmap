import React, { useRef, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

const S2_TheNoise = () => {
    // Reveal text on scroll logic would go here, 
    // for now using a static aggressive brutalist layout
    return (
        <section className="min-h-screen w-full bg-white text-black relative flex flex-col justify-center px-8 md:px-24 overflow-hidden">
            <h2 className="text-[150px] md:text-[200px] font-black leading-[0.8] tracking-tighter mix-blend-difference">
                NOISE
                <br />
                SIGNAL
            </h2>

            <div className="flex justify-end mt-12">
                <p className="text-xl md:text-2xl font-mono max-w-md text-right leading-tight">
                    Information overload is the default state.<br />
                    We build the silent engine.
                </p>
            </div>

            {/* Decorative Lines */}
            <div className="absolute left-0 top-1/2 w-full h-[1px] bg-black" />
            <div className="absolute left-1/2 top-0 h-full w-[1px] bg-black" />

            <div className="absolute right-12 bottom-12 w-48 h-48 border-2 border-black rounded-full animate-spin-slow flex items-center justify-center">
                <div className="w-40 h-40 border border-black rounded-full animate-reverse-spin" />
            </div>

            <style>{`
                @keyframes spin-slow { 100% { transform: rotate(360deg); } }
                @keyframes reverse-spin { 100% { transform: rotate(-360deg); } }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }
                .animate-reverse-spin { animation: reverse-spin 15s linear infinite; }
            `}</style>
        </section>
    );
};

export default S2_TheNoise;
