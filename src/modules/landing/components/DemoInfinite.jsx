import React from 'react';

const DemoInfinite = ({ scrollProgress }) => {
    // Active range: 0.5 to 1.5
    const localProgress = (scrollProgress - 0.5);
    const isActive = localProgress > -0.5 && localProgress < 1.0;

    // Animation: Cards flying towards the screen
    // As progress increases, scale increases massively
    const baseScale = Math.pow(10, localProgress); // Exponential growth for "zoom" feel

    if (!isActive) return null;

    const opacity = localProgress < 0
        ? Math.max(0, 1 + localProgress * 4)
        : Math.max(0, 1 - (localProgress - 0.5) * 4);

    // Generate concentric rings of cards for fractal effect
    const rings = [1, 2, 3, 4, 5];

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden"
            style={{ opacity }}
        >
            <div className="absolute inset-0 bg-[#FDFDFC] mix-blend-overlay z-0" />

            <div className="relative w-full h-full flex items-center justify-center perspective-[1000px]">

                {/* Text Layer - Fades out quickly */}
                <div
                    className="absolute z-50 text-center"
                    style={{
                        opacity: Math.max(0, 1 - localProgress * 3),
                        transform: `scale(${1 + localProgress})`
                    }}
                >
                    <h2 className="text-6xl md:text-9xl font-bold text-[#1a1a1a] tracking-tight mb-4">
                        Infinite Canvas
                    </h2>
                    <p className="text-2xl text-gray-500 font-light">
                        No boundaries. Just space.
                    </p>
                </div>

                {/* The Fractal Field */}
                {rings.map((ringIndex) => {
                    const ringScale = baseScale * (1 / Math.pow(2, ringIndex));
                    // If scale is too huge or too tiny, don't render to save performance
                    if (ringScale > 20 || ringScale < 0.05) return null;

                    return (
                        <div
                            key={ringIndex}
                            className="absolute inset-0 flex items-center justify-center will-change-transform"
                            style={{ transform: `scale(${ringScale})` }}
                        >
                            {/* Ring of Cards */}
                            {Array.from({ length: 8 }).map((_, i) => {
                                const angle = (i / 8) * Math.PI * 2;
                                const radius = 400; // Base radius
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;
                                const rotation = (i / 8) * 360;

                                return (
                                    <div
                                        key={i}
                                        className="absolute w-64 h-48 bg-white rounded-xl shadow-2xl border border-gray-100/50 p-6 flex flex-col justify-between overflow-hidden"
                                        style={{
                                            transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
                                        }}
                                    >
                                        {/* Mock Content */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <div className="h-2 w-20 bg-gray-100 rounded-full" />
                                        </div>
                                        <div className="space-y-2 opacity-50">
                                            <div className="h-2 w-full bg-gray-50 rounded" />
                                            <div className="h-2 w-3/4 bg-gray-50 rounded" />
                                        </div>

                                        {/* Subtle colored gradient bottom */}
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/20 to-violet-500/20" />
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DemoInfinite;
