import React, { useMemo, useRef, useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Link, LayoutGrid } from 'lucide-react';

const DemoInfinite = () => {
    const containerRef = useRef(null);
    const [localProgress, setLocalProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            // Calculate progress: 0 when top touches top, 1 when bottom touches bottom (scrolled past)
            // Actually for sticky:
            // The container is 200vh. The content is 100vh.
            // Progress = (How far top is pushed up) / (Available scroll distance)
            // rect.top goes from 0 to -(height - viewportHeight)

            const viewportHeight = window.innerHeight;
            const totalScrollDistance = rect.height - viewportHeight;

            if (totalScrollDistance <= 0) return;

            // rect.top is position of container top relative to viewport top
            // 1. Approach Phase: rect.top enters from bottom (viewportHeight) -> 0
            // 2. Sticky Phase: rect.top stays at 0 (or close) for a long time
            // 3. Exit Phase: rect.top goes negative

            // We want to map the WHOLE lifecycle.
            // But 'localProgress' as implemented was: 0 when rect.top = 0, 1 when rect.top = -totalScrollDistance
            // This means during approach, localProgress was 0.

            // Fix: We manually handle "entrance" animation using rect.top directly.
            const distFromTop = rect.top;
            const entered = distFromTop < viewportHeight;
            const left = distFromTop < -totalScrollDistance;

            // Main scroll progress (0 to 1) for the sticky internal animation
            const scrolled = -rect.top;
            const p = Math.max(0, Math.min(1, scrolled / totalScrollDistance));
            setLocalProgress(p);

            // Calculate entrance progress (0 when just entered, 1 when at top)
            // Used for fading in
            if (containerRef.current) {
                const entrance = 1 - Math.max(0, Math.min(1, distFromTop / (viewportHeight * 0.5))); // Animate over last 50% of viewport
                containerRef.current.style.setProperty('--entrance-opacity', entrance);
                containerRef.current.style.setProperty('--entrance-scale', 0.8 + (0.2 * entrance));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Init
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Animation Phases:

    // Animation Phases:
    // 0.0 - 0.2: Fade In (Chaos state)
    // 0.2 - 0.8: Sorting (Move from random positions to grid)
    // 0.8 - 1.0: Organized state fully stable + Zoom out slightly

    // Generate random positions (seeded-ish by index) to avoid re-calc on every render
    const ITEMS = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        // Random start positions (spread out)
        x: (i % 2 === 0 ? 1 : -1) * (200 + Math.random() * 600),
        y: (i % 3 === 0 ? 1 : -1) * (100 + Math.random() * 400),
        rotate: (Math.random() - 0.5) * 60,
        // Target grid positions (centered)
        targetX: ((i % 4) - 1.5) * 220, // 4 columns
        targetY: (Math.floor(i / 4) - 1) * 280, // 3 rows
        type: i % 4 === 0 ? 'image' : i % 3 === 0 ? 'link' : 'note',
        color: ['from-rose-500/20 to-rose-600/20', 'from-indigo-500/20 to-indigo-600/20', 'from-amber-500/20 to-amber-600/20', 'from-emerald-500/20 to-emerald-600/20'][i % 4],
        iconColor: ['text-rose-400', 'text-indigo-400', 'text-amber-400', 'text-emerald-400'][i % 4]
    })), []);

    // Interpolation Function
    const sortProgress = Math.min(1, Math.max(0, (localProgress - 0.2) / 0.6));
    const easedSort = sortProgress < 0.5 ? 2 * sortProgress * sortProgress : -1 + (4 - 2 * sortProgress) * sortProgress;

    const scale = localProgress > 0.8 ? 1 - (localProgress - 0.8) * 0.5 : 1;
    return (
        <div ref={containerRef} className="h-[200vh] relative">
            <div
                className="sticky top-0 w-full h-screen flex items-center justify-center relative perspective-[1000px] overflow-hidden bg-[#050505]"
                style={{
                    opacity: 'var(--entrance-opacity, 0)',
                    transform: 'scale(var(--entrance-scale, 0.8))',
                    transition: 'opacity 0.1s linear, transform 0.1s linear'
                }}
            >
                {/* Background Grain/Gradient */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505] opacity-50" />
                </div>

                {/* Title - Behind cards but visible */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-0 transition-all duration-700 blur-[100px] opacity-20 pointer-events-none"
                >
                    <div className="w-[800px] h-[400px] bg-indigo-500 rounded-full" />
                </div>

                <div
                    className="absolute top-32 left-0 right-0 text-center z-10 transition-all duration-700"
                    style={{
                        opacity: localProgress < 0.9 ? 1 : 0,
                        transform: `translateY(${localProgress < 0.5 ? 0 : -30}px)`
                    }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-white/50 text-xs font-medium uppercase tracking-wider mb-6 backdrop-blur-md">
                        <LayoutGrid size={12} />
                        <span>Entropy Reduction</span>
                    </div>
                    <h2 className="text-6xl md:text-8xl font-bold text-white tracking-tighter mb-2">
                        {sortProgress < 0.5 ? (
                            <span className="opacity-80 blur-[1px]">Chaos.</span>
                        ) : (
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-500">Structure.</span>
                        )}
                    </h2>
                </div>

                {/* The Container for Cards */}
                <div
                    className="relative w-full h-full flex items-center justify-center will-change-transform z-20"
                    style={{ transform: `scale(${0.8 * scale})` }}
                >
                    {ITEMS.map((item) => {
                        const currentX = item.x + (item.targetX - item.x) * easedSort;
                        const currentY = item.y + (item.targetY - item.y) * easedSort;
                        const currentRot = item.rotate * (1 - easedSort); // Rotate to 0

                        // Add subtle floating motion when in Chaos mode
                        const floatDelay = item.id * 0.5;

                        return (
                            <div
                                key={item.id}
                                className={`absolute w-56 h-72 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 transition-all duration-500
                                ${sortProgress > 0.9 ? 'shadow-[0_0_50px_rgba(255,255,255,0.03)] border-white/20' : 'shadow-xl'}`}
                                style={{
                                    transform: `translate(${currentX}px, ${currentY}px) rotate(${currentRot}deg)`,
                                    zIndex: Math.floor(Math.random() * 10) // Random z-index for layering in chaos
                                }}
                            >
                                {/* Glass Reflection Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl pointer-events-none" />

                                {/* Card Content Skeleton */}
                                <div className="flex items-center justify-between mb-1 relative z-10">
                                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center border border-white/5`}>
                                        {item.type === 'image' && <ImageIcon size={18} className={item.iconColor} />}
                                        {item.type === 'link' && <Link size={18} className={item.iconColor} />}
                                        {item.type === 'note' && <FileText size={18} className={item.iconColor} />}
                                    </div>
                                    <div className="h-1.5 w-8 bg-white/10 rounded-full" />
                                </div>

                                <div className="h-3 w-3/4 bg-white/10 rounded-full mb-2" />
                                <div className="space-y-3 opacity-40 flex-1">
                                    <div className="h-1.5 w-full bg-white/10 rounded-full" />
                                    <div className="h-1.5 w-5/6 bg-white/10 rounded-full" />
                                    <div className="h-1.5 w-4/6 bg-white/10 rounded-full" />
                                </div>

                                {/* Image Placeholder */}
                                {item.type === 'image' && (
                                    <div className="mt-auto h-28 w-full bg-black/20 rounded-xl border border-white/5 overflow-hidden relative group-hover:border-white/10 transition-colors">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent" />
                                        {/* Mock Image Content */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}


                    {/* Connection Lines (Fade in only when organized) using CSS borders */}
                    <div
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                        style={{ opacity: easedSort > 0.8 ? (easedSort - 0.8) * 5 : 0 }}
                    >
                        {/* Vertical Lines */}
                        <div className="absolute top-1/2 left-1/2 w-px h-[800px] bg-white/5 -translate-y-1/2 -translate-x-[220px]" />
                        <div className="absolute top-1/2 left-1/2 w-px h-[800px] bg-white/5 -translate-y-1/2" />
                        <div className="absolute top-1/2 left-1/2 w-px h-[800px] bg-white/5 -translate-y-1/2 translate-x-[220px]" />

                        {/* Horizontal Lines */}
                        <div className="absolute top-1/2 left-1/2 h-px w-[800px] bg-white/5 -translate-x-1/2 -translate-y-[280px]" />
                        <div className="absolute top-1/2 left-1/2 h-px w-[800px] bg-white/5 -translate-x-1/2" />
                        <div className="absolute top-1/2 left-1/2 h-px w-[800px] bg-white/5 -translate-x-1/2 translate-y-[280px]" />
                    </div>

                </div>

                <style>{`
                 @keyframes float-subtle {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(2deg); }
                }
            `}</style>
            </div>
        </div>
    );
};

export default DemoInfinite;
