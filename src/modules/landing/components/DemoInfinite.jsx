import React, { useMemo, useRef, useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Link, File } from 'lucide-react';

const DemoInfinite = () => {
    const containerRef = useRef(null);
    const [localProgress, setLocalProgress] = useState(0);

    // --- Self-contained Scroll Logic ---
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const elementHeight = rect.height;

            // Simplified Progress Logic for "Bottom of Page" scenario:
            // We want the animation to complete when the element is significantly visible.
            // Old logic: p = (viewportHeight - rect.top) / (viewportHeight + elementHeight)
            // This requires the element to scroll *past* the viewport.
            // If it's the last element, we might not be able to scroll past it if the footer isn't huge.

            // New logic:
            // 0 -> Top of element enters viewport
            // 1 -> Top of element hits top of viewport (or slightly before/after)

            const totalDistance = viewportHeight + elementHeight;
            const distanceTravelled = viewportHeight - rect.top;

            // Accelerate progress. 
            // Let's make it complete when the element is mostly centered or fully in view.
            // If rect.top <= 0, it means the top is at or above viewport top.
            // If rect.top <= viewportHeight * 0.2, it's 80% up the screen.

            // Let's calculate a "visible percentage" or simpler linear map.
            // Map:
            // 0% -> Element Top enters bottom (rect.top = vh)
            // 100% -> Element Top reaches 20% from top (rect.top = vh * 0.2)

            const startPoint = viewportHeight; // Progress 0
            const endPoint = viewportHeight * 0.2; // Progress 1

            let p = (startPoint - rect.top) / (startPoint - endPoint);

            // Clamp to 0-1
            p = Math.min(1, Math.max(0, p));
            setLocalProgress(p);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Animation Phases:
    // 0.0 - 0.2: Fade In (Chaos state)
    // 0.2 - 0.9: Sorting (Move from random positions to grid)
    // 0.9 - 1.0: Organized state fully stable

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
        color: ['bg-rose-500', 'bg-blue-500', 'bg-amber-500', 'bg-emerald-500'][i % 4]
    })), []);

    // Normalize progress for the specific "Sort" phase
    // We want sorting to finish well before the end of the scroll if possible
    const effectiveProgress = Math.max(0, localProgress - 0.2) * 1.25;
    const sortProgress = Math.min(1, Math.max(0, effectiveProgress));

    // Ease in-out
    const easedSort = sortProgress < 0.5 ? 2 * sortProgress * sortProgress : -1 + (4 - 2 * sortProgress) * sortProgress;

    const scale = localProgress > 0.8 ? 1 - (localProgress - 0.8) * 0.5 : 1;
    const opacity = 1; // Always visible if mounted, fade handled by parents if needed

    return (
        <div
            ref={containerRef}
            className="w-full min-h-[150vh] flex items-center justify-center relative perspective-[1000px] overflow-hidden bg-[#050505]"
        >
            <div className="fixed inset-0 pointer-events-none">
                {/* Optional: Add debug or background if specific to this module */}
            </div>

            {/* Sticky Content Wrapper: Stays centered while we scroll through the 150vh container */}
            <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">

                {/* Title */}
                <div
                    className="absolute top-24 left-0 right-0 text-center z-40 transition-all duration-500"
                    style={{
                        opacity: localProgress > 0.1 ? 1 : 0,
                        transform: `translateY(${localProgress < 0.5 ? 0 : -50}px)`
                    }}
                >
                    <div className="inline-block px-3 py-1 bg-white/5 rounded-full border border-white/10 text-white/60 text-sm mb-4">
                        Infinite Canvas
                    </div>
                    <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter">
                        {sortProgress < 0.5 ? "Embrace the Chaos." : "Find the Order."}
                    </h2>
                </div>

                {/* The Container for Cards */}
                <div
                    className="relative w-full h-full flex items-center justify-center will-change-transform"
                    style={{ transform: `scale(${0.8 * scale})` }}
                >
                    {ITEMS.map((item) => {
                        const currentX = item.x + (item.targetX - item.x) * easedSort;
                        const currentY = item.y + (item.targetY - item.y) * easedSort;
                        const currentRot = item.rotate * (1 - easedSort); // Rotate to 0

                        return (
                            <div
                                key={item.id}
                                className={`absolute w-48 h-64 bg-[#111] border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 transition-shadow duration-300
                                    ${sortProgress > 0.9 ? 'shadow-[0_0_30px_rgba(255,255,255,0.05)] border-white/20' : ''}`}
                                style={{
                                    transform: `translate(${currentX}px, ${currentY}px) rotate(${currentRot}deg)`,
                                }}
                            >
                                {/* Card Content Skeleton */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-white`}>
                                        {item.type === 'image' && <ImageIcon size={14} />}
                                        {item.type === 'link' && <Link size={14} />}
                                        {item.type === 'note' && <FileText size={14} />}
                                    </div>
                                    <div className="h-2 w-8 bg-white/10 rounded-full" />
                                </div>

                                <div className="h-4 w-3/4 bg-white/20 rounded mb-2" />
                                <div className="space-y-2 opacity-50 flex-1">
                                    <div className="h-2 w-full bg-white/10 rounded" />
                                    <div className="h-2 w-full bg-white/10 rounded" />
                                    <div className="h-2 w-2/3 bg-white/10 rounded" />
                                </div>

                                {/* Image Placeholder */}
                                {item.type === 'image' && (
                                    <div className="mt-auto h-24 w-full bg-white/5 rounded-lg border border-white/5 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10" />
                                    </div>
                                )}
                            </div>
                        );
                    })}


                    {/* Connection Lines (Fade in only when organized) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                        style={{ opacity: easedSort > 0.8 ? (easedSort - 0.8) * 5 : 0 }}
                    >
                        <path d="M calc(50% - 220px) calc(50% - 280px) L calc(50%) calc(50%)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="5 5" />
                        <path d="M calc(50% + 220px) calc(50%) L calc(50%) calc(50%)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="5 5" />
                        <path d="M calc(50% - 220px) calc(50% + 280px) L calc(50%) calc(50% + 280px)" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="5 5" />
                    </svg>

                </div>
            </div>
        </div>
    );
};

export default DemoInfinite;
