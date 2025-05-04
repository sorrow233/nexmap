import React, { useEffect, useRef } from 'react';

const Concept3_Typography = () => {
    return (
        <div className="w-full min-h-screen bg-[#e8e8e5] text-[#1a1a1a] overflow-x-hidden font-sans">
            <div className="fixed top-0 left-0 w-full p-6 flex justify-between mix-blend-difference z-50 text-white md:mix-blend-normal md:text-[#1a1a1a]">
                <div className="text-sm font-bold uppercase tracking-tighter">AntiGravity™</div>
                <div className="text-sm font-bold uppercase tracking-tighter">2025</div>
            </div>

            <section className="h-screen flex flex-col justify-center items-center px-4">
                <h1 className="text-[12vw] leading-[0.85] font-black tracking-tighter text-center scale-y-110">
                    THINK<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">FASTER</span>
                </h1>
            </section>

            <section className="py-24 px-4 md:px-20 border-t border-black/10">
                <div className="max-w-4xl">
                    <p className="text-4xl md:text-6xl font-medium leading-tight tracking-tight">
                        We built a tool for the <span className="underline decoration-4 decoration-orange-500 underline-offset-4">mind</span>, not just the screen. A recursive canvas that adapts to your thought process.
                    </p>
                </div>
            </section>

            <section className="whitespace-nowrap overflow-hidden py-10 bg-black text-[#e8e8e5]">
                <div className="animate-marquee inline-block">
                    <span className="text-9xl font-black tracking-tighter mx-8">INFINITE CANVAS</span>
                    <span className="text-9xl font-black tracking-tighter mx-8 opacity-50">SPATIAL LOGIC</span>
                    <span className="text-9xl font-black tracking-tighter mx-8">RECURSIVE AI</span>
                    <span className="text-9xl font-black tracking-tighter mx-8 opacity-50">COLLABORATION</span>
                    <span className="text-9xl font-black tracking-tighter mx-8">INFINITE CANVAS</span>
                    <span className="text-9xl font-black tracking-tighter mx-8 opacity-50">SPATIAL LOGIC</span>
                </div>
            </section>

            <section className="h-[80vh] flex items-center justify-center bg-[#e8e8e5]">
                <div className="relative group cursor-pointer">
                    <div className="absolute -inset-4 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                    <h2 className="relative text-8xl font-black tracking-tighter z-10 skew-x-[-10deg] group-hover:skew-x-0 transition-transform duration-500">
                        START NOW
                    </h2>
                </div>
            </section>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 20s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Concept3_Typography;
