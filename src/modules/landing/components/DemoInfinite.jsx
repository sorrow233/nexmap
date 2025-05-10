import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image as ImageIcon, Link, Lightbulb, Calendar, Code, Sparkles, Layers, Box, Cpu, GitBranch, Database } from 'lucide-react';

const DemoInfinite = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [scanProgress, setScanProgress] = useState(0); // 0 to 1.5
    const [cycleState, setCycleState] = useState('idle'); // idle, scanning, holding, resetting
    const sectionRef = useRef(null);

    // Visibility Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                    // Optional: Pause loop when out of view?
                }
            },
            { threshold: 0.3 }
        );

        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    // Animation Loop
    useEffect(() => {
        if (!isVisible) return;

        let interval;
        let timer;

        const startCycle = () => {
            // Phase 1: Scanning (0s - 2s)
            setCycleState('scanning');
            let p = 0;
            interval = setInterval(() => {
                p += 0.01;
                if (p >= 1.4) { // Scan past the end
                    p = 1.4;
                    clearInterval(interval);

                    // Phase 2: Holding (2s - 5s)
                    setCycleState('holding');
                    timer = setTimeout(() => {
                        // Phase 3: Resetting (5s - 6s)
                        setCycleState('resetting');
                        setScanProgress(0); // Snap beam back instantly or fade it out

                        // Wait for reset transition to finish before restarting
                        setTimeout(() => {
                            startCycle();
                        }, 1500);
                    }, 3000);
                }
                setScanProgress(p);
            }, 16);
        };

        startCycle();

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [isVisible]);

    // Card Data - Increased to 12 items
    const cards = [
        // Row 1
        { id: 1, icon: FileText, title: 'Q4 Goals', tag: 'Plan', color: 'blue', chaos: { x: -40, y: -60, r: -15, z: 20 }, order: { x: 0, y: 0 } },
        { id: 2, icon: ImageIcon, title: 'Assets', tag: 'Design', color: 'purple', chaos: { x: 50, y: -30, r: 10, z: -10 }, order: { x: 1, y: 0 } },
        { id: 3, icon: Database, title: 'Schema', tag: 'Data', color: 'emerald', chaos: { x: -20, y: 50, r: -5, z: 30 }, order: { x: 2, y: 0 } },
        { id: 4, icon: GitBranch, title: 'Flow', tag: 'Logic', color: 'amber', chaos: { x: 60, y: 20, r: 20, z: -20 }, order: { x: 3, y: 0 } },

        // Row 2
        { id: 5, icon: Link, title: 'Refs', tag: 'Source', color: 'rose', chaos: { x: -70, y: 10, r: -25, z: 10 }, order: { x: 0, y: 1 } },
        { id: 6, icon: Lightbulb, title: 'Ideas', tag: 'Brain', color: 'cyan', chaos: { x: 30, y: -80, r: 15, z: -30 }, order: { x: 1, y: 1 } },
        { id: 7, icon: Calendar, title: 'Sprint', tag: 'Agile', color: 'blue', chaos: { x: -10, y: 90, r: -10, z: 40 }, order: { x: 2, y: 1 } },
        { id: 8, icon: Code, title: 'Utils', tag: 'Dev', color: 'purple', chaos: { x: 80, y: -40, r: 30, z: -15 }, order: { x: 3, y: 1 } },

        // Row 3 (Offset/More Chaos)
        { id: 9, icon: Layers, title: 'Stack', tag: 'Tech', color: 'emerald', chaos: { x: -50, y: -20, r: -8, z: 5 }, order: { x: 0, y: 2 } },
        { id: 10, icon: Box, title: 'Docs', tag: 'Archive', color: 'amber', chaos: { x: 90, y: 60, r: 12, z: -25 }, order: { x: 1, y: 2 } },
        { id: 11, icon: Cpu, title: 'Core', tag: 'Sys', color: 'rose', chaos: { x: -30, y: 40, r: -18, z: 15 }, order: { x: 2, y: 2 } },
        { id: 12, icon: Sparkles, title: 'AI', tag: 'Model', color: 'cyan', chaos: { x: 40, y: -70, r: 22, z: -5 }, order: { x: 3, y: 2 } },
    ];

    const cardWidth = 140;
    const cardHeight = 100;
    const gapX = 20;
    const gapY = 20;
    const gridWidth = 4 * cardWidth + 3 * gapX;

    return (
        <div ref={sectionRef} className="relative w-full min-h-screen flex flex-col items-center justify-center bg-[#050505] overflow-hidden py-20">

            {/* Ambient Depth Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[150px] rounded-full animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/5 blur-[150px] rounded-full animate-pulse-slow delay-1000" />
            </div>

            <div className="relative z-10 max-w-6xl w-full flex flex-col items-center">

                {/* Header */}
                <div className="text-center mb-20 transition-all duration-1000">
                    <h2 className="text-6xl md:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-6">
                        Continuous Order.
                    </h2>
                    <p className="text-lg text-white/50 max-w-xl mx-auto">
                        The engine that never stops refining your workspace.
                    </p>
                </div>

                {/* Animation Stage */}
                <div className="relative w-[800px] h-[500px] perspective-[2000px]">

                    {/* Scanner Beam */}
                    <div
                        className="absolute top-[-100px] bottom-[-100px] w-1 z-50 pointer-events-none transition-opacity duration-300"
                        style={{
                            left: '0%',
                            transform: `translateX(${(scanProgress / 1.4) * 1000 - 100}px)`, // Map 0-1.4 to pixels covering stage
                            opacity: cycleState === 'scanning' ? 1 : 0,
                            background: 'linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.9), transparent)',
                            boxShadow: '0 0 50px 10px rgba(59, 130, 246, 0.4)'
                        }}
                    >
                        {/* Laser line horizontal cross-section */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[1px] bg-blue-500/20 rotate-90" />
                    </div>

                    {/* Cards */}
                    {cards.map((card, i) => {
                        // Grid Positioning
                        const orderX = (card.order.x * (cardWidth + gapX)) - (gridWidth / 2) + (cardWidth / 2) + 400; // Centered X
                        const orderY = card.order.y * (cardHeight + gapY) + 50;

                        // Calculate trigger point for this card
                        const cardTriggerX = (orderX / 800) * 1.4; // Normalized beam position
                        const isScanned = scanProgress > cardTriggerX;
                        const isHolding = cycleState === 'holding';
                        const isResetting = cycleState === 'resetting';

                        // State Logic
                        // If resetting, float back to chaos. If scanned, snap to order. Else, stay in chaos.
                        const useOrder = (isScanned || isHolding) && !isResetting;

                        const x = useOrder ? orderX : orderX + card.chaos.x * 5;
                        const y = useOrder ? orderY : orderY + card.chaos.y * 4;
                        const r = useOrder ? 0 : card.chaos.r;
                        const z = useOrder ? 0 : card.chaos.z * 10;
                        const scale = useOrder ? 1 : 0.8;
                        const opacity = useOrder ? 1 : 0.4;
                        const glow = useOrder ? 'shadow-[0_0_20px_-5px_rgba(59,130,246,0.2)]' : '';

                        // Delicacy: Add parallax hover effect or subtle float if not ordered
                        // We use CSS transiton for smooth state change

                        return (
                            <div
                                key={card.id}
                                className={`absolute w-[${cardWidth}px] h-[${cardHeight}px] rounded-xl border backdrop-blur-md bg-gradient-to-br transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1) ${glow} flex flex-col p-3 overflow-hidden`}
                                style={{
                                    width: cardWidth,
                                    height: cardHeight,
                                    // Complex 3D transform
                                    transform: `translate3d(${x - 400}px, ${y}px, ${z}px) rotateZ(${r}deg) scale(${scale})`,
                                    left: '50%', // Center reference
                                    top: 0,
                                    opacity: opacity,
                                    zIndex: useOrder ? 10 : 1,
                                    // Dynamic colors
                                    borderColor: useOrder ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                    background: useOrder
                                        ? `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))`
                                        : `linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0))`
                                }}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className={`p-1 rounded-md bg-${card.color}-500/20`}>
                                        <card.icon size={12} className={`text-${card.color}-300`} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{card.tag}</span>
                                </div>
                                <div className="font-medium text-sm text-white/90 leading-tight mb-1">{card.title}</div>
                                <div className="h-0.5 w-8 bg-white/10 rounded-full mt-auto" />
                            </div>
                        );
                    })}

                    {/* Connection Lines (Only visible when holding) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible transition-opacity duration-500"
                        style={{ opacity: cycleState === 'holding' ? 1 : 0 }}
                    >
                        {cards.map((card, i) => {
                            // Horizontal connections in rows
                            if (i % 4 === 0) return null; // First in row has no left neighbor

                            const prev = cards[i - 1];
                            const currX = (card.order.x * (cardWidth + gapX)) - (gridWidth / 2) + (cardWidth / 2) + 400;
                            const currY = card.order.y * (cardHeight + gapY) + 50 + (cardHeight / 2);
                            const prevX = (prev.order.x * (cardWidth + gapX)) - (gridWidth / 2) + (cardWidth / 2) + 400;
                            const prevY = prev.order.y * (cardHeight + gapY) + 50 + (cardHeight / 2);

                            return (
                                <line
                                    key={`h-${i}`}
                                    x1={currX - cardWidth / 2} y1={currY}
                                    x2={prevX + cardWidth / 2} y2={prevY}
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="1"
                                />
                            );
                        })}
                    </svg>
                </div>

                {/* Status Indicator */}
                <div className="mt-8 flex gap-2">
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${cycleState === 'scanning' ? 'bg-blue-400 animate-pulse' : 'bg-white/10'}`} />
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${cycleState === 'holding' ? 'bg-emerald-400' : 'bg-white/10'}`} />
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${cycleState === 'resetting' ? 'bg-amber-400' : 'bg-white/10'}`} />
                </div>

            </div>
        </div>
    );
};

export default DemoInfinite;
