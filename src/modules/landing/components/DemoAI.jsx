import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Sparkles, Bot, Wand2, Lightbulb, Zap, Rocket, Target, Flag, GripHorizontal } from 'lucide-react';

const DemoAI = () => {
    const containerRef = useRef(null);
    const [localProgress, setLocalProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            // Same logic as DemoInfinite
            const viewportHeight = window.innerHeight;
            const totalScrollDistance = rect.height - viewportHeight;

            if (totalScrollDistance <= 0) return;

            const scrolled = -rect.top;
            const p = Math.max(0, Math.min(1, scrolled / totalScrollDistance));

            setLocalProgress(p);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Only render if we are nearby to save resources
    // We can check localProgress (0 means not started or finished, but here 0 means start)
    // Actually simpler: just check rect in handleScroll maybe? 
    // For now, let's keep rendering but use opcode opacity 0 if not needed.
    // Optimization: if (p <= 0 || p >= 1) ... but we need to see the start/end states perfectly.

    // Phases
    // 0.0 - 0.25: Input Bar floats in
    // 0.25 - 0.45: Typing effect
    // 0.45 - 0.60: Explosion / Processing (Particles)
    // 0.60 - 1.00: Result fan out (Nodes & Beams)

    // 1. Input Appearance
    const inputOpacity = 1;
    const inputScale = 1;

    // 2. Processing (0.45 start)
    const isProcessing = localProgress > 0.40 && localProgress < 0.65;
    const processScale = isProcessing ? 1 + (localProgress - 0.40) * 8 : 1;
    const processOpacity = isProcessing ? 1 - (localProgress - 0.40) * 4 : 0;

    // 3. Results (0.55 start)
    const resultPhase = Math.max(0, (localProgress - 0.55) * 2.2); // 0 -> 1 faster

    // Input move out (Zoom into the "O" of processing? or just fade out up)
    const inputY = localProgress > 0.45 ? (localProgress - 0.45) * -100 : 0;
    const inputFade = localProgress > 0.45 ? 1 - (localProgress - 0.45) * 8 : 1;

    return (
        <div ref={containerRef} className="h-[200vh] relative">
            <div className="sticky top-0 w-full h-screen flex items-center justify-center relative perspective-[1200px] overflow-hidden">

                {/* Ambient Background Glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                        className="w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[100px] transition-all duration-1000"
                        style={{
                            opacity: localProgress > 0.2 ? 0.4 : 0,
                            transform: `scale(${localProgress * 1.2})`
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
                    <div className="bg-[#050505]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-6 flex items-center gap-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-[80vw] max-w-xl transition-all duration-300 hover:border-white/20">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <Sparkles className="w-5 h-5 text-blue-400 fill-blue-400" />
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div className="flex-1 text-2xl font-light text-white overflow-hidden whitespace-nowrap font-serif tracking-wide">
                            <span className="relative">
                                {localProgress < 0.25 ? "" : "Plan a Mars Colony..."}
                                <span className="animate-pulse ml-1 text-blue-400">|</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. THE PARTICLE EXPLOSION */}
                <div
                    className="absolute z-20 pointer-events-none flex items-center justify-center"
                    style={{
                        opacity: Math.max(0, processOpacity),
                        transform: `scale(${processScale})`
                    }}
                >
                    {/* Core Flash */}
                    <div className="w-4 h-4 bg-white rounded-full blur-[2px] shadow-[0_0_40px_white]" />
                    {/* Shockwave */}
                    <div className="absolute inset-0 w-4 h-4 border-2 border-white/50 rounded-full animate-ping" />
                    {/* Particles */}
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-blue-400 rounded-full"
                            style={{
                                transform: `rotate(${i * 45}deg) translateX(${20 + Math.random() * 20}px)`,
                                opacity: 0.8
                            }}
                        />
                    ))}
                </div>

                {/* 3. THE RESULT (High Fidelity Node Graph) */}
                <div
                    className="absolute inset-0 flex items-center justify-center z-10 w-full h-full"
                    style={{
                        opacity: Math.min(1, resultPhase * 3),
                        transform: `scale(${0.8 + resultPhase * 0.2})`, // Gentle zoom in
                    }}
                >
                    {/* BEAM CONNECTIONS (SVG) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                        <defs>
                            <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.0)" />
                                <stop offset="50%" stopColor="rgba(59, 130, 246, 1)" />
                                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <g style={{ opacity: resultPhase, filter: "url(#glow)" }}>
                            <BeamConnector x1="50%" y1="50%" x2="50%" y2="25%" progress={resultPhase} color="#ef4444" />
                            <BeamConnector x1="50%" y1="50%" x2="25%" y2="60%" progress={resultPhase} delay={0.1} color="#eab308" />
                            <BeamConnector x1="50%" y1="50%" x2="75%" y2="60%" progress={resultPhase} delay={0.1} color="#3b82f6" />

                            <BeamConnector x1="75%" y1="60%" x2="85%" y2="80%" progress={resultPhase} delay={0.3} color="#a855f7" />
                            <BeamConnector x1="25%" y1="60%" x2="15%" y2="80%" progress={resultPhase} delay={0.3} color="#06b6d4" />
                        </g>
                    </svg>

                    {/* CENTRAL NODE */}
                    <GlassNode
                        title="Mars Colony"
                        icon={Rocket}
                        accent="blue"
                        x={0} y={0}
                        scale={1.5}
                        phase={resultPhase}
                    />

                    {/* LEVEL 1 NODES */}
                    <GlassNode title="Habitat" icon={Target} accent="rose" x={0} y={-250} phase={resultPhase} delay={0.1} />
                    <GlassNode title="Resources" icon={Zap} accent="amber" x={-300} y={150} phase={resultPhase} delay={0.2} />
                    <GlassNode title="Transport" icon={Flag} accent="indigo" x={300} y={150} phase={resultPhase} delay={0.25} />

                    {/* LEVEL 2 NODES */}
                    <GlassNode title="Life Support" icon={Lightbulb} accent="cyan" x={-400} y={350} scale={0.85} phase={resultPhase} delay={0.4} />
                    <GlassNode title="Propulsion" icon={Wand2} accent="purple" x={450} y={350} scale={0.85} phase={resultPhase} delay={0.45} />

                </div>

                {/* Dynamic Heading Text */}
                <div
                    className="absolute top-24 left-0 right-0 text-center z-40 transition-all duration-700 ease-out"
                    style={{
                        opacity: 1,
                        transform: `translateY(${localProgress > 0.1 ? 0 : -30}px)`
                    }}
                >
                    <h2 className="text-5xl md:text-8xl font-bold text-white tracking-tighter mb-4 drop-shadow-2xl">
                        {localProgress > 0.55 ? "Structure from Chaos." : "Words become Reality."}
                    </h2>
                    <p className="text-gray-400 text-xl font-light tracking-wide uppercase">
                        AI-Powered Brainstorming
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- SUBCOMPONENTS ---

const BeamConnector = ({ x1, y1, x2, y2, progress, delay = 0, color }) => {
    const deploy = Math.max(0, Math.min(1, (progress - delay) * 2));
    if (deploy <= 0) return null;

    return (
        <>
            {/* Background Line */}
            <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="2"
            />
            {/* Active Beam */}
            <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color}
                strokeWidth="2"
                strokeDasharray="100 100"
                strokeDashoffset={100 - (deploy * 100)}
                strokeLinecap="round"
                className="transition-all duration-75"
            />
            {/* Moving Pulse Particle */}
            <circle r="3" fill="white" className="animate-pulse">
                <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    path={`M${x1} ${y1} L${x2} ${y2}`} // Simplified path logic (requires calculation in real SVG, simplified here for props)
                // Note: animateMotion needs absolute coords. For React simplicity we rely on strokeDashoffset animation above for now.
                // Or keep it simple with just the beam line.
                />
            </circle>
        </>
    );
}

const GlassNode = ({ title, icon: Icon, accent, x, y, scale = 1, phase, delay = 0 }) => {
    const deploy = Math.max(0, Math.min(1, (phase - delay) * 1.5));
    // Spring: 0 -> 1.05 -> 1.0
    const spring = deploy < 0.8 ? deploy * 1.05 : 1.05 - (deploy - 0.8) * 0.25;
    const finalScale = scale * (deploy > 0 ? spring : 0);

    const colors = {
        blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400",
        rose: "from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400",
        amber: "from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400",
        indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 text-indigo-400",
        cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400",
        purple: "from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400",
    };

    const theme = colors[accent] || colors.blue;

    return (
        <div
            className={`absolute rounded-2xl p-[1px] bg-gradient-to-br ${theme.split(" ")[2]} backdrop-blur-md shadow-2xl`}
            style={{
                transform: `translate(${x}px, ${y}px) scale(${finalScale})`,
                opacity: deploy,
                transition: 'transform 0.1s linear' // smoother follow
            }}
        >
            <div className={`bg-[#0A0A0A]/90 rounded-2xl p-5 flex items-center gap-4 border border-white/5 relative overflow-hidden group min-w-[220px]`}>

                {/* Inner Glow */}
                <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${theme.split(" ")[0]} opacity-30 group-hover:opacity-50 transition-opacity`} />

                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 z-10 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${theme.split(" ")[3]}`} />
                </div>

                <div className="flex flex-col z-10">
                    <span className="font-bold text-white text-lg tracking-wide">{title}</span>

                    {/* Fake Content Lines */}
                    <div className="flex gap-2 mt-2">
                        <div className="h-1.5 w-8 bg-white/10 rounded-full" />
                        <div className="h-1.5 w-12 bg-white/10 rounded-full" />
                    </div>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripHorizontal className="w-4 h-4 text-white/20" />
                </div>
            </div>
        </div>
    );
};

export default DemoAI;
