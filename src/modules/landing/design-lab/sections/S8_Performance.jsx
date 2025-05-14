import React, { useState } from 'react';

const S8_Creation = () => {
    const [sparks, setSparks] = useState([]);

    const handleClick = (e) => {
        const id = Date.now();
        const newSpark = { x: e.clientX, y: e.clientY, id };
        setSparks(prev => [...prev, newSpark]);
        setTimeout(() => setSparks(prev => prev.filter(s => s.id !== id)), 1000);
    };

    return (
        <section onClick={handleClick} className="h-screen w-full bg-zinc-950 cursor-crosshair relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <h2 className="text-[10vw] font-bold text-zinc-900 select-none">CREATE</h2>
            </div>

            {sparks.map(s => (
                <div key={s.id} className="absolute pointer-events-none animate-bloom" style={{ left: s.x, top: s.y }}>
                    <div className="w-[300px] h-[300px] bg-gradient-to-r from-pink-500 to-yellow-500 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 opacity-50" />
                    <div className="absolute top-0 left-0 w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_20px_white]" />
                </div>
            ))}

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/30 font-mono text-sm blink">
                // CLICK TO GENERATE
            </div>

            <style>{`
                @keyframes bloom {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
                .animate-bloom { animation: bloom 0.6s ease-out forwards; }
                .blink { animation: blink 1s step-end infinite; }
                @keyframes blink { 50% { opacity: 0; } }
            `}</style>
        </section>
    );
};
export default S8_Creation;
