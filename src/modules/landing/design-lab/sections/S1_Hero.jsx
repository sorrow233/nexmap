import React, { useRef, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

const S1_TheEye = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;
        let mouse = { x: width / 2, y: height / 2 };
        let particles = [];

        canvas.width = width;
        canvas.height = height;

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2;
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 30) + 1;
            }

            draw() {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }

            update() {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let maxDistance = 300; // Interaction radius
                let force = (maxDistance - distance) / maxDistance;
                let directionX = forceDirectionX * force * this.density;
                let directionY = forceDirectionY * force * this.density;

                if (distance < maxDistance) {
                    this.x -= directionX * 5; // Repel
                    this.y -= directionY * 5;
                } else {
                    if (this.x !== this.baseX) {
                        let dx = this.x - this.baseX;
                        this.x -= dx / 10;
                    }
                    if (this.y !== this.baseY) {
                        let dy = this.y - this.baseY;
                        this.y -= dy / 10;
                    }
                }
                this.draw();
            }
        }

        const init = () => {
            particles = [];
            // Create a dense grid of particles forming a circle/eye shape initially
            for (let i = 0; i < 2000; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)'; // Trails
            ctx.fillRect(0, 0, width, height);

            particles.forEach(p => p.update());
            requestAnimationFrame(animate);
        };

        const handleMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('resize', () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            init();
        });

        init();
        animate();

        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    return (
        <section className="h-screen w-full relative bg-black overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="absolute inset-0 z-0" />

            <div className="relative z-10 pointer-events-none mix-blend-exclusion text-center">
                <h1 className="text-[12vw] font-black tracking-tighter leading-none text-white opacity-90">
                    THE VOID
                </h1>
                <p className="text-xl tracking-[1em] text-white uppercase mt-4">
                    Stare Back
                </p>
            </div>

            {/* Grain Overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
                }}
            />
        </section>
    );
};

export default S1_TheEye;
