import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image as ImageIcon, Link, Lightbulb, Calendar, Code } from 'lucide-react';

const DemoInfinite = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [animationProgress, setAnimationProgress] = useState(0);
    const sectionRef = useRef(null);

    // Detect when section enters viewport
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisible) {
                    setIsVisible(true);
                    // Start animation sequence
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 0.01;
                        if (progress >= 1) {
                            progress = 1;
                            clearInterval(interval);
                        }
                        setAnimationProgress(progress);
                    }, 20); // 2 seconds total animation

                    return () => clearInterval(interval);
                }
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, [isVisible]);

    // Easing function
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const progress = easeOutCubic(animationProgress);

    // Cards data
    const cards = [
        {
            id: 1,
            type: 'note',
            icon: FileText,
            title: 'Project Roadmap',
            preview: 'Q4 objectives and milestones...',
            color: 'blue',
            startPos: { x: -150, y: -200, rotate: -15 },
            endPos: { x: -280, y: -120, rotate: 0 }
        },
        {
            id: 2,
            type: 'image',
            icon: ImageIcon,
            title: 'UI Mockups',
            preview: 'Design explorations',
            color: 'purple',
            startPos: { x: 200, y: -180, rotate: 20 },
            endPos: { x: -280, y: 20, rotate: 0 }
        },
        {
            id: 3,
            type: 'link',
            icon: Link,
            title: 'Research Paper',
            preview: 'arxiv.org/ai-organization',
            color: 'emerald',
            startPos: { x: -180, y: 150, rotate: -25 },
            endPos: { x: -280, y: 160, rotate: 0 }
        },
        {
            id: 4,
            type: 'note',
            icon: Lightbulb,
            title: 'Ideas Backlog',
            preview: 'Feature requests and thoughts...',
            color: 'amber',
            startPos: { x: 180, y: 120, rotate: 18 },
            endPos: { x: 40, y: -120, rotate: 0 }
        },
        {
            id: 5,
            type: 'note',
            icon: Code,
            title: 'Code Snippets',
            preview: 'Useful utilities and helpers...',
            color: 'rose',
            startPos: { x: 50, y: -100, rotate: -8 },
            endPos: { x: 40, y: 20, rotate: 0 }
        },
        {
            id: 6,
            type: 'note',
            icon: Calendar,
            title: 'Meeting Notes',
            preview: 'Team sync - action items',
            color: 'cyan',
            startPos: { x: -80, y: 80, rotate: 12 },
            endPos: { x: 40, y: 160, rotate: 0 }
        }
    ];

    const colorSchemes = {
        blue: 'from-blue-500/10 to-blue-600/20 border-blue-400/30 text-blue-100',
        purple: 'from-purple-500/10 to-purple-600/20 border-purple-400/30 text-purple-100',
        emerald: 'from-emerald-500/10 to-emerald-600/20 border-emerald-400/30 text-emerald-100',
        amber: 'from-amber-500/10 to-amber-600/20 border-amber-400/30 text-amber-100',
        rose: 'from-rose-500/10 to-rose-600/20 border-rose-400/30 text-rose-100',
        cyan: 'from-cyan-500/10 to-cyan-600/20 border-cyan-400/30 text-cyan-100'
    };

    return (
        <div
            ref={sectionRef}
            className="relative w-full min-h-screen bg-gradient-to-b from-[#050505] via-[#0a0a0f] to-[#050505] py-20 flex items-center justify-center"
        >
            <div className="max-w-7xl mx-auto px-4">
                {/* Title */}
                <div className="text-center mb-16">
                    <div className="text-sm tracking-wider text-white/40 mb-3 uppercase font-medium">
                        Watch the Magic
                    </div>
                    <h2 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent tracking-tight">
                        Infinite Canvas
                    </h2>
                    <p className="text-white/50 text-lg">
                        From chaos to clarity, automatically
                    </p>
                </div>

                {/* Animation Container */}
                <div className="relative w-full max-w-5xl mx-auto h-[500px]">
                    {/* Background grid */}
                    <div
                        className="absolute inset-0 opacity-0 transition-opacity duration-1000"
                        style={{
                            opacity: progress > 0.5 ? 0.15 : 0,
                            backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                            backgroundSize: '100px 100px'
                        }}
                    />

                    {/* Cards */}
                    {cards.map((card, index) => {
                        const Icon = card.icon;
                        const delay = index * 0.1;
                        const cardProgress = Math.max(0, Math.min(1, (progress - delay) / 0.7));

                        const currentX = card.startPos.x + (card.endPos.x - card.startPos.x) * cardProgress;
                        const currentY = card.startPos.y + (card.endPos.y - card.startPos.y) * cardProgress;
                        const currentRotate = card.startPos.rotate * (1 - cardProgress);

                        return (
                            <div
                                key={card.id}
                                className={`absolute left-1/2 top-1/2 w-64 h-40 rounded-2xl bg-gradient-to-br ${colorSchemes[card.color]} border backdrop-blur-xl shadow-2xl p-4 transition-all duration-700 ease-out`}
                                style={{
                                    transform: `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) rotate(${currentRotate}deg)`,
                                    opacity: cardProgress,
                                    boxShadow: cardProgress > 0.5 ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 10px 30px -5px rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                    <div className="p-1.5 rounded-lg bg-white/10">
                                        <Icon size={16} className="text-white/80" />
                                    </div>
                                    <span className="text-sm font-medium text-white/90">{card.title}</span>
                                </div>

                                <p className="text-sm text-white/60 mb-3">{card.preview}</p>

                                <div className="flex gap-1.5 mt-auto">
                                    <div className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60">
                                        {card.type}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Connection lines */}
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ opacity: progress > 0.7 ? progress : 0 }}
                    >
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
                                <stop offset="50%" stopColor="rgba(59, 130, 246, 0.4)" />
                                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                            </linearGradient>
                        </defs>

                        <line
                            x1="50%" y1="calc(50% - 120px)"
                            x2="50%" y2="calc(50% + 20px)"
                            stroke="url(#lineGradient)"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                        />
                        <line
                            x1="50%" y1="calc(50% + 20px)"
                            x2="50%" y2="calc(50% + 160px)"
                            stroke="url(#lineGradient)"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                        />
                        <line
                            x1="calc(50% - 280px)" y1="calc(50% - 120px)"
                            x2="calc(50% - 280px)" y2="calc(50% + 20px)"
                            stroke="url(#lineGradient)"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                        />
                    </svg>
                </div>

                {/* Status indicator */}
                <div
                    className="mt-12 text-center"
                    style={{ opacity: progress < 0.9 ? 1 : 0 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-sm text-blue-200 font-medium">
                            {progress < 0.3 ? 'Analyzing content...' : progress < 0.7 ? 'Organizing...' : 'Complete!'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoInfinite;
