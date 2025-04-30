import React, { useEffect, useRef, useState } from 'react';
import { Image, History, Download, Layers, MousePointer2 } from 'lucide-react';

const HeroSection = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // --- 1. NEURAL PARTICLE ENGINE (Restored & Tuned for "Pro" feel) ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Config - Subtler, "Data Stream" feel
        const particleCount = 100;
        const connectionDistance = 150;
        const mouseDistance = 400;
        const particles = [];
        let time = 0;
        let mouse = { x: -1000, y: -1000 };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // High DPI support
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
                this.vx = (Math.random() - 0.5) * 0.2; // Slower, more stable
                this.vy = (Math.random() - 0.5) * 0.2;
                this.size = Math.random() * 1.5 + 0.5;
                // Deep Blue/Purple for "Pro" tech feel
                this.baseAlpha = Math.random() * 0.3 + 0.1;
                this.color = `rgba(100, 150, 255, ${this.baseAlpha})`;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > window.innerWidth) this.vx *= -1;
                if (this.y < 0 || this.y > window.innerHeight) this.vy *= -1;

                // Mouse interaction - Intelligence Swarm
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouseDistance) {
                    const force = (mouseDistance - dist) / mouseDistance;
                    this.vx += dx * force * 0.0002; // Very gentle attraction
                    this.vy += dy * force * 0.0002;
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
            time++;

            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Connections
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        // Subtle curved connections for organic feel could be nice, but straight is faster for 100+ nodes
                        ctx.lineTo(particles[j].x, particles[j].y);
                        const alpha = (1 - dist / connectionDistance) * 0.15;
                        ctx.strokeStyle = `rgba(100, 150, 255, ${alpha})`;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);


    // --- 2. RENDER ---
    return (
        <div ref={containerRef} className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-sans selection:bg-blue-500/30">

            {/* Inline Styles for critical animations to ensure they exist */}
            <style>{`
                @keyframes float-medium {
                    0%, 100% { transform: translateY(0px) rotate(6deg); }
                    50% { transform: translateY(-10px) rotate(6deg); }
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px) rotate(-3deg); }
                    50% { transform: translateY(-15px) rotate(-3deg); }
                }
                 @keyframes float-cursor {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(10px, -10px); }
                }
                .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
                .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
                .animate-float-cursor { animation: float-cursor 4s ease-in-out infinite; }
                
                .glass-card {
                    background: rgba(20, 20, 20, 0.6);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
                }
            `}</style>

            {/* BACKGROUND LAYER */}
            <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-50 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030303]/50 to-[#030303] pointer-events-none z-0" />
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />


            {/* HEADER */}
            <div className="flex flex-col items-center text-center max-w-5xl mx-auto mb-20 relative z-10 animate-fade-in-up">
                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-blue-200/80 font-medium">Enterprise Ready</span>
                </div>

                <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-8 leading-[0.9] mix-blend-screen text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50">
                    Built for <br /><span className="text-blue-500 inline-block filter drop-shadow-[0_0_40px_rgba(59,130,246,0.2)]">Power Users</span>.
                </h1>
                <p className="text-lg md:text-2xl text-gray-400 font-light max-w-2xl leading-relaxed">
                    We stripped away the clutter so you can focus on the <span className="text-white font-medium border-b border-blue-500/30">flow</span>.
                </p>
            </div>

            {/* BENTO GRID */}
            <div className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 perspective-[2000px]">

                {/* Feature 1: Multimedia (Tall Card) */}
                <TiltCard className="md:row-span-2 glass-card group overflow-hidden">
                    <div className="h-full flex flex-col relative z-20 p-8">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform duration-500">
                            <Image className="w-6 h-6 text-purple-300" />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Multimedia First</h3>
                        <p className="text-gray-400 text-base leading-relaxed max-w-xs">
                            High-fidelity support for images, Markdown, and soon video. Your canvas is a rich media surface.
                        </p>

                        {/* Interactive Visual */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute right-[-10%] bottom-[-10%] w-full h-full opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                                {/* Mock Images */}
                                <div className="absolute top-[45%] right-[5%] w-60 h-40 bg-[#151515] shadow-2xl border border-white/10 rounded-lg p-1.5 animate-float-medium group-hover:shadow-[0_0_30px_rgba(100,100,255,0.1)] transition-shadow">
                                    <div className="w-full h-full bg-[#202020] rounded relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/10" />
                                        <div className="absolute bottom-3 left-3 w-12 h-1.5 bg-white/20 rounded-full" />
                                    </div>
                                </div>
                                <div className="absolute top-[65%] right-[35%] w-48 h-48 bg-[#151515] shadow-2xl border border-white/10 rounded-lg p-1.5 animate-float-slow transition-transform hover:scale-105" style={{ animationDelay: '1s' }}>
                                    <div className="w-full h-full bg-[#202020] rounded flex items-center justify-center text-gray-700">
                                        <span className="text-5xl font-serif italic text-white/5">Aa</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TiltCard>

                {/* Feature 2: History (1x1) */}
                <TiltCard className="glass-card text-white relative overflow-hidden group min-h-[320px] p-8">
                    <div className="h-full flex flex-col justify-between relative z-10">
                        <div className="w-12 h-12 bg-emerald-900/20 rounded-full flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors duration-500">
                            <History className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-2 tracking-tight">Infinite Undo</h3>
                            <p className="text-gray-400 text-sm">Travel back in time through every single change.</p>
                        </div>
                    </div>
                    {/* Background visual */}
                    <div className="absolute -top-6 -right-6 text-white/5 font-mono text-[10rem] font-bold -rotate-12 select-none group-hover:text-white/10 transition-colors duration-500 group-hover:scale-110">
                        Z
                    </div>
                </TiltCard>

                {/* Feature 3: Export (1x1) */}
                <TiltCard className="glass-card text-white group min-h-[320px] p-8">
                    <div className="h-full flex flex-col justify-between relative z-10">
                        <div className="w-12 h-12 bg-blue-900/20 rounded-full flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors duration-500">
                            <Download className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-2 tracking-tight">4K Export</h3>
                            <p className="text-gray-400 text-sm">Share your mind in crystal clear resolution.</p>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </TiltCard>

                {/* Feature 4: Collaboration (2x1 wide) */}
                <TiltCard className="md:col-span-2 glass-card group overflow-hidden min-h-[300px] p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between h-full relative z-10">
                        <div className="mb-8 md:mb-0 max-w-md relative z-20">
                            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                                <Layers className="w-3 h-3" />
                                <span>Coming Soon</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Realtime Sync</h3>
                            <p className="text-gray-400 leading-relaxed">Multiplayer mode for true collective intelligence. Co-create on the same infinite canvas.</p>
                        </div>

                        {/* Visual Cursors */}
                        <div className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="absolute top-[20%] left-[55%] animate-float-cursor" style={{ animationDuration: '4s' }}>
                                <MousePointer2 className="w-6 h-6 text-blue-500 fill-blue-500 drop-shadow-[0_2px_10px_rgba(59,130,246,0.5)]" />
                                <span className="absolute left-5 top-4 bg-blue-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">Alex</span>
                            </div>
                            <div className="absolute bottom-[30%] right-[15%] animate-float-cursor" style={{ animationDuration: '5s', animationDelay: '1s' }}>
                                <MousePointer2 className="w-6 h-6 text-pink-500 fill-pink-500 drop-shadow-[0_2px_10px_rgba(236,72,153,0.5)]" />
                                <span className="absolute left-5 top-4 bg-pink-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">Sarah</span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-green-500/5 pointer-events-none" />
                </TiltCard>

            </div>

            {/* Bottom Floating CTA */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up delay-[600ms]">
                <button
                    onClick={() => window.location.href = '/gallery'}
                    className="group relative flex items-center gap-4 pl-6 pr-2 py-2 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all duration-300 hover:scale-105"
                >
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Start thinking unlimited</span>
                    <div className="px-5 py-2.5 bg-white text-black rounded-full text-sm font-bold shadow-lg group-hover:shadow-white/20 transition-all">
                        Launch Beta
                    </div>
                </button>
            </div>

        </div>
    );
};

// 3D Tilt Card Component with Glare
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

        // Calculate rotation (max 10 degrees)
        const rotateX = ((y - centerY) / centerY) * -4;
        const rotateY = ((x - centerX) / centerX) * 4;

        // Calculate glare position
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;

        setRotation({ x: rotateX, y: rotateY });
        setGlare({ x: glareX, y: glareY, opacity: 1 });
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
            className={`relative transition-all duration-200 ease-out will-change-transform ${className}`}
            style={{
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1, 1, 1)`,
            }}
        >
            {/* Glare Effect */}
            <div
                className="absolute inset-0 w-full h-full pointer-events-none z-50 mix-blend-overlay rounded-3xl transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.3) 0%, transparent 80%)`,
                    opacity: glare.opacity
                }}
            />
            {children}
        </div>
    );
};

export default HeroSection;
