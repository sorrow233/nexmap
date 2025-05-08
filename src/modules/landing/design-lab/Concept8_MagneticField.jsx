import React, { useRef, useState, useEffect } from 'react';

const Concept8_Fluidity = () => {
    const [cards, setCards] = useState([
        { id: 1, x: 300, y: 200, vx: 0, vy: 0 },
        { id: 2, x: 600, y: 300, vx: 0, vy: 0 },
        { id: 3, x: 450, y: 400, vx: 0, vy: 0 }
    ]);
    const [mouse, setMouse] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMouse({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCards(prevCards => prevCards.map(card => {
                // Physics: attract to mouse with spring
                const dx = mouse.x - card.x;
                const dy = mouse.y - card.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const force = Math.min(dist / 100, 5);

                let ax = 0, ay = 0;
                if (dist > 150 && dist < 400) {
                    ax = (dx / dist) * force * 0.1;
                    ay = (dy / dist) * force * 0.1;
                }

                // Damping
                const vx = (card.vx + ax) * 0.95;
                const vy = (card.vy + ay) * 0.95;

                return {
                    ...card,
                    x: card.x + vx,
                    y: card.y + vy,
                    vx,
                    vy
                };
            }));
        }, 1000 / 60);

        return () => clearInterval(interval);
    }, [mouse]);

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-zinc-900 to-black overflow-hidden">
            {/* Cursor glow */}
            <div
                className="absolute w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none transition-all duration-150"
                style={{
                    left: mouse.x - 128,
                    top: mouse.y - 128
                }}
            />

            {/* Cards */}
            {cards.map(card => (
                <div
                    key={card.id}
                    className="absolute w-48 h-32 bg-zinc-800/80 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-4 transition-transform duration-75"
                    style={{
                        left: card.x - 96,
                        top: card.y - 64,
                        transform: `rotate(${card.vx * 2}deg)`
                    }}
                >
                    <div className="space-y-2">
                        <div className="h-3 w-3/4 bg-white/20 rounded" />
                        <div className="h-2 w-1/2 bg-white/15 rounded" />
                        <div className="h-2 w-2/3 bg-white/15 rounded" />
                    </div>
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-xl border-2 border-blue-500/30 animate-pulse-ring" />
                </div>
            ))}

            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-10 pointer-events-none">
                <h1 className="text-6xl font-bold text-white mb-2">Fluidity</h1>
                <p className="text-white/70 text-xl">Software that feels alive</p>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-sm pointer-events-none">
                Move your mouse to interact
            </div>

            <style>{`
                @keyframes pulse-ring {
                    0%, 100% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.05); opacity: 0.5; }
                }
                .animate-pulse-ring {
                    animation: pulse-ring 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default Concept8_Fluidity;
