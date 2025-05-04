import React, { useRef, useState } from 'react';

const Concept8_MagneticField = () => {
    // A simplified version of magnetic effect using React state for a few dots
    // For a real production version we'd use canvas, but for rapid prototyping DOM nodes works well for "feel"
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const gridSize = 10;
    const dots = [];

    // We'll generate a grid of dots in the center area
    // Just a placeholder grid to avoid perf issues with too many DOM elements
    for (let i = 0; i < 100; i++) {
        dots.push(i);
    }

    return (
        <div onMouseMove={handleMouseMove} className="w-full h-full bg-black flex flex-wrap items-center justify-center content-center gap-8 overflow-hidden relative">
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(29, 78, 216, 0.15), transparent 40%)`
                }}
            ></div>

            <div className="max-w-4xl grid grid-cols-10 gap-4">
                {dots.map(i => (
                    <MagneticDot key={i} mousePos={mousePos} />
                ))}
            </div>

            <div className="absolute bottom-20 text-center pointer-events-none">
                <h1 className="text-4xl text-white font-light tracking-[1em] mb-4">MAGNETIC</h1>
                <p className="text-zinc-600 text-sm">Interaction defines structure.</p>
            </div>
        </div>
    );
};

const MagneticDot = ({ mousePos }) => {
    const ref = useRef(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    React.useEffect(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = mousePos.x - centerX;
        const dy = mousePos.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const maxDist = 200;

        if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            const moveX = (dx / dist) * force * 20; // Repel
            const moveY = (dy / dist) * force * 20;
            setPos({ x: -moveX, y: -moveY });
        } else {
            setPos({ x: 0, y: 0 });
        }
    }, [mousePos]);

    return (
        <div
            ref={ref}
            className="w-3 h-3 bg-white/30 rounded-full transition-transform duration-75 ease-out"
            style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        ></div>
    );
};

export default Concept8_MagneticField;
