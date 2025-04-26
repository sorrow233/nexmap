import React from 'react';

const DemoAI = ({ scrollProgress }) => {
    // Active range: 1.5 to 2.5
    const localProgress = (scrollProgress - 1.5);
    const isActive = localProgress > -0.5 && localProgress < 1.0;

    // Animation phases based on progress
    // 0.0 - 0.3: Central card appears
    // 0.3 - 0.6: Sprouting AI cards
    // 0.6 - 1.0: Holding/Connecting

    if (!isActive) return null;

    const opacity = localProgress < 0
        ? Math.max(0, 1 + localProgress * 4)
        : Math.max(0, 1 - (localProgress - 0.5) * 4);

    const sproutScale = Math.min(1, Math.max(0, (localProgress - 0.2) * 3));

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ opacity }}
        >
            <div className="absolute bottom-32 left-0 right-0 text-center z-30">
                <h2 className="text-4xl md:text-6xl font-bold text-[#1a1a1a] mb-4">
                    Collaborative AI
                </h2>
                <p className="text-xl text-gray-500">
                    Your brainstorming partner.
                </p>
            </div>

            {/* Central "User" Card */}
            <div className="relative z-20 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">U</div>
                    <span className="text-sm font-medium text-gray-500">User</span>
                </div>
                <p className="text-lg font-medium text-gray-800">
                    How can we make urban farming more accessible?
                </p>
            </div>

            {/* AI Response Cards */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                {/* Left Card */}
                <div
                    className="absolute w-72 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-blue-100 p-5 origin-center transition-transform duration-500"
                    style={{
                        transform: `translate(${sproutScale * -350}px, ${sproutScale * -100}px) scale(${sproutScale}) rotate(-5deg)`
                    }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                        <span className="text-xs font-medium text-blue-500">Suggestion</span>
                    </div>
                    <p className="text-sm text-gray-700">Modular vertical garden kits for balconies.</p>
                </div>

                {/* Right Card */}
                <div
                    className="absolute w-72 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-blue-100 p-5 origin-center transition-transform duration-500"
                    style={{
                        transform: `translate(${sproutScale * 350}px, ${sproutScale * 50}px) scale(${sproutScale}) rotate(3deg)`
                    }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                        <span className="text-xs font-medium text-blue-500">Analysis</span>
                    </div>
                    <p className="text-sm text-gray-700">Community shared resource hubs for tools and seeds.</p>
                </div>

                {/* Bottom Card */}
                <div
                    className="absolute w-72 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-blue-100 p-5 origin-center transition-transform duration-500"
                    style={{
                        transform: `translate(${sproutScale * 0}px, ${sproutScale * 250}px) scale(${sproutScale}) rotate(0deg)`
                    }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                        <span className="text-xs font-medium text-blue-500">Counterpoint</span>
                    </div>
                    <p className="text-sm text-gray-700">Address water usage concerns with hydroponics.</p>
                </div>
            </div>

            {/* Connection Lines (SVG) - Simple Fade In */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: sproutScale }}>
                <line x1="50%" y1="50%" x2={`calc(50% - 350px)`} y2={`calc(50% - 100px)`} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5,5" />
                <line x1="50%" y1="50%" x2={`calc(50% + 350px)`} y2={`calc(50% + 50px)`} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5,5" />
                <line x1="50%" y1="50%" x2={`calc(50%)`} y2={`calc(50% + 250px)`} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5,5" />
            </svg>
        </div>
    );
};

export default DemoAI;
