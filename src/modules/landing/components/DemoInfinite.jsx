import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image as ImageIcon, Link, Lightbulb, Calendar, Code, Sparkles } from 'lucide-react';

const DemoInfinite = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const sectionRef = useRef(null);

    // Auto-play trigger
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisible) {
                    setIsVisible(true);

                    // Start scanning sequence after a short delay
                    setTimeout(() => {
                        let progress = 0;
                        const interval = setInterval(() => {
                            progress += 0.015; // Speed of scan
                            if (progress >= 1.2) { // Go slightly past to clear screen
                                progress = 1.2;
                                clearInterval(interval);
                            }
                            setScanProgress(progress);
                        }, 16);
                    }, 500);
                }
            },
            { threshold: 0.4 }
        );

        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, [isVisible]);

    // Card Configuration
    const cards = [
        {
            id: 1, icon: FileText, title: 'Roadmap', tag: 'Planning', color: 'blue',
            chaos: { x: -30, y: -40, r: -12 },
            order: { x: 0, y: 0 }
        },
        {
            id: 2, icon: ImageIcon, title: 'Assets', tag: 'Design', color: 'purple',
            chaos: { x: 40, y: -20, r: 8 },
            order: { x: 1, y: 0 }
        },
        {
            id: 3, icon: Code, title: 'Schema', tag: 'Dev', color: 'emerald',
            chaos: { x: -20, y: 30, r: -5 },
            order: { x: 2, y: 0 }
        },
        {
            id: 4, icon: Lightbulb, title: 'Ideas', tag: 'Brainstorm', color: 'amber',
            chaos: { x: 25, y: 35, r: 15 },
            order: { x: 0, y: 1 }
        },
        {
            id: 5, icon: Link, title: 'Sources', tag: 'Research', color: 'rose',
            chaos: { x: -40, y: 10, r: -8 },
            order: { x: 1, y: 1 }
        },
        {
            id: 6, icon: Calendar, title: 'Sprints', tag: 'Agile', color: 'cyan',
            chaos: { x: 30, y: -50, r: 10 },
            order: { x: 2, y: 1 }
        },
    ];

    const cardWidth = 160;
    const cardHeight = 110;
    const gap = 20;

    return (
        <div ref={sectionRef} className="relative w-full min-h-screen flex flex-col items-center justify-center bg-[#050505] overflow-hidden py-20">

            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse delay-700" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 max-w-5xl w-full flex flex-col items-center">

                {/* Header Text */}
                <div className="text-center mb-24 transition-all duration-1000"
                    style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'translateY(0)' : 'translateY(20px)'
                    }}>
                    <h2 className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-6">
                        Intelligent Order.
                    </h2>
                    <p className="text-lg text-white/50 max-w-xl mx-auto">
                        Watch AI scan your scattered thoughts and instantly structure them into actionable workflows.
                    </p>
                </div>

                {/* Animation Stage */}
                <div className="relative w-[600px] h-[300px]">

                    {/* Scanner Beam */}
                    <div
                        className="absolute top-[-50px] bottom-[-50px] w-2 z-50 pointer-events-none"
                        style={{
                            left: '0%',
                            transform: `translateX(${scanProgress * 600}px)`,
                            opacity: scanProgress > 0 && scanProgress < 1.1 ? 1 : 0,
                            background: 'linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.8), transparent)',
                            boxShadow: '0 0 40px 5px rgba(59, 130, 246, 0.5)'
                        }}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[1px] bg-blue-500/30 rotate-90" />
                    </div>

                    {/* Cards */}
                    {cards.map((card, i) => {
                        // Calculate Grid Position
                        const orderX = (card.order.x - 1) * (cardWidth + gap);
                        const orderY = (card.order.y - 0.5) * (cardHeight + gap);

                        // Calculate Chaos Percentage for this specific card based on scan progress
                        // Map card X center to scan progress (0 to 1)
                        const cardCenterXNormalized = (orderX + 300) / 600; // 0 to 1 approximate
                        const isScanned = scanProgress > cardCenterXNormalized;

                        // Position Logic
                        const x = isScanned ? orderX : card.chaos.x * 4;
                        const y = isScanned ? orderY : card.chaos.y * 3;
                        const r = isScanned ? 0 : card.chaos.r;
                        const scale = isScanned ? 1 : 0.9;
                        const opacity = isScanned ? 1 : 0.6;
                        const glow = isScanned ? 'shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]' : '';

                        // Colors
                        const colors = {
                            blue: 'from-blue-500/20 to-blue-900/40 border-blue-500/30 text-blue-200',
                            purple: 'from-purple-500/20 to-purple-900/40 border-purple-500/30 text-purple-200',
                            emerald: 'from-emerald-500/20 to-emerald-900/40 border-emerald-500/30 text-emerald-200',
                            amber: 'from-amber-500/20 to-amber-900/40 border-amber-500/30 text-amber-200',
                            rose: 'from-rose-500/20 to-rose-900/40 border-rose-500/30 text-rose-200',
                            cyan: 'from-cyan-500/20 to-cyan-900/40 border-cyan-500/30 text-cyan-200',
                        };

                        return (
                            <div
                                key={card.id}
                                className={`absolute top-1/2 left-1/2 w-[${cardWidth}px] h-[${cardHeight}px] rounded-xl border backdrop-blur-md bg-gradient-to-br ${colors[card.color]} transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${glow} flex flex-col p-4`}
                                style={{
                                    width: cardWidth,
                                    height: cardHeight,
                                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${r}deg) scale(${scale})`,
                                    opacity: opacity,
                                    zIndex: isScanned ? 10 : 1
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <card.icon size={16} className="opacity-80" />
                                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">{card.tag}</span>
                                </div>
                                <div className="font-semibold text-lg leading-tight mb-1">{card.title}</div>
                                <div className="h-1 w-12 bg-white/20 rounded-full mt-auto" />
                            </div>
                        );
                    })}

                    {/* Dynamic Connections (Only appear when scanned) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                        {cards.map((card, i) => {
                            // Simple logic: connect to previous if scanned
                            if (i === 0) return null;
                            const prev = cards[i - 1];
                            const currX = (card.order.x - 1) * (cardWidth + gap) + 300;
                            const currY = (card.order.y - 0.5) * (cardHeight + gap) + 150;
                            const prevX = (prev.order.x - 1) * (cardWidth + gap) + 300;
                            const prevY = (prev.order.y - 0.5) * (cardHeight + gap) + 150;

                            const cardCenterXNormalized = ((card.order.x - 1) * (cardWidth + gap) + 300) / 600;
                            const isScanned = scanProgress > cardCenterXNormalized;

                            if (!isScanned) return null;

                            // Only draw some lines
                            if (card.order.y !== prev.order.y && card.order.x !== prev.order.x) return null;

                            return (
                                <line
                                    key={i}
                                    x1={currX} y1={currY}
                                    x2={prevX} y2={prevY}
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                />
                            );
                        })}
                    </svg>

                </div>

                {/* Status Pill */}
                <div className="mt-16 transition-all duration-500" style={{ opacity: scanProgress > 0 ? 1 : 0, transform: `scale(${scanProgress > 0 ? 1 : 0.8})` }}>
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        {scanProgress < 1.1 ? (
                            <>
                                <Sparkles size={16} className="text-blue-400 animate-spin-slow" />
                                <span className="text-sm font-medium text-white/80">AI Organizing... {Math.round(scanProgress * 100)}%</span>
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                                <span className="text-sm font-medium text-white/80">Structure Complete</span>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DemoInfinite;
