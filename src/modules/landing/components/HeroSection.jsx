import React, { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

const HeroSection = ({ onStart }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // --- Neural Engine Canvas Animation ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Configuration
        const particleCount = 120; // High density but performant
        const connectionDistance = 180;
        const mouseDistance = 300;
        const particles = [];
        let time = 0;

        let mouse = { x: -1000, y: -1000 };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
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
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 1;
                this.color = `rgba(59, 130, 246, ${Math.random() * 0.5 + 0.2})`; // Blueish
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

                // Mouse repulsion/attraction swirl
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouseDistance) {
                    const force = (mouseDistance - dist) / mouseDistance;
                    // Gentle push 
                    this.vx -= dx * force * 0.0005;
                    this.vy -= dy * force * 0.0005;
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        // Initialize
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time++;

            // Update and Draw Particles
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Draw Connections
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)'; // Connection color
            ctx.lineWidth = 1;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        // Control point for curve? No, straight lines are faster and look "structural"
                        ctx.lineTo(particles[j].x, particles[j].y);
                        // Opacity based on distance
                        ctx.globalAlpha = 1 - (dist / connectionDistance);
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                    }
                }
            }

            // Draw "Neural Pulses" (Random signal travel)
            if (time % 5 === 0) {
                // Potentially add pulse logic here for "data flow"
                // Simplified: Just flash connections randomly? 
                // Or draw a few brighter connections
                const p1 = particles[Math.floor(Math.random() * particleCount)];
                const p2 = particles[Math.floor(Math.random() * particleCount)];
                // If close enough, draw a "zap"
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < connectionDistance * 2) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
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

    return (
        <div ref={containerRef} className="relative h-screen flex flex-col items-center justify-center overflow-hidden bg-black text-white perspective-[1000px]">

            {/* 1. NEURAL ENGINE CANVAS BACKGROUND */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-0 opacity-60"
            />

            {/* Gradient Overlay for Depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black pointer-events-none z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)] pointer-events-none z-0" />

            {/* 2. HERO CONTENT */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center will-change-transform">

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-8 animate-fade-in-up md:mb-12">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                    <span className="text-xs font-mono text-blue-300 tracking-widest uppercase">System Online</span>
                </div>

                {/* Massive Headline */}
                <div className="relative mb-8 md:mb-12">
                    <h1 className="text-7xl md:text-9xl lg:text-[11rem] leading-[0.85] font-bold tracking-tighter font-inter-tight mix-blend-overlay text-white opacity-90 animate-fade-in-up delay-100">
                        ULTIMATE
                    </h1>
                    <h1 className="text-7xl md:text-9xl lg:text-[11rem] leading-[0.85] font-bold tracking-tighter font-inter-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 animate-fade-in-up delay-200">
                        ENGINE
                    </h1>
                </div>

                {/* Narrative Copy */}
                <p className="max-w-2xl mx-auto text-lg md:text-2xl text-gray-400 font-light leading-relaxed mb-12 animate-fade-in-up delay-[300ms]">
                    Recursive context walking. <span className="text-white font-medium">Uncapped concurrency.</span><br />
                    The operating system for your ideas.
                </p>

                {/* Primary CTA */}
                <div className="flex flex-col md:flex-row gap-6 justify-center items-center animate-fade-in-up delay-[400ms]">
                    <button
                        onClick={() => window.location.href = '/gallery'}
                        className="group relative px-12 py-5 bg-white text-black rounded-full text-xl font-bold tracking-tight overflow-hidden hover:scale-105 transition-transform duration-300"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Initialize v2.0
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {/* Button Glow Effect */}
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={onStart}
                        className="text-gray-500 hover:text-white transition-colors font-mono text-sm uppercase tracking-widest"
                    >
                        [ SCROLL TO EXPLORE ]
                    </button>
                </div>
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none" />
        </div>
    );
};

export default HeroSection;
