import React from 'react';

const S8_Performance = () => {
    return (
        <section className="h-screen w-full bg-black relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-50">{[...Array(20)].map((_, i) => (<div key={i} className="absolute h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent w-full animate-fast-streak" style={{ top: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random() * 0.5}s`, animationDelay: `${Math.random()}s` }} />))}</div>
            <div className="relative z-10 text-center space-y-12 mix-blend-screen">
                <div><h2 className="text-[150px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-white tracking-tighter italic">60 FPS</h2><p className="text-2xl text-blue-400 font-bold uppercase tracking-widest mt-4">Zero Latency</p></div>
                <div className="grid grid-cols-3 gap-12 text-center">
                    <div><div className="text-4xl font-bold text-white">100k+</div><div className="text-sm text-gray-500 uppercase tracking-wider">Nodes</div></div>
                    <div><div className="text-4xl font-bold text-white">16ms</div><div className="text-sm text-gray-500 uppercase tracking-wider">Frame Time</div></div>
                    <div><div className="text-4xl font-bold text-white">WebGL</div><div className="text-sm text-gray-500 uppercase tracking-wider">Powered</div></div>
                </div>
            </div>
            <style>{`@keyframes fast-streak { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } } .animate-fast-streak { animation: fast-streak 0.5s linear infinite; }`}</style>
        </section>
    );
};
export default S8_Performance;
