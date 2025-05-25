import React, { useRef, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

const S1_Hero = () => {
    const canvasRef = useRef(null);
    const [props, api] = useSpring(() => ({ opacity: 1, scale: 1 }));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width, height;
        let stars = [];

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initStars();
        };

        const initStars = () => {
            stars = [];
            for (let i = 0; i < 400; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z: Math.random() * 2,
                    size: Math.random() * 1.5,
                    opacity: Math.random()
                });
            }
        };

        const animate = () => {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, width, height);
            stars.forEach(star => {
                star.y -= star.z * 0.2;
                if (star.y < 0) star.y = height;
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();
        return () => window.removeEventListener('resize', resize);
    }, []);

    return (
        <section className="h-screen w-full relative overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-0 z-0" />
            <animated.div style={props} className="relative z-10 text-center p-8">
                <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-600">The Void</h1>
                <p className="text-xl md:text-3xl text-gray-400 font-light max-w-2xl mx-auto">The mind is not a list.<br />It is a universe.</p>
                <div className="mt-12 animate-bounce"><span className="text-white/30 text-sm tracking-widest uppercase">Scroll to Enter</span></div>
            </animated.div>
        </section>
    );
};
export default S1_Hero;
