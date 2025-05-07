import React from 'react';
import { Image, Download, History, MousePointer2, Layers } from 'lucide-react';

const FeatureBento = ({ scrollProgress }) => {
    // Active range: 2.5 to 3.5
    // Display sequentially as user scrolls
    const localProgress = (scrollProgress - 2.5);
    const isActive = localProgress > -0.5 && localProgress < 1.5;

    if (!isActive) return null;

    // Entrance animation: Staggered slide up
    const getStyle = (index) => {
        const trigger = index * 0.1;
        const progress = Math.min(1, Math.max(0, (localProgress - trigger) * 2));

        return {
            opacity: progress,
            transform: `translateY(${(1 - progress) * 100}px)`,
        };
    };

    const opacity = localProgress < 0.8
        ? 1
        : Math.max(0, 1 - (localProgress - 0.8) * 3); // Fade out at end

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none p-4 md:p-12"
            style={{ opacity }}
        >
            <div className="absolute inset-0 bg-[#FDFDFC] z-0" />

            <div className="relative z-10 w-full max-w-6xl">
                <div className="text-center mb-12" style={getStyle(0)}>
                    <h2 className="text-4xl md:text-6xl font-bold text-[#1a1a1a] mb-4">
                        Everything you need.
                    </h2>
                    <p className="text-xl text-gray-500">
                        Built for power users, designed for everyone.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px]">
                    {/* Feature 1: Multimedia */}
                    <div
                        className="md:col-span-2 row-span-2 bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-md transition-shadow"
                        style={getStyle(0.1)}
                    >
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <Image className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Multimedia Ready</h3>
                            <p className="text-gray-600 max-w-sm">Drag and drop images, paste screenshots, and visualize anything. Your canvas supports high-res media seamlessly.</p>
                        </div>
                        {/* Abstract visual */}
                        <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-50">
                            <div className="absolute bottom-4 right-4 w-48 h-32 bg-white rounded-lg shadow-lg rotate-[-6deg] border border-gray-100" />
                            <div className="absolute bottom-8 right-12 w-48 h-32 bg-gray-200 rounded-lg shadow-lg rotate-[3deg]" />
                        </div>
                    </div>

                    {/* Feature 2: History */}
                    <div
                        className="bg-gray-900 rounded-3xl p-6 flex flex-col justify-between text-white relative overflow-hidden shadow-xl"
                        style={getStyle(0.2)}
                    >
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                                <History className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Time Travel</h3>
                            <p className="text-gray-400 text-sm">Undo/Redo with history.</p>
                        </div>
                    </div>

                    {/* Feature 3: Export */}
                    <div
                        className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex flex-col justify-between"
                        style={getStyle(0.3)}
                    >
                        <div>
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-blue-600">
                                <Download className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Export</h3>
                            <p className="text-gray-600 text-sm">PNG, JPG, or PDF.</p>
                        </div>
                    </div>

                    {/* Feature 4: Realtime (Visual-only) */}
                    <div
                        className="md:col-span-3 bg-gradient-to-r from-gray-50 to-white rounded-3xl p-8 border border-gray-100 flex items-center justify-between"
                        style={getStyle(0.4)}
                    >
                        <div className="max-w-md">
                            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                                <Layers className="w-3 h-3" />
                                <span>Coming Soon</span>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-2">Realtime Collaboration</h3>
                            <p className="text-gray-600">Work together with your team on the same canvas.</p>
                        </div>
                        <div className="hidden md:flex gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                                <MousePointer2 className="w-4 h-4 text-blue-500 fill-blue-500" />
                                <span className="text-sm font-medium">Alex</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                                <MousePointer2 className="w-4 h-4 text-pink-500 fill-pink-500" />
                                <span className="text-sm font-medium">Sarah</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeatureBento;
