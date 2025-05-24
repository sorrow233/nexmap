import React, { useRef, useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Link, Lightbulb, Calendar, Code } from 'lucide-react';

const DemoInfinite = () => {
    const containerRef = useRef(null);
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Start animation when section is 70% visible
            const triggerPoint = windowHeight * 0.7;
            const start = triggerPoint;
            const end = -rect.height * 0.3;

            const progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));
            setScrollProgress(progress);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Animation phases
    const phase1 = Math.min(1, scrollProgress * 2); // 0-0.5: Cards appear
    const phase2 = Math.max(0, Math.min(1, (scrollProgress - 0.3) * 2)); // 0.3-0.8: Organization
    const phase3 = Math.max(0, Math.min(1, (scrollProgress - 0.6) * 2.5)); // 0.6-1: Connections

    // Card data with realistic content
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
            ref={containerRef}
            className="relative w-full bg-gradient-to-b from-[#050505] via-[#0a0a0f] to-[#050505]"
            style={{ minHeight: '180vh' }}
        >
            {/* Sticky viewport */}
            <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">

                {/* Background grid - fades in during organization */}
                <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-1000"
                    style={{
                        opacity: phase2 * 0.15,
                        backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                        backgroundSize: '100px 100px'
                    }}
                />

                {/* Title */}
                <div className="absolute top-32 text-center z-50">
                    <div
                        className="text-sm tracking-wider text-white/40 mb-3 uppercase font-medium"
                        style={{
                            opacity: phase1,
                            transform: `translateY(${(1 - phase1) * 20}px)`
                        }}
                    >
                        Watch the Magic
                    </div>
                    <h2
                        className="text-7xl md:text-8xl font-bold mb-4 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent tracking-tight"
                        style={{
                            opacity: phase1,
                            transform: `translateY(${(1 - phase1) * 30}px)`
                        }}
                    >
                        Infinite Canvas
                    </h2>
                    <p
                        className="text-white/50 text-lg"
                        style={{
                            opacity: phase3,
                            transform: `translateY(${(1 - phase3) * 20}px)`
                        }}
                    >
                        From chaos to clarity, automatically
                    </p>
                </div>

                {/* Cards container */}
                <div className="relative w-full max-w-5xl h-[500px]">
                    {cards.map((card, index) => {
                        const Icon = card.icon;
                        const delay = index * 0.1;

                        // Calculate current position
                        const currentX = card.startPos.x + (card.endPos.x - card.startPos.x) * phase2;
                        const currentY = card.startPos.y + (card.endPos.y - card.startPos.y) * phase2;
                        const currentRotate = card.startPos.rotate * (1 - phase2);

                        return (
                            <div
                                key={card.id}
                                className={`absolute left-1/2 top-1/2 w-64 h-40 rounded-2xl bg-gradient-to-br ${colorSchemes[card.color]} border backdrop-blur-xl shadow-2xl p-4 transition-all duration-700 ease-out`}
                                style={{
                                    transform: `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) rotate(${currentRotate}deg)`,
                                    opacity: phase1,
                                    transitionDelay: `${delay}s`,
                                    boxShadow: phase2 > 0.5 ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 10px 30px -5px rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                {/* Card header */}
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                    <div className="p-1.5 rounded-lg bg-white/10">
                                        <Icon size={16} className="text-white/80" />
                                    </div>
                                    <span className="text-sm font-medium text-white/90">{card.title}</span>
                                </div>

                                {/* Card content */}
                                <p className="text-sm text-white/60 mb-3">{card.preview}</p>

                                {/* Card footer with tags */}
                                <div className="flex gap-1.5 mt-auto">
                                    <div className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60">
                                        {card.type}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Connection lines - appear in phase 3 */}
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ opacity: phase3 }}
                    >
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
                                <stop offset="50%" stopColor="rgba(59, 130, 246, 0.4)" />
                                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                            </linearGradient>
                        </defs>

                        {/* Draw connections between cards in organized state */}
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
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm"
                    style={{
                        opacity: phase1 * (1 - phase3),
                        transform: `translateX(-50%) translateY(${(1 - phase1) * 30}px)`
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-sm text-blue-200 font-medium">
                            {phase2 < 0.3 ? 'Analyzing content...' : phase2 < 0.7 ? 'Organizing...' : 'Complete'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoInfinite;
