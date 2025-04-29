import React from 'react';
import { Sparkles, Bot, Wand2, Lightbulb, Zap, Rocket, Target, Flag } from 'lucide-react';

const DemoAI = ({ scrollProgress }) => {
    // Scroll Timeline: 3.0 -> 4.5
    // Normalize to 0 -> 1 for this section
    const START = 3.0;
    const END = 4.5;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - START) / (END - START)));

    // Only render if we are nearby to save resources
    if (scrollProgress < 2.5 || scrollProgress > 5.0) return null;

    // Phases
    // 0.0 - 0.2: Input Bar floats in
    // 0.2 - 0.4: Typing effect
    // 0.4 - 0.6: Explosion / Processing
    // 0.6 - 1.0: Result fan out

    // 1. Input Appearance
    const inputOpacity = localProgress < 0.1 ? localProgress * 10 : 1;
    const inputScale = localProgress < 0.1 ? 0.8 + (localProgress * 2) : 1;

    // 2. Processing (0.4 start)
    const isProcessing = localProgress > 0.35 && localProgress < 0.6;
    const processScale = isProcessing ? 1 + (localProgress - 0.35) * 4 : 1;
    const processOpacity = isProcessing ? 1 - (localProgress - 0.35) * 4 : 0;

    // 3. Results (0.5 start)
    const resultPhase = Math.max(0, (localProgress - 0.5) * 2); // 0 -> 1

    // Input move out (Zoom into the "O" of processing? or just fade out up)
    const inputY = localProgress > 0.4 ? (localProgress - 0.4) * -300 : 0;
    const inputFade = localProgress > 0.4 ? 1 - (localProgress - 0.4) * 5 : 1;

    return (
        <div className="w-full h-full flex items-center justify-center relative perspective-[1000px]">
            {/* Background Glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                    className="w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] transition-all duration-700"
                    style={{
                        opacity: localProgress > 0.2 ? 0.5 : 0,
                        transform: `scale(${localProgress})`
                    }}
                />
            </div>

            {/* 1. INPUT BAR */}
            <div
                className="absolute z-30 flex flex-col items-center gap-6"
                style={{
                    opacity: Math.max(0, inputOpacity * inputFade),
                    transform: `translateY(${inputY}px) scale(${inputScale})`
                }}
            >
                <div className="bg-[#0A0A0A] border border-white/20 rounded-full px-8 py-5 flex items-center gap-4 shadow-2xl w-[90vw] max-w-2xl">
                    <Bot className="w-6 h-6 text-blue-400" />
                    <div className="h-6 w-[1px] bg-white/20" />
                    <div className="text-xl md:text-2xl font-light text-white overflow-hidden whitespace-nowrap">
                        <span className="relative">
                            {localProgress < 0.2 ? "..." : "Create a launch plan for Mars Colony"}
                            <span className="animate-pulse ml-1 text-blue-400">|</span>
                        </span>
                    </div>
                </div>

                <div className="text-gray-500 font-medium tracking-widest text-sm uppercase">
                    Just ask.
                </div>
            </div>

            {/* 2. THE EXPLOSION (Transition) */}
            <div
                className="absolute z-20 pointer-events-none"
                style={{
                    opacity: Math.max(0, processOpacity),
                    transform: `scale(${processScale})`
                }}
            >
                <div className="w-20 h-20 bg-white rounded-full blur-md" />
                <div className="absolute inset-0 w-20 h-20 bg-blue-500 rounded-full blur-xl animate-ping" />
            </div>

            {/* 3. THE RESULT (Mind Map) */}
            <div
                className="absolute inset-0 flex items-center justify-center z-10 w-full h-full"
                style={{
                    opacity: Math.min(1, resultPhase * 2),
                    transform: `scale(${0.5 + resultPhase * 0.5}) rotateX(20deg)`, // Tilt slightly
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* Lines Container - SVG */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <g style={{ opacity: resultPhase }}>
                        <Connector x1="50%" y1="50%" x2="50%" y2="20%" progress={resultPhase} />
                        <Connector x1="50%" y1="50%" x2="20%" y2="60%" progress={resultPhase} />
                        <Connector x1="50%" y1="50%" x2="80%" y2="60%" progress={resultPhase} />
                        <Connector x1="80%" y1="60%" x2="85%" y2="80%" progress={resultPhase} delay={0.2} />
                        <Connector x1="20%" y1="60%" x2="15%" y2="80%" progress={resultPhase} delay={0.2} />
                    </g>
                </svg>

                {/* Central Node */}
                <MindCard
                    title="Mars Colony"
                    icon={Rocket}
                    color="bg-orange-500"
                    x={0} y={0}
                    scale={1.5}
                    phase={resultPhase}
                />

                {/* Level 1 Nodes */}
                <MindCard title="Habitat" icon={Target} color="bg-red-500" x={0} y={-300} phase={resultPhase} delay={0.1} />
                <MindCard title="Resources" icon={Zap} color="bg-yellow-500" x={-300} y={100} phase={resultPhase} delay={0.15} />
                <MindCard title="Transport" icon={Flag} color="bg-blue-500" x={300} y={100} phase={resultPhase} delay={0.2} />

                {/* Level 2 Nodes - Details */}
                <MindCard title="Oxygen" icon={Lightbulb} color="bg-cyan-500" x={-350} y={300} scale={0.8} phase={resultPhase} delay={0.3} />
                <MindCard title="Rockets" icon={Wand2} color="bg-purple-500" x={380} y={300} scale={0.8} phase={resultPhase} delay={0.35} />

            </div>

            {/* Heading Text fixed at top */}
            <div
                className="absolute top-20 left-0 right-0 text-center z-40 transition-all duration-500"
                style={{
                    opacity: localProgress > 0.1 ? 1 : 0,
                    transform: `translateY(${localProgress > 0.1 ? 0 : -20}px)`
                }}
            >
                <h2 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 tracking-tighter">
                    {localProgress > 0.5 ? "Structure from Chaos." : "Words to Reality."}
                </h2>
            </div>
        </div>
    );
};

const Connector = ({ x1, y1, x2, y2, progress, delay = 0 }) => {
    // Only show after delay
    const effectiveProgress = Math.max(0, (progress - delay) * 2);
    if (effectiveProgress <= 0) return null;

    return (
        <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            strokeDasharray="10 10"
            className="animate-pulse"
        />
    );
}

const MindCard = ({ title, icon: Icon, color, x, y, scale = 1, phase, delay = 0 }) => {
    const deploy = Math.max(0, Math.min(1, (phase - delay) * 1.5));
    // Spring effect: overshoot
    // Simple mock spring: 0 -> 1.1 -> 1
    const spring = deploy < 0.8 ? deploy * 1.1 : 1.1 - (deploy - 0.8) * 0.5;
    const finalScale = scale * (deploy > 0 ? spring : 0);

    return (
        <div
            className="absolute bg-[#111] border border-white/10 p-4 rounded-xl flex items-center gap-3 shadow-xl w-48"
            style={{
                transform: `translate(${x}px, ${y}px) scale(${finalScale})`,
                opacity: deploy
            }}
        >
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white shrink-0`}>
                <Icon size={20} />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="font-bold text-white truncate">{title}</span>
                <div className="h-1.5 w-12 bg-white/20 rounded-full mt-1" />
            </div>
        </div>
    );
}

export default DemoAI;
