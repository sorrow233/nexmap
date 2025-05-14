import React, { useRef, useEffect } from 'react';

const S4_NeuralLace = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width, height;
        let time = 0;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        resize();
        window.addEventListener('resize', resize);

        const animate = () => {
            time += 0.01;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);

            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';

            const cols = 20;
            const rows = 15;
            const cellW = width / cols;
            const cellH = height / rows;

            for (let i = 0; i <= cols; i++) {
                for (let j = 0; j <= rows; j++) {
                    const x = i * cellW;
                    const y = j * cellH;

                    // Wave distortion
                    const distortX = Math.sin(time + y * 0.01 + x * 0.005) * 20;
                    const distortY = Math.cos(time + x * 0.01 + y * 0.005) * 20;

                    const finalX = x + distortX;
                    const finalY = y + distortY;

                    // Draw points
                    ctx.fillStyle = `rgba(100, 200, 255, ${Math.abs(Math.sin(time + x))})`;
                    ctx.beginPath();
                    ctx.arc(finalX, finalY, 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Connect grid (horizontal)
                    if (i < cols) {
                        ctx.beginPath();
                        ctx.moveTo(finalX, finalY);
                        const nextDistortX = Math.sin(time + y * 0.01 + ((i + 1) * cellW) * 0.005) * 20;
                        const nextX = (i + 1) * cellW + nextDistortX;
                        ctx.lineTo(nextX, finalY); // Simplified connection for performance
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        };
        animate();
        return () => window.removeEventListener('resize', resize);
    }, []);

    return (
        <section className="h-screen w-full bg-black relative flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-0" />
            <div className="relative z-10 pointer-events-none mix-blend-screen text-center">
                <h2 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 animate-pulse">
                    NEURAL LACE
                </h2>
            </div>
        </section>
    );
};
export default S4_NeuralLace;
