import React, { useEffect, useState } from 'react';

const Concept4_Cyberpunk = () => {
    const [text, setText] = useState('INITIALIZING...');

    useEffect(() => {
        const phrases = ['INITIALIZING...', 'ESTABLISHING LINK...', 'NEURAL INTERFACE CONNECTED', 'WELCOME, USER_01'];
        let i = 0;
        const interval = setInterval(() => {
            if (i < phrases.length) {
                setText(phrases[i]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-full bg-[#050510] text-[#00ff41] font-mono p-10 overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_4px,6px_100%] pointer-events-none"></div>

            <header className="flex justify-between border-b border-[#00ff41]/30 pb-4 mb-20 relative z-10">
                <h1 className="text-2xl font-bold tracking-widest uppercase">Cyber<span className="text-white">Deck</span></h1>
                <div className="animate-pulse">SYS.STATUS: ONLINE</div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 gap-20 relative z-10">
                <div className="flex flex-col justify-center">
                    <div className="text-xs text-[#00ff41]/60 mb-4">> INPUT_STREAM_DETECTED</div>
                    <h2 className="text-6xl md:text-8xl font-black mb-8 leading-none" style={{ textShadow: '2px 2px 0px #ff00ff, -2px -2px 0px #00ffff' }}>
                        HACK<br />THE<br />FLOW
                    </h2>
                    <p className="border-l-2 border-[#00ff41] pl-6 py-2 text-lg text-[#00ff41]/80 max-w-md">
                        Bypass traditional limitations. Access the mainframe of creativity directly through our neural canvas.
                    </p>

                    <button className="mt-12 bg-[#00ff41]/10 border border-[#00ff41] px-8 py-4 text-[#00ff41] uppercase tracking-widest hover:bg-[#00ff41] hover:text-black transition-all max-w-[200px] glitch-hover">
                        Jack In
                    </button>
                </div>

                <div className="relative border border-[#00ff41]/30 p-4 bg-black/50">
                    <div className="absolute top-0 right-0 p-2 text-xs">MONITOR_01</div>
                    <div className="h-full flex items-center justify-center text-center">
                        <span className="text-4xl animate-pulse">{text}</span>
                    </div>
                    {/* Decorative lines */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#00ff41]"></div>
                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#00ff41]"></div>
                </div>
            </main>

            {/* Scanline effect */}
            <div className="absolute inset-0 bg-scanline pointer-events-none z-30 opacity-10"></div>

            <style>{`
                .bg-scanline {
                    background: linear-gradient(to bottom, transparent 50%, rgba(0, 255, 65, 0.5) 50%);
                    background-size: 100% 4px;
                    animation: scan 10s linear infinite;
                }
                @keyframes scan {
                    from { background-position: 0 0; }
                    to { background-position: 0 100%; }
                }
            `}</style>
        </div>
    );
};

export default Concept4_Cyberpunk;
