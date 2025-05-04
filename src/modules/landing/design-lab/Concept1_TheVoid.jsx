import React, { useEffect, useRef } from 'react';

const Concept1_TheVoid = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;

        // Settings
        const starCount = 400;
        const speed = 0.5;
        let stars = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initStars();
        };

        const initStars = () => {
            stars = [];
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    z: Math.random() * 2, // Depth
                    size: Math.random() * 1.5,
                    opacity: Math.random(),
                    speed: (Math.random() * 0.5 + 0.1) * speed
                });
            }
        };

        const draw = () => {
            ctx.fillStyle = '#000000'; // Deep void black
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            stars.forEach(star => {
                // Update
                star.y -= star.speed * (star.z + 1); // Parallax speed based on depth

                // Reset if off screen
                if (star.y < 0) {
                    star.y = canvas.height;
                    star.x = Math.random() * canvas.width;
                }

                // Draw
                const depthScale = (star.z + 1) / 3;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * depthScale})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * depthScale, 0, Math.PI * 2);
                ctx.fill();
            });

            // Add a central glow/nebula effect
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.8
            );
            gradient.addColorStop(0, 'rgba(20, 30, 60, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);


            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-0 z-0" />

            <div className="relative z-10 text-center px-4 mix-blend-screen">
                <div className="inline-block mb-4 px-3 py-1 border border-white/20 rounded-full text-xs uppercase tracking-[0.3em] text-white/60 animate-fade-in-up">
                    Experience The Infinite
                </div>
                <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-white mb-6 animate-float-slow filter blur-[0.5px]">
                    VOID
                </h1>
                <p className="max-w-md mx-auto text-white/50 text-lg md:text-xl font-light leading-relaxed mb-10">
                    Step into a workspace that has no boundaries. Where your ideas float freely and connect instantly.
                </p>

                <button className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-none transition-all duration-500 overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                    <span className="relative z-10 text-sm tracking-[0.2em] font-medium text-white group-hover:text-white">ENTER SYSTEM</span>
                </button>
            </div>

            {/* Overlay Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-80 z-20"></div>
        </div>
    );
};

export default Concept1_TheVoid;
