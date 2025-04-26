import React from 'react';
import { Sparkles, Bot, User } from 'lucide-react';

const DemoAI = ({ scrollProgress }) => {
    // Active range: 1.5 to 2.5
    const localProgress = (scrollProgress - 1.5);
    const isActive = localProgress > -0.5 && localProgress < 1.0;

    if (!isActive) return null;

    // Phases
    const inputPhase = Math.min(1, Math.max(0, (localProgress + 0.2) * 2)); // 0 -> 0.5
    const processingPhase = Math.min(1, Math.max(0, (localProgress - 0.2) * 3)); // 0.2 -> 0.5
    const resultPhase = Math.min(1, Math.max(0, (localProgress - 0.4) * 3)); // 0.4 -> 0.7

    const opacity = localProgress < 0
        ? Math.max(0, 1 + localProgress * 4)
        : Math.max(0, 1 - (localProgress - 0.5) * 4);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ opacity }}
        >
            <div className="absolute inset-0 bg-[#FDFDFC]/80 backdrop-blur-sm z-0" />

            {/* Header Text */}
            <div className="absolute top-24 left-0 right-0 text-center z-30">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold mb-6">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Copilot</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-[#1a1a1a] mb-4 tracking-tight">
                    Never start from <br /> blank again.
                </h2>
            </div>

            <div className="relative z-10 w-full max-w-4xl h-[600px] flex items-center justify-center">

                {/* 1. The Interaction (Chat Input) */}
                <div
                    className="absolute z-30 flex flex-col items-center transition-all duration-500 will-change-transform"
                    style={{
                        transform: `translateY(${resultPhase * -200}px) scale(${1 - resultPhase * 0.2})`,
                        opacity: 1
                    }}
                >
                    <div className="w-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-lg text-gray-800 font-medium">
                            Generate a marketing plan for...
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${processingPhase > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                            {processingPhase > 0 ? <Bot className="w-5 h-5 animate-bounce" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                        </div>
                    </div>
                </div>

                {/* 2. The Processing (Pulse) */}
                <div
                    className="absolute z-10 rounded-full bg-blue-500/10 blur-3xl transition-all duration-300"
                    style={{
                        width: processingPhase * 600,
                        height: processingPhase * 600,
                        opacity: processingPhase * (1 - resultPhase)
                    }}
                />

                {/* 3. The Result (Cards appearing) */}
                <div className="absolute inset-0 flex items-center justify-center z-20">
                    {/* Center Card */}
                    <Card
                        title="Market Analysis"
                        color="bg-blue-500"
                        delay={0}
                        phase={resultPhase}
                        x={0} y={50} rotate={0}
                    />

                    {/* Left Card */}
                    <Card
                        title="User Personas"
                        color="bg-violet-500"
                        delay={0.1}
                        phase={resultPhase}
                        x={-280} y={-50} rotate={-6}
                    />

                    {/* Right Card */}
                    <Card
                        title="Competitor Grid"
                        color="bg-indigo-500"
                        delay={0.2}
                        phase={resultPhase}
                        x={280} y={-20} rotate={6}
                    />

                    {/* Bottom Card */}
                    <Card
                        title="Growth Channels"
                        color="bg-pink-500"
                        delay={0.3}
                        phase={resultPhase}
                        x={0} y={250} rotate={2}
                    />
                </div>
            </div>
        </div>
    );
};

// Helper Component for the popped-out cards
const Card = ({ title, color, delay, phase, x, y, rotate }) => {
    // Calculate local deployment phase
    const deploy = Math.max(0, Math.min(1, (phase - delay) * 2));

    // Spring-like overshoot logic manually (easeOutBack equivalent)
    const scale = deploy === 0 ? 0 :
        deploy < 0.8 ? deploy * 1.1 :
            1.0;

    return (
        <div
            className="absolute w-64 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/50 p-5 will-change-transform"
            style={{
                transform: `translate(${x * deploy}px, ${y * deploy}px) rotate(${rotate * deploy}deg) scale(${scale})`,
                opacity: deploy
            }}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white shadow-lg`}>
                    <Bot className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Generated</span>
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">{title}</h4>
            <div className="space-y-2">
                <div className="h-2 w-full bg-gray-100/50 rounded" />
                <div className="h-2 w-5/6 bg-gray-100/50 rounded" />
                <div className="h-2 w-4/6 bg-gray-100/50 rounded" />
            </div>
        </div>
    );
};

export default DemoAI;
