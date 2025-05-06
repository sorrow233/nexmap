import React, { useRef, useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Link, Database, Tag, Zap } from 'lucide-react';

const DemoInfinite = () => {
    const containerRef = useRef(null);
    const [progress, setProgress] = useState(0);

    // Scroll tracking
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const vh = window.innerHeight;

            // Start when element is 60% into view, end when it's centered
            const start = vh * 0.6;
            const end = -rect.height * 0.3;

            let p = (start - rect.top) / (start - end);
            p = Math.min(1, Math.max(0, p));
            setProgress(p);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Card data - organized into semantic groups
    const cards = [
        // Work Group (Blue)
        { id: 1, type: 'note', title: 'Q4 Goals', group: 'work', color: 'blue', chaosX: -200, chaosY: -50, orderX: -400, orderY: -150 },
        { id: 2, type: 'link', title: 'Team Doc', group: 'work', color: 'blue', chaosX: 150, chaosY: -80, orderX: -250, orderY: -150 },
        { id: 3, type: 'image', title: 'Mockup', group: 'work', color: 'blue', chaosX: -50, chaosY: 100, orderX: -325, orderY: -50 },

        // Research Group (Purple)
        { id: 4, type: 'note', title: 'AI Paper', group: 'research', color: 'purple', chaosX: 200, chaosY: -150, orderX: 0, orderY: -150 },
        { id: 5, type: 'data', title: 'Dataset', group: 'research', color: 'purple', chaosX: -100, chaosY: -20, orderX: 150, orderY: -150 },
        { id: 6, type: 'link', title: 'GitHub', group: 'research', color: 'purple', chaosX: 100, chaosY: 80, orderX: 75, orderY: -50 },

        // Ideas Group (Emerald)
        { id: 7, type: 'note', title: 'Brainstorm', group: 'ideas', color: 'emerald', chaosX: -150, chaosY: 120, orderX: -400, orderY: 100 },
        { id: 8, type: 'image', title: 'Sketch', group: 'ideas', color: 'emerald', chaosX: 250, chaosY: 50, orderX: -250, orderY: 100 },
        { id: 9, type: 'note', title: 'Concepts', group: 'ideas', color: 'emerald', chaosX: 50, chaosY: -100, orderX: -325, orderY: 200 },

        // Personal Group (Amber)
        { id: 10, type: 'note', title: 'Todo', group: 'personal', color: 'amber', chaosX: -250, chaosY: 0, orderX: 0, orderY: 100 },
        { id: 11, type: 'link', title: 'Recipe', group: 'personal', color: 'amber', chaosX: 180, chaosY: 120, orderX: 150, orderY: 100 },
        { id: 12, type: 'image', title: 'Photos', group: 'personal', color: 'amber', chaosX: 20, chaosY: 30, orderX: 75, orderY: 200 },
    ];

    const groups = {
        work: { x: -325, y: -100, color: 'blue' },
        research: { x: 75, y: -100, color: 'purple' },
        ideas: { x: -325, y: 150, color: 'emerald' },
        personal: { x: 75, y: 150, color: 'amber' }
    };

    // Smooth easing function
    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Different phase progressions
    const pulseProgress = Math.max(0, Math.min(1, (progress - 0.2) / 0.2)); // 0.2-0.4
    const organizeProgress = easeInOutCubic(Math.max(0, Math.min(1, (progress - 0.4) / 0.3))); // 0.4-0.7
    const connectProgress = Math.max(0, Math.min(1, (progress - 0.7) / 0.2)); // 0.7-0.9

    const getCardStyle = (card, index) => {
        const x = card.chaosX + (card.orderX - card.chaosX) * organizeProgress;
        const y = card.chaosY + (card.orderY - card.chaosY) * organizeProgress;
        const rotation = (1 - organizeProgress) * (Math.random() - 0.5) * 30;
        const delay = index * 0.05;

        return {
            transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
            transitionDelay: `${delay}s`,
            opacity: 0.3 + organizeProgress * 0.7,
            zIndex: Math.floor(organizeProgress * 10)
        };
    };

    const colorMap = {
        blue: 'from-blue-500/20 to-blue-600/30 border-blue-400/40',
        purple: 'from-purple-500/20 to-purple-600/30 border-purple-400/40',
        emerald: 'from-emerald-500/20 to-emerald-600/30 border-emerald-400/40',
        amber: 'from-amber-500/20 to-amber-600/30 border-amber-400/40'
    };

    const groupLabelColor = {
        blue: 'text-blue-300 bg-blue-500/10 border-blue-400/30',
        purple: 'text-purple-300 bg-purple-500/10 border-purple-400/30',
        emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
        amber: 'text-amber-300 bg-amber-500/10 border-amber-400/30'
    };

    return (
        <div ref={containerRef} className="relative w-full h-[200vh] bg-[#050505]">
            {/* Sticky container */}
            <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden">

                {/* Title */}
                <div className="absolute top-20 z-50 text-center">
                    <h2 className="text-7xl font-bold text-white mb-4 tracking-tight">
                        {organizeProgress < 0.5 ? 'Chaos' : 'Clarity'}
                        <span className="text-blue-400">.</span>
                    </h2>
                    <p className="text-white/60 text-xl" style={{ opacity: connectProgress }}>
                        AI-powered organization in seconds
                    </p>
                </div>

                {/* Pulse effect */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        opacity: pulseProgress * (1 - pulseProgress) * 4,
                        background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                        transform: `scale(${1 + pulseProgress * 2})`
                    }}
                />

                {/* Cards container */}
                <div className="relative w-[1000px] h-[600px]">
                    {/* Group labels */}
                    {Object.entries(groups).map(([name, group]) => (
                        <div
                            key={name}
                            className={`absolute px-3 py-1 rounded-full text-sm font-medium border backdrop-blur-sm transition-all duration-700 ${groupLabelColor[group.color]}`}
                            style={{
                                left: `calc(50% + ${group.x - 80}px)`,
                                top: `calc(50% + ${group.y - 40}px)`,
                                opacity: connectProgress,
                                transform: `translateY(${(1 - connectProgress) * 20}px)`
                            }}
                        >
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                        </div>
                    ))}

                    {/* Cards */}
                    {cards.map((card, i) => (
                        <div
                            key={card.id}
                            className={`absolute w-[140px] h-[100px] rounded-xl bg-gradient-to-br ${colorMap[card.color]} border backdrop-blur-md shadow-xl p-3 transition-all duration-700 ease-out hover:scale-105`}
                            style={{
                                left: 'calc(50% - 70px)',
                                top: 'calc(50% - 50px)',
                                ...getCardStyle(card, i)
                            }}
                        >
                            {/* Card icon */}
                            <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                                {card.type === 'note' && <FileText size={14} className="text-white/70" />}
                                {card.type === 'image' && <ImageIcon size={14} className="text-white/70" />}
                                {card.type === 'link' && <Link size={14} className="text-white/70" />}
                                {card.type === 'data' && <Database size={14} className="text-white/70" />}
                                <div className="h-2 w-16 bg-white/20 rounded-full" />
                            </div>
                            {/* Card content */}
                            <div className="space-y-1">
                                <div className="h-1.5 w-full bg-white/15 rounded-full" />
                                <div className="h-1.5 w-3/4 bg-white/10 rounded-full" />
                            </div>
                        </div>
                    ))}

                    {/* Connection lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: connectProgress }}>
                        {cards.map((card, i) => {
                            if (i === 0 || card.group !== cards[i - 1].group) return null;
                            const prev = cards[i - 1];
                            return (
                                <line
                                    key={`line-${i}`}
                                    x1={`calc(50% + ${card.orderX}px)`}
                                    y1={`calc(50% + ${card.orderY}px)`}
                                    x2={`calc(50% + ${prev.orderX}px)`}
                                    y2={`calc(50% + ${prev.orderY}px)`}
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 4"
                                />
                            );
                        })}
                    </svg>

                    {/* AI indicator */}
                    <div
                        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full backdrop-blur-sm"
                        style={{ opacity: pulseProgress }}
                    >
                        <Zap size={14} className="text-blue-300" />
                        <span className="text-blue-300 text-sm font-medium">AI Organizing...</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoInfinite;
