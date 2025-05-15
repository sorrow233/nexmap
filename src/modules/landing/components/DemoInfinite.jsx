import React, { useMemo } from 'react';
import { FileText, Image as ImageIcon, Link, File } from 'lucide-react';

const DemoInfinite = ({ scrollProgress }) => {
    // Scroll Timeline: 1.5 -> 3.0
    // Normalize to 0 -> 1 for this section
    const START = 1.5;
    const END = 3.0;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - START) / (END - START)));

    // Only render reasonable range to save resources
    if (scrollProgress < 1.0 || scrollProgress > 3.5) return null;

    // Animation Phases:
    // 0.0 - 0.2: Fade In (Chaos state)
    // 0.2 - 0.8: Sorting (Move from random positions to grid)
    // 0.8 - 1.0: Organized state fully stable + Zoom out slightly

    // Generate random positions (seeded-ish by index) to avoid re-calc on every render
    // In a real app we'd use useMemo, but here we just need stability during rerenders if possible.
    // We'll use a fixed array.
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

    // Interpolation Function
    // Phase 0.2 -> 0.8
    const sortProgress = Math.min(1, Math.max(0, (localProgress - 0.2) / 0.6));
    // Ease in-out
    const easedSort = sortProgress < 0.5 ? 2 * sortProgress * sortProgress : -1 + (4 - 2 * sortProgress) * sortProgress;

    const scale = localProgress > 0.8 ? 1 - (localProgress - 0.8) * 0.5 : 1;
    const opacity = localProgress < 0.1 ? localProgress * 10 : localProgress > 0.9 ? 1 - (localProgress - 0.9) * 10 : 1;

    return (
        <div
            className="w-full h-full flex items-center justify-center relative perspective-[1000px] overflow-hidden"
            style={{ opacity }}
        >
            {/* Title */}
            <div
                className="absolute top-24 left-0 right-0 text-center z-40 transition-all duration-500"
                style={{
                    opacity: localProgress > 0.1 && localProgress < 0.9 ? 1 : 0,
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
    );
};

export default DemoInfinite;
