import React, { useEffect, useRef } from 'react';

const DemoInfinite = ({ scrollProgress }) => {
    // Active range: 0.5 to 1.5
    // 0.5 - 1.0: Fade in & Zoom out
    // 1.0 - 1.5: Hold/Drift & Fade out

    // Normalize progress for this section
    const localProgress = (scrollProgress - 0.5);

    const isActive = localProgress > -0.5 && localProgress < 1.0;

    const opacity = localProgress < 0
        ? Math.max(0, 1 + localProgress * 4) // Fade in
        : Math.max(0, 1 - (localProgress - 0.5) * 4); // Fade out

    const scale = Math.max(0.1, 1 - localProgress * 0.8); // Zoom out effect

    if (!isActive) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden"
            style={{ opacity }}
        >
            <div
                className="absolute inset-0 bg-gradient-to-b from-[#FDFDFC] via-transparent to-[#FDFDFC] z-10"
            />

            <div className="relative w-full h-full flex items-center justify-center transform-gpu"
                style={{ transform: `scale(${scale})` }}
            >
                {/* Central Note */}
                <div className="absolute w-64 h-48 bg-white rounded-xl shadow-xl border border-gray-100 p-6 flex flex-col justify-between z-20">
                    <div className="h-4 w-3/4 bg-gray-100 rounded" />
                    <div className="space-y-2">
                        <div className="h-2 w-full bg-gray-50 rounded" />
                        <div className="h-2 w-5/6 bg-gray-50 rounded" />
                        <div className="h-2 w-4/6 bg-gray-50 rounded" />
                    </div>
                </div>

                {/* Surrounding Notes (Abstracted) */}
                {Array.from({ length: 20 }).map((_, i) => {
                    const angle = (i / 20) * Math.PI * 2;
                    const radius = 400 + Math.random() * 400;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <div
                            key={i}
                            className="absolute bg-gray-50 rounded-lg border border-gray-100/50 shadow-sm"
                            style={{
                                width: 100 + Math.random() * 100,
                                height: 80 + Math.random() * 80,
                                transform: `translate(${x}px, ${y}px)`,
                            }}
                        />
                    );
                })}
                {Array.from({ length: 40 }).map((_, i) => {
                    const angle = (i / 40) * Math.PI * 2;
                    const radius = 1200 + Math.random() * 800;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <div
                            key={`outer-${i}`}
                            className="absolute bg-gray-50/50 rounded-lg border border-gray-100/30"
                            style={{
                                width: 200 + Math.random() * 100,
                                height: 160 + Math.random() * 80,
                                transform: `translate(${x}px, ${y}px)`,
                            }}
                        />
                    );
                })}
            </div>

            <div className="absolute bottom-32 left-0 right-0 text-center z-30">
                <h2 className="text-4xl md:text-6xl font-bold text-[#1a1a1a] mb-4">
                    Infinite Canvas
                </h2>
                <p className="text-xl text-gray-500">
                    Space for every idea.
                </p>
            </div>
        </div>
    );
};

export default DemoInfinite;
