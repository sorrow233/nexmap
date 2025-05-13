import React, { useEffect, useRef } from 'react';

const S5_NeuralCore = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let frame, width, height;
        const nodes = Array.from({ length: 30 }, () => ({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 }));

        const resize = () => { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; };
        resize();
        window.addEventListener('resize', resize);

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                node.x += node.vx; node.y += node.vy;
                if (node.x < 0 || node.x > width) node.vx *= -1;
                if (node.y < 0 || node.y > height) node.vy *= -1;
                for (let j = i + 1; j < nodes.length; j++) {
                    const other = nodes[j];
                    const dist = Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2);
                    if (dist < 200) { ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(other.x, other.y); ctx.stroke(); }
                }
                ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(node.x, node.y, 3, 0, Math.PI * 2); ctx.fill();
            }
            frame = requestAnimationFrame(animate);
        };
        animate();
        return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
    }, []);

    return (
        <section className="h-screen w-full bg-[#050510] relative flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-0" />
            <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 mb-6 backdrop-blur-md">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" /><span className="text-blue-300 font-mono text-sm">GEMINI ENGINE ACTIVE</span>
                </div>
                <h2 className="text-6xl font-bold text-white mb-4">It Thinks With You</h2>
                <p className="text-blue-200/60 text-xl max-w-xl mx-auto">Context-aware AI that understands the connections between your ideas.</p>
            </div>
        </section>
    );
};
export default S5_NeuralCore;
