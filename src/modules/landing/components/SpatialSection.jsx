import React, { useEffect, useState } from 'react';
import { BoxSelect, LayoutGrid } from 'lucide-react';

const SpatialSection = () => {
    const [organized, setOrganized] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setOrganized(prev => !prev);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row items-center justify-center p-8 md:p-24 overflow-hidden relative">

            {/* Visual - The Map */}
            <div className="w-full md:w-1/2 relative h-[500px] flex items-center justify-center bg-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(#333333_1px,transparent_1px),linear-gradient(90deg,#333333_1px,transparent_1px)] bg-[size:50px_50px] opacity-10" />

                {/* The Cards / Buildings */}
                <div className="relative w-full h-full">
                    {/* Zone 1: Architecture */}
                    <ZoneBox
                        label="Zone: Architecture"
                        color="blue"
                        x={10} y={10} w={40} h={40}
                        organized={organized}
                        cards={[
                            { id: 1, title: 'Floor Plans' },
                            { id: 2, title: 'Elevations' },
                            { id: 3, title: 'Materials' }
                        ]}
                    />

                    {/* Zone 2: Engineers */}
                    <ZoneBox
                        label="Zone: Engineering"
                        color="amber"
                        x={60} y={50} w={30} h={35}
                        organized={organized}
                        cards={[
                            { id: 4, title: 'Structures' },
                            { id: 5, title: 'Electrical' }
                        ]}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="w-full md:w-1/2 z-10 mt-12 md:mt-0 md:pl-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <BoxSelect className="w-6 h-6 text-blue-400" />
                    </div>
                </div>

                <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                    Spatial <br />
                    <span className="text-blue-500 relative">
                        Organization.
                        {/* Underline decoration */}
                        <svg className="absolute w-full h-3 -bottom-2 left-0 text-blue-500/50" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                    </span>
                </h2>
                <p className="text-gray-400 text-xl leading-relaxed max-w-md mb-8">
                    Semantic Zoning. Don't just organize—<span className="text-white">build cities</span>.
                    Group related thoughts into dynamic Zones that auto-adjust their bounding boxes.
                    Like "Cities: Skylines" for your neural architecture.
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-500 font-mono">
                    <div className={`px-3 py-1 rounded border ${organized ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-transparent border-white/10'}`}>
                        STATE: ORGANIZED
                    </div>
                    <div className={`px-3 py-1 rounded border ${!organized ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-transparent border-white/10'}`}>
                        STATE: CHAOS
                    </div>
                </div>
            </div>
        </div>
    );
};

const ZoneBox = ({ label, color, x, y, w, h, organized, cards }) => {
    // Colors
    const colors = {
        blue: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
        amber: { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400' }
    };
    const theme = colors[color];

    return (
        <>
            {/* The Bounding Box (Only visible when organized) */}
            <div
                className={`absolute rounded-xl border-2 ${theme.border} ${theme.bg} transition-all duration-1000 ease-out flex flex-col`}
                style={{
                    left: organized ? `${x}%` : `${x + 10}%`, // Shift position slightly for chaos
                    top: organized ? `${y}%` : `${y + 5}%`,
                    width: organized ? `${w}%` : '0%', // Collapse when chaotic? Or just fade out border
                    height: organized ? `${h}%` : '0%',
                    opacity: organized ? 1 : 0,
                    pointerEvents: 'none'
                }}
            >
                <div className={`px-3 py-1 ${theme.bg} w-max rounded-br-lg`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>{label}</span>
                </div>
            </div>

            {/* The Cards inside */}
            {cards.map((card, i) => (
                <div
                    key={card.id}
                    className="absolute bg-[#1a1a1a] border border-white/10 p-3 rounded-lg shadow-xl w-32 flex items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{
                        // Calculated chaos positions vs organized positions
                        left: organized
                            ? `${x + 5 + (i * 5)}%` // Stacked neatly-ish
                            : `${(x - 10) + Math.random() * 50}%`, // Scattered
                        top: organized
                            ? `${y + 15 + (i * 8)}%`
                            : `${(y - 10) + Math.random() * 50}%`,
                        transform: organized ? 'rotate(0deg)' : `rotate(${Math.random() * 30 - 15}deg)`,
                        zIndex: 10 + i
                    }}
                >
                    <div className="w-2 h-2 rounded-full bg-white/20 mr-2" />
                    <span className="text-xs text-white/70 font-medium">{card.title}</span>
                </div>
            ))}
        </>
    );
};

export default SpatialSection;
