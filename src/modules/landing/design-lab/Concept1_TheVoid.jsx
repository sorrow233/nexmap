import React, { useEffect, useRef, useState } from 'react';

const Concept1_Genesis = () => {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState(0); // 0: spark, 1: branch, 2: connections

    useEffect(() => {
        const timeline = [
            { phase: 0, delay: 500 },
            { phase: 1, delay: 2000 },
            { phase: 2, delay: 3500 }
        ];

        timeline.forEach(({ phase: p, delay }) => {
            setTimeout(() => setPhase(p), delay);
        });
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let frame;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Nodes
        const nodes = [
            { x: canvas.width / 2, y: canvas.height / 2, radius: 0, targetRadius: 20, label: 'Idea', born: 0, color: '#3b82f6' }
        ];

        const connections = [];

        // Spawn child nodes when phase 1
        let branched = false;
        let connected = false;

        const animate = (time) => {
            ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Phase 1: Branch
            if (phase >= 1 && !branched) {
                branched = true;
                const angles = [-45, 0, 45];
                angles.forEach((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const distance = 200;
                    nodes.push({
                        x: nodes[0].x + Math.cos(rad) * distance,
                        y: nodes[0].y + Math.sin(rad) * distance,
                        radius: 0,
                        targetRadius: 15,
                        label: ['Context', 'Insight', 'Action'][i],
                        born: time,
                        color: ['#8b5cf6', '#10b981', '#f59e0b'][i]
                    });
                });
            }

            // Phase 2: Connect
            if (phase >= 2 && !connected && nodes.length > 1) {
                connected = true;
                for (let i = 1; i < nodes.length; i++) {
                    connections.push({ from: 0, to: i, progress: 0 });
                    if (i > 1) connections.push({ from: i - 1, to: i, progress: 0 });
                }
            }

            // Draw connections
            connections.forEach(conn => {
                conn.progress = Math.min(1, conn.progress + 0.02);
                const from = nodes[conn.from];
                const to = nodes[conn.to];
                const x = from.x + (to.x - from.x) * conn.progress;
                const y = from.y + (to.y - from.y) * conn.progress;

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(x, y);
                ctx.stroke();

                //  Pulse on line
                if (conn.progress === 1) {
                    const pulseX = from.x + (to.x - from.x) * ((time / 1000) % 1);
                    const pulseY = from.y + (to.y - from.y) * ((time / 1000) % 1);
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
                    ctx.beginPath();
                    ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Draw nodes
            nodes.forEach((node, i) => {
                // Grow
                if (node.radius < node.targetRadius) {
                    node.radius += 0.5;
                }

                // Glow
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 2);
                gradient.addColorStop(0, node.color + '80');
                gradient.addColorStop(1, node.color + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * 2, 0, Math.PI * 2);
                ctx.fill();

                // Core
                ctx.fillStyle = node.color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fill();

                // Label
                if (node.radius >= node.targetRadius * 0.8) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 14px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(node.label, node.x, node.y + node.radius + 25);
                }
            });

            frame = requestAnimationFrame(animate);
        };

        animate(0);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', resize);
        };
    }, [phase]);

    return (
        <div className="relative w-full h-full bg-[#050505] overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0" />

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className={`text-center transition-all duration-1000 ${phase >= 1 ? 'opacity-0 -translate-y-10' : 'opacity-100'}`}>
                    <h1 className="text-6xl font-bold text-white mb-4">The Spark</h1>
                    <p className="text-white/60 text-xl">It starts with one thought...</p>
                </div>

                {phase >= 2 && (
                    <div className="absolute bottom-20 text-center animate-fade-in">
                        <p className="text-white/80 text-2xl font-light">...and grows into a universe of ideas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Concept1_Genesis;
