import React, { useEffect, useRef, useState } from 'react';
import { GitBranch, Box, Zap, Network, ArrowRight } from 'lucide-react';

const HeroSection = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // --- NEURAL ENGINE PARTICLE SYSTEM (Optimized for Pro Vibe) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Config - Deep, dark, precise
        const particleCount = 100;
        const connectionDistance = 140;
        const mouseDistance = 300;
        const particles = [];
        let mouse = { x: -1000, y: -1000 };

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
        };
        window.addEventListener('resize', resize);
        resize();

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };
        window.addEventListener('mousemove', handleMouseMove);

        class Particle {
            constructor() {
                this.x = Math.random() * window.innerWidth;
                this.y = Math.random() * window.innerHeight;
                this.vx = (Math.random() - 0.5) * 0.15;
                this.vy = (Math.random() - 0.5) * 0.15;
                this.size = Math.random() * 1.5 + 0.5;
                this.alpha = Math.random() * 0.5 + 0.2;
                // Enterprise Blue/Indigo
                this.color = `rgba(120, 140, 255, ${this.alpha})`;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > window.innerWidth) this.vx *= -1;
                if (this.y < 0 || this.y > window.innerHeight) this.vy *= -1;

                // Repel/Attract Logic
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouseDistance) {
                    const force = (mouseDistance - dist) / mouseDistance;
                    this.vx -= dx * force * 0.0003;
                    this.vy -= dy * force * 0.0003;
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) particles.push(new Particle());

        const animate = () => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            particles.forEach(p => { p.update(); p.draw(); });
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(100, 150, 255, ${(1 - dist / connectionDistance) * 0.1})`;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        };
        animate();
        return () => { window.removeEventListener('resize', resize); window.removeEventListener('mousemove', handleMouseMove); };
    }, []);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Styles for Animations */}
            <style>{`
                @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes pulse-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
                @keyframes scan-line { 0% { top: -100%; } 100% { top: 200%; } }
                .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
            `}</style>

            {/* Background Layers */}
            <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-[#020202]/80 z-0 pointer-events-none" />

            {/* Ambient Glows */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-900/10 blur-[150px] rounded-full pointer-events-none" />

            {/* HEADER CONTENT */}
            <div className="flex flex-col items-center text-center max-w-5xl mx-auto mb-20 relative z-10 animate-fade-in-up">

                {/* Arrogant Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-xl group cursor-default hover:bg-white/10 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-200/80">Pro / Enterprise Only</span>
                </div>

                <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-bold tracking-tighter mb-8 leading-[0.85] font-inter-tight">
                    Built for <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-400/50 filter drop-shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                        LLM Professionals.
                    </span>
                </h1>

                <p className="text-lg md:text-2xl text-gray-400 font-light max-w-2xl leading-relaxed">
                    We stripped away the clutter so you can focus on the <span className="text-white font-medium border-b border-indigo-500/50 pb-0.5">flow</span>.
                </p>
            </div>

            {/* BENTO GRID - KILLER FEATURES */}
            <div className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 perspective-[2000px]">

                {/* 1. Recursive Sprout (Tall) */}
                <TiltCard className="md:row-span-2 glass-card group">
                    <div className="h-full flex flex-col relative z-20 p-10">
                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all duration-500">
                            <GitBranch className="w-7 h-7 text-indigo-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Recursive Sprouting</h3>
                        <p className="text-gray-400 text-lg leading-relaxed max-w-xs mb-8">
                            Don't just chat. <span className="text-white">Branch.</span> <br />
                            Sprout recursive thought trees to explore 5 divergent execution paths simultaneously.
                        </p>

                        {/* Visual: Tree Graph */}
                        <div className="flex-1 w-full relative min-h-[200px] border border-white/5 rounded-xl bg-[#050505] overflow-hidden">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[2px] h-20 bg-indigo-500/50"></div>
                            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-32 h-[2px] bg-indigo-500/30"></div>
                            <div className="absolute top-[40%] left-[calc(50%-64px)] w-[2px] h-10 bg-indigo-500/30"></div>
                            <div className="absolute top-[40%] left-[calc(50%+64px)] w-[2px] h-10 bg-indigo-500/30"></div>

                            {/* Pulsing Nodes */}
                            <div className="absolute top-[30%] left-[calc(50%-64px)] w-3 h-3 bg-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,1)] animate-ping" />
                            <div className="absolute top-[30%] left-[calc(50%+64px)] w-3 h-3 bg-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,1)] animate-ping" style={{ animationDelay: '0.5s' }} />
                        </div>
                    </div>
                </TiltCard>

                {/* 2. Graph Context Walking */}
                <TiltCard className="glass-card min-h-[340px] p-10 group">
                    <div className="h-full flex flex-col justify-between relative z-10">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                            <Network className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-3">Graph Context Walking</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Vector search is dead. We traverse the <span className="text-emerald-400">semantic graph</span> of your canvas to inject precise neighbor context.
                            </p>
                        </div>
                    </div>
                    {/* Background Visual */}
                    <svg className="absolute top-4 right-4 w-32 h-32 opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none text-emerald-500">
                        <path d="M10,10 L80,30 L50,80 L10,10" fill="none" stroke="currentColor" strokeWidth="1" />
                        <circle cx="10" cy="10" r="3" fill="currentColor" />
                        <circle cx="80" cy="30" r="3" fill="currentColor" />
                        <circle cx="50" cy="80" r="3" fill="currentColor" />
                    </svg>
                </TiltCard>

                {/* 3. Uncapped Concurrency */}
                <TiltCard className="glass-card min-h-[340px] p-10 group overflow-hidden">
                    <div className="h-full flex flex-col justify-between relative z-10">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-500">
                            <Zap className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-3">Uncapped Concurrency</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Why wait? Run <span className="text-amber-400 font-bold">50+ agents</span> in parallel. Our non-blocking architecture handles the load.
                            </p>
                        </div>
                    </div>
                    {/* Streaming Text Effect */}
                    <div className="absolute inset-0 top-0 left-0 bg-[url('https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif')] opacity-[0.03] group-hover:opacity-[0.07] mix-blend-screen pointer-events-none transition-opacity duration-700" />
                </TiltCard>


                {/* 4. Spatial Logic (Wide) */}
                <TiltCard className="md:col-span-2 glass-card min-h-[320px] p-10 group overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center justify-between h-full relative z-10">
                        <div className="max-w-md relative z-20">
                            <div className="inline-flex items-center gap-2 mb-4">
                                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                                <span className="text-xs font-mono text-green-400/80">LIVE CANVAS STATE</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-3">Spatial Logic Canvas</h3>
                            <p className="text-gray-400 leading-relaxed text-lg">
                                Organize thoughts in 2D space. Position implies relationship. <br />
                                <span className="text-white">Proximity = Context.</span>
                            </p>
                        </div>

                        {/* Infinite Grid Visual */}
                        <div className="absolute inset-y-0 right-0 w-1/2 opacity-30 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none origin-right transform perspective-[1000px] rotate-y-[-30deg]">
                            <div className="w-full h-full border border-white/10 grid grid-cols-6 grid-rows-6 gap-[1px] bg-white/5">
                                {/* Floating Cards Mock */}
                                <div className="col-start-2 row-start-2 col-span-2 row-span-1 bg-white/10 rounded backdrop-blur animate-float-slow" />
                                <div className="col-start-4 row-start-3 col-span-1 row-span-2 bg-white/10 rounded backdrop-blur animate-float-slow" style={{ animationDelay: '2s' }} />
                            </div>
                        </div>
                    </div>
                </TiltCard>

            </div>

            {/* Bottom Floating CTA - Arrogant Style */}
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up delay-[600ms]">
                <button
                    onClick={() => window.location.href = '/gallery'}
                    className="group relative flex items-center gap-4 pl-8 pr-2 py-2.5 bg-[#050505] border border-white/10 rounded-full shadow-[0_0_60px_rgba(0,0,0,0.8)] hover:border-indigo-500/50 transition-all duration-300 hover:scale-105"
                >
                    <span className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors tracking-wide">
                        Join the <span className="text-indigo-400">1%</span> using recursive context.
                    </span>
                    <div className="px-6 py-3 bg-white text-black rounded-full text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all flex items-center gap-2">
                        Deploy
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </button>
            </div>

        </div>
    );
};

// 3D Tilt Card with Advanced Glare
const TiltCard = ({ children, className }) => {
    const ref = useRef(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Slightly stronger tilt for "Pro" feel
        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;

        setRotation({ x: rotateX, y: rotateY });
        setGlare({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: 1 });
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0 });
        setGlare(prev => ({ ...prev, opacity: 0 }));
    };

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`
                relative overflow-hidden transition-all duration-200 ease-out will-change-transform 
                bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/5 shadow-2xl
                hover:border-white/10 hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]
                ${className}
            `}
            style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1, 1, 1)`,
                transformStyle: 'preserve-3d'
            }}
        >
            {/* Dynamic Glare */}
            <div
                className="absolute inset-0 w-full h-full pointer-events-none z-50 mix-blend-overlay transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
                    opacity: glare.opacity
                }}
            />
            {/* Scanline Effect Overlay (Subtle Tech Vibe) */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />

            {children}
        </div>
    );
};

export default HeroSection;
