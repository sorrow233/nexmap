import React, { useState, useEffect } from 'react';

const Concept4_ChaosToOrder = () => {
    const [organized, setOrganized] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setOrganized(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    const cards = [
        { id: 1, chaosX: -150, chaosY: -80, orderX: -200, orderY: -120, color: 'blue' },
        { id: 2, chaosX: 100, chaosY: -120, orderX: -50, orderY: -120, color: 'blue' },
        { id: 3, chaosX: -50, chaosY: 90, orderX: 100, orderY: -120, color: 'blue' },
        { id: 4, chaosX: 180, chaosY: 50, orderX: -200, orderY: 20, color: 'purple' },
        { id: 5, chaosX: -180, chaosY: 20, orderX: -50, orderY: 20, color: 'purple' },
        { id: 6, chaosX: 80, chaosY: -50, orderX: 100, orderY: 20, color: 'purple' }
    ];

    const zones = [
        { name: 'Work', x: -125, y: -70, color: 'blue', opacity: organized ? 1 : 0 },
        { name: 'Ideas', x: -125, y: 70, color: 'purple', opacity: organized ? 1 : 0 }
    ];

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-zinc-900 to-black overflow-hidden flux items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Zone backgrounds */}
                {zones.map(zone => (
                    <div
                        key={zone.name}
                        className={`absolute w-[400px] h-[180px] bg-${zone.color}-500/10 border-2 border-${zone.color}-500/30 rounded-2xl backdrop-blur-sm transition-all duration-1000`}
                        style={{
                            left: `calc(50% + ${zone.x}px)`,
                            top: `calc(50% + ${zone.y}px)`,
                            transform: 'translate(-50%, -50%)',
                            opacity: zone.opacity
                        }}
                    >
                        <div className={`absolute -top-4 left-4 px-3 py-1 bg-${zone.color}-500/20 border border-${zone.color}-400/40 rounded-full text-${zone.color}-300 text-sm font-medium`}>
                            {zone.name}
                        </div>
                    </div>
                ))}

                {/* Cards */}
                {cards.map((card, i) => {
                    const x = organized ? card.orderX : card.chaosX;
                    const y = organized ? card.orderY : card.chaosY;
                    const rotation = organized ? 0 : (Math.random() - 0.5) * 40;

                    return (
                        <div
                            key={card.id}
                            className={`absolute w-24 h-24 bg-zinc-800 border-2 border-white/20 rounded-xl transition-all duration-1000 ease-out shadow-2xl`}
                            style={{
                                left: `calc(50% + ${x}px)`,
                                top: `calc(50% + ${y}px)`,
                                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                transitionDelay: `${i * 0.1}s`
                            }}
                        >
                            <div className="w-full h-full p-3 space-y-2">
                                <div className="h-2 w-3/4 bg-white/20 rounded" />
                                <div className="h-2 w-1/2 bg-white/15 rounded" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Title */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-10">
                <h1 className="text-6xl font-bold text-white mb-4">
                    {organized ? 'Order' : 'Chaos'}
                </h1>
                <p className="text-white/70 text-xl">AI organizes entropy instantly</p>
            </div>

            {/* Button */}
            {!organized && (
                <button
                    onClick={() => setOrganized(true)}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-xl transition-all z-10"
                >
                    Organize Now
                </button>
            )}
        </div>
    );
};

export default Concept4_ChaosToOrder;
