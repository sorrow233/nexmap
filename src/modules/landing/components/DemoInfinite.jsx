import React from 'react';

const DemoInfinite = ({ scrollProgress }) => {
    // Active range: 0.5 to 1.8 (Extended to overlap AI)
    const localProgress = (scrollProgress - 0.5);
    const isActive = localProgress > -0.5 && localProgress < 1.5;

    if (!isActive) return null;

    // Easing: Exponential for natural "zoom" feel
    // scale 1 at progress 0, scale 100 at progress 1
    const zoomLevel = Math.pow(10, localProgress * 2);

    // Softer fade out: starts later (at 0.7) and slower (*2 instead of *4)
    const opacity = localProgress < 0
        ? Math.max(0, 1 + localProgress * 4)
        : Math.max(0, 1 - (localProgress - 0.7) * 2);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-30 pointer-events-none overflow-hidden"
            style={{ opacity }}
        >
            <div className="absolute inset-0 bg-[#FDFDFC] mix-blend-overlay z-0" />

            {/* Container for the zoom content. 
                We use a central pivot point. 
            */}
            <div className="relative w-full h-full flex items-center justify-center perspective-[1000px]">

                {/* Main Title Overlay - Static relative to screen, fades out */}
                <div
                    className="absolute z-50 text-center pointer-events-none mix-blend-exclusion"
                    style={{
                        opacity: Math.max(0, 1 - localProgress * 3),
                        transform: `scale(${1 + localProgress * 0.5})`
                    }}
                >
                    <h2 className="text-9xl md:text-[12rem] font-bold text-[#1a1a1a] tracking-tight leading-none">
                        ∞
                    </h2>
                </div>

                <div
                    className="relative w-[1920px] h-[1080px] bg-[#f8f9fa] border border-gray-200 rounded-lg shadow-2xl flex items-center justify-center origin-center will-change-transform"
                    style={{
                        transform: `scale(${zoomLevel})`,
                    }}
                >
                    {/* LEVEL 1: The Macro View (A huge board) */}
                    {/* A grid of "Projects" */}
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-8 p-12 opacity-20">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="bg-gray-200 rounded-xl border border-gray-300" />
                        ))}
                    </div>

                    {/* LEVEL 2: The Focus Project (Center) */}
                    <div className="relative w-[400px] h-[300px] bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col gap-4">
                        <div className="h-4 w-1/3 bg-gray-800 rounded mb-2" />
                        <div className="flex-1 grid grid-cols-3 gap-2">
                            {/* Small notes */}
                            <div className="bg-blue-50 rounded border border-blue-100" />
                            <div className="bg-green-50 rounded border border-green-100" />
                            <div className="bg-purple-50 rounded border border-purple-100" />
                            <div className="bg-orange-50 rounded border border-orange-100" />
                            <div className="col-span-2 bg-gray-50 rounded border border-gray-100 p-2">
                                {/* LEVEL 3: The Detail Card (Inside Level 2) */}
                                {/* This is what we eventually zoom INTO */}
                                <div className="w-full h-full flex flex-col gap-1 relative overflow-hidden">
                                    <div className="h-1 w-1/2 bg-gray-300 rounded" />
                                    <div className="h-1 w-full bg-gray-200 rounded" />
                                    <div className="h-1 w-full bg-gray-200 rounded" />
                                    <div className="h-1 w-2/3 bg-gray-200 rounded" />

                                    {/* LEVEL 4: Nested Board (The "Fractal" reveal) */}
                                    {/* At high zoom, this looks like another full board */}
                                    <div className="absolute top-4 left-4 right-4 bottom-4 border border-red-500/20 rounded flex items-center justify-center">
                                        <div className="text-[2px] text-red-500 font-bold uppercase tracking-widest">
                                            Micro Universe
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Connectors */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ transform: 'scale(1)' }}>
                        <path d="M 960 540 L 1200 300" stroke="black" strokeWidth="2" strokeDasharray="10 10" />
                        <path d="M 960 540 L 600 800" stroke="black" strokeWidth="2" strokeDasharray="10 10" />
                    </svg>
                </div>

                {/* Text Layer that appears "inside" the zoom */}
                {localProgress > 0.4 && (
                    <div
                        className="fixed bottom-32 left-0 right-0 text-center"
                        style={{
                            opacity: Math.min(1, (localProgress - 0.4) * 4)
                        }}
                    >
                        <p className="text-3xl md:text-5xl font-light text-gray-800 bg-white/80 backdrop-blur-md py-4 px-12 inline-block rounded-full shadow-lg border border-gray-100">
                            From the <b className="font-bold">Macro</b> strategy...
                        </p>
                    </div>
                )}
                {localProgress > 0.7 && (
                    <div
                        className="fixed bottom-12 left-0 right-0 text-center"
                        style={{
                            opacity: Math.min(1, (localProgress - 0.7) * 4)
                        }}
                    >
                        <p className="text-3xl md:text-5xl font-light text-gray-800 bg-white/80 backdrop-blur-md py-4 px-12 inline-block rounded-full shadow-lg border border-gray-100">
                            ...to the <b className="font-bold">Micro</b> detail.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemoInfinite;
