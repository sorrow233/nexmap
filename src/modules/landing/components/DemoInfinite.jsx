import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useSprings, animated, to } from '@react-spring/web';
import { FileText, Image as ImageIcon, Link, Database, BrainCircuit, Globe, LayoutGrid } from 'lucide-react';

const CARD_COUNT = 16;

const DemoInfinite = () => {
    const containerRef = useRef(null);
    const [progress, setProgress] = useState(0);

    // --- SCROLL LOGIC ---
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const vh = window.innerHeight;

            // We want a long scroll interaction. 
            // Start: Top of element is at 80% viewport (enters focus)
            // End: Top of element is at -20% viewport (leaves upwards)
            const start = vh * 0.8;
            const end = -rect.height * 0.2;

            let p = (start - rect.top) / (start - end);
            p = Math.min(1, Math.max(0, p));
            setProgress(p);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- DATA GENERATION ---
    const items = useMemo(() => {
        return Array.from({ length: CARD_COUNT }).map((_, i) => {
            // Chaos/Random Positions (Spread widely in 3D space)
            const x = (Math.random() - 0.5) * 1200; // Wide horizontal spread
            const y = (Math.random() - 0.5) * 800;  // Vertical spread
            const z = (Math.random() - 0.5) * 500;  // Depth spread
            const rotC = (Math.random() - 0.5) * 120; // Chaos rotation

            // Order/Grid Positions
            const col = i % 4;
            const row = Math.floor(i / 4);
            const gx = (col - 1.5) * 220;
            const gy = (row - 1.5) * 140;

            // Type & Colors
            const types = ['note', 'image', 'link', 'data'];
            const type = types[i % 4];
            const colors = [
                'from-rose-500/20 to-rose-900/40 border-rose-500/30',
                'from-blue-500/20 to-blue-900/40 border-blue-500/30',
                'from-emerald-500/20 to-emerald-900/40 border-emerald-500/30',
                'from-amber-500/20 to-amber-900/40 border-amber-500/30'
            ];

            return { id: i, chaos: { x, y, z, rot: rotC }, order: { x: gx, y: gy, z: 0, rot: 0 }, type, colorClass: colors[i % 4] };
        });
    }, []);

    // --- ANIMATION SPRINGS ---
    // We map 'progress' (0-1) to spring values.
    // React-spring handles the interpolation, but we update the destination based on progress.
    // Phase 1 (0.0 - 0.3): Chaos drifting (handled by random noise or just initial state)
    // Phase 2 (0.3 - 0.8): The "Snap" to order.

    // Smooth step function for the transition
    const smoothProgress = Math.min(1, Math.max(0, (progress - 0.2) / 0.6)); // Active between 0.2 and 0.8
    // Easing: easeInOutCubic
    const t = smoothProgress < .5 ? 4 * smoothProgress * smoothProgress * smoothProgress : 1 - Math.pow(-2 * smoothProgress + 2, 3) / 2;

    const [springs] = useSprings(CARD_COUNT, (i) => {
        const item = items[i];
        return {
            x: item.chaos.x + (item.order.x - item.chaos.x) * t,
            y: item.chaos.y + (item.order.y - item.chaos.y) * t,
            z: item.chaos.z + (item.order.z - item.chaos.z) * t,
            rot: item.chaos.rot + (item.order.rot - item.chaos.rot) * t,
            opacity: 1, // Always visible
            scale: 1,
            immediate: false, // animate
            config: { mass: 1, tension: 120, friction: 20 } // Physics feel
        };
    }, [t]); // Update when t changes

    return (
        <div ref={containerRef} className="relative w-full h-[250vh] bg-[#050505]">

            {/* STICKY STAGE */}
            <div className="sticky top-0 w-full h-screen flex flex-col items-center justify-center overflow-hidden perspective-[1200px]">

                {/* BACKGROUND FIELD */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${t > 0.5 ? 'opacity-30' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
                </div>

                {/* TEXT LAYER */}
                <div className="absolute top-24 z-50 text-center mix-blend-screen pointer-events-none">
                    <h2
                        className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 transition-all duration-700"
                        style={{
                            transform: `translateY(${t < 0.5 ? 0 : -100}px) scale(${1 - t * 0.2})`,
                            opacity: 1 - t * 0.5
                        }}
                    >
                        Chaos.
                    </h2>
                    <h2
                        className="absolute top-0 left-0 right-0 text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-purple-400 transition-all duration-700"
                        style={{
                            transform: `translateY(${t < 0.5 ? 100 : 0}px) scale(${1 + t * 0.1})`,
                            filter: `blur(${(1 - t) * 20}px)`,
                            opacity: t
                        }}
                    >
                        Clarity.
                    </h2>
                </div>

                {/* 3D SCENE */}
                <div className="relative w-[1000px] h-[800px] [transform-style:preserve-3d]">
                    {springs.map(({ x, y, z, rot, scale, opacity }, i) => {
                        const item = items[i];
                        return (
                            <animated.div
                                key={i}
                                className={`absolute w-[200px] h-[120px] rounded-xl border backdrop-blur-md shadow-2xl bg-gradient-to-br ${item.colorClass} flex flex-col p-4 overflow-hidden`}
                                style={{
                                    transform: to([x, y, z, rot, scale], (x, y, z, r, s) =>
                                        `translate3d(${x}px,${y}px,${z}px) rotateX(${r * 0.5}deg) rotateY(${r * 0.5}deg) rotateZ(${r}deg) scale(${s})`
                                    ),
                                    opacity
                                }}
                            >
                                {/* CARD CONTENT SKELETON */}
                                <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-2">
                                    <div className="p-1.5 rounded-md bg-white/10">
                                        {item.type === 'note' && <FileText size={14} className="text-rose-300" />}
                                        {item.type === 'image' && <ImageIcon size={14} className="text-blue-300" />}
                                        {item.type === 'link' && <Link size={14} className="text-emerald-300" />}
                                        {item.type === 'data' && <Database size={14} className="text-amber-300" />}
                                    </div>
                                    <div className="h-2 w-16 bg-white/20 rounded-full" />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-2 w-full bg-white/10 rounded-full" />
                                    <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                                    {item.type === 'image' && (
                                        <div className="mt-2 h-10 w-full bg-black/20 rounded-md border border-white/5" />
                                    )}
                                </div>
                            </animated.div>
                        );
                    })}

                    {/* CONNECTION LINES (SVG) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-[-1]">
                        {/* Only show lines when ordered (t > 0.8) */}
                        <g style={{ opacity: Math.max(0, (t - 0.7) * 3), transition: 'opacity 0.5s ease' }}>
                            {items.map((item, i) => {
                                // Draw lines to center or neighbors
                                if (i % 4 === 0) return null; // Skip some to form clusters
                                const startX = item.order.x + 100 + 500; // Center offset
                                const startY = item.order.y + 60 + 400;
                                const endX = items[i - 1].order.x + 100 + 500;
                                const endY = items[i - 1].order.y + 60 + 400;
                                return (
                                    <path
                                        key={`line-${i}`}
                                        d={`M ${startX} ${startY} L ${endX} ${endY}`}
                                        stroke="rgba(255,255,255,0.15)"
                                        strokeWidth="2"
                                        strokeDasharray="4 4"
                                    />
                                );
                            })}
                        </g>
                    </svg>

                </div>

            </div>
        </div>
    );
};

export default DemoInfinite;
