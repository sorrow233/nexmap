import React from 'react';
import { Sparkles, Bot, Wand2, Lightbulb, Zap } from 'lucide-react';

const DemoAI = ({ scrollProgress }) => {
    // Active range: 1.2 to 2.5 (Shifted earlier)
    const localProgress = (scrollProgress - 1.5);
    // Keep active longer to bridge gaps
    const isActive = scrollProgress > 1.0 && scrollProgress < 2.8;

    if (!isActive) return null;

    // Phases - Adjusted for smoother timing
    const inputPhase = Math.min(1, Math.max(0, (localProgress + 0.3) * 2)); // Start appearing sooner
    const processingPhase = Math.min(1, Math.max(0, (localProgress - 0.1) * 3));
    const resultPhase = Math.min(1, Math.max(0, (localProgress - 0.3) * 3));

    // Opacity: Overlaps better with Infinite and Bento
    // Fade in: Starts at scroll 1.1 (local -0.4)
    // Fade out: Starts at scroll 2.1 (local 0.6)
    const opacity = localProgress < 0
        ? Math.max(0, 1 + (localProgress + 0.2) * 3)
        : Math.max(0, 1 - (localProgress - 0.6) * 3);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-30 pointer-events-none overflow-hidden"
            style={{ opacity }}
        >
            <div className="absolute inset-0 bg-slate-900 z-0 transition-colors duration-700"
                style={{ backgroundColor: processingPhase > 0 ? '#0f172a' : '#FDFDFC' }}
            />

            {/* Header Text - Changes color based on phase */}
            <div className="absolute top-24 left-0 right-0 text-center z-30 transition-colors duration-500"
                style={{ color: processingPhase > 0.1 ? 'white' : '#1a1a1a' }}
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 backdrop-blur-md rounded-full text-blue-500 font-semibold mb-6 border border-blue-500/20">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Copilot</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
                    Words become <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 animate-pulse">
                        Reality.
                    </span>
                </h2>
            </div>

            <div className="relative z-10 w-full max-w-4xl h-[600px] flex items-center justify-center perspective-[1000px]">

                {/* 1. The Prompt Bar (Floating Input) */}
                <div
                    className="absolute z-40 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-8 py-4 flex items-center gap-4 shadow-2xl text-white w-full max-w-lg origin-center transition-all duration-700"
                    style={{
                        transform: `translateY(${resultPhase * -250}px) scale(${1 - resultPhase * 0.3})`,
                        opacity: 1
                    }}
                >
                    <Bot className="w-6 h-6 text-blue-400" />
                    <span className="text-xl font-light opacity-90 typing-effect whitespace-nowrap overflow-hidden border-r-2 border-blue-400/50 pr-1">
                        Draw a mindmap for a coffee shop launch...
                    </span>
                </div>

                {/* 2. The Magic Swirl (Particles) */}
                <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ opacity: Math.max(0, processingPhase - resultPhase) }}
                >
                    {/* Simulated particles using CSS shadows/gradients */}
                    <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl animate-spin-slow" />
                    <div className="absolute w-[300px] h-[300px] rounded-full bg-blue-400/10 blur-2xl animate-pulse" />
                </div>

                {/* 3. The Result (Materializing Cards) */}
                <div className="absolute inset-0 flex items-center justify-center z-20" style={{ transformStyle: 'preserve-3d' }}>
                    {/* Central Hub */}
                    <Card
                        title="Coffee Shop Launch"
                        icon={Zap}
                        color="bg-amber-500"
                        delay={0}
                        phase={resultPhase}
                        x={0} y={0} z={50}
                        scale={1.2}
                    />

                    {/* Surrounding Nodes */}
                    <Card title="Menu Strategy" icon={Lightbulb} color="bg-orange-500" delay={0.1} phase={resultPhase} x={-250} y={-100} z={0} rotate={-10} />
                    <Card title="Marketing" icon={Wand2} color="bg-pink-500" delay={0.2} phase={resultPhase} x={250} y={-100} z={0} rotate={10} />
                    <Card title="Operations" icon={Bot} color="bg-cyan-500" delay={0.3} phase={resultPhase} x={-200} y={150} z={0} rotate={-5} />
                    <Card title="Finance" icon={Sparkles} color="bg-emerald-500" delay={0.4} phase={resultPhase} x={200} y={150} z={0} rotate={5} />

                    {/* Connecting Lines (SVG Overlay) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: resultPhase, transition: 'opacity 1s' }}>
                        {/* Lines drawn from center to approximate card positions */}
                        <line x1="50%" y1="50%" x2="calc(50% - 250px)" y2="calc(50% - 100px)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="calc(50% + 250px)" y2="calc(50% - 100px)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="calc(50% - 200px)" y2="calc(50% + 150px)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                        <line x1="50%" y1="50%" x2="calc(50% + 200px)" y2="calc(50% + 150px)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                    </svg>
                </div>
            </div>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 10s linear infinite;
                }
            `}</style>
        </div>
    );
};

// Helper Component for the materialized cards
const Card = ({ title, icon: Icon, color, delay, phase, x, y, z, rotate = 0, scale = 1 }) => {
    // Calculate local deployment phase
    const deploy = Math.max(0, Math.min(1, (phase - delay) * 2));

    // Spring-like overshoot logic manually
    const currentScale = deploy * scale;

    return (
        <div
            className="absolute w-56 bg-white/10 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 p-5 will-change-transform flex flex-col gap-3"
            style={{
                transform: `translateX(${x * deploy}px) translateY(${y * deploy}px) translateZ(${z * deploy}px) rotate(${rotate * deploy}deg) scale(${currentScale})`,
                opacity: deploy
            }}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="h-2 w-16 bg-white/20 rounded-full" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">{title}</h4>
            <div className="space-y-2 opacity-50">
                <div className="h-1 w-full bg-white/40 rounded" />
                <div className="h-1 w-5/6 bg-white/40 rounded" />
            </div>
        </div>
    );
};

export default DemoAI;
