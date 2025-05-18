import React, { useEffect, useState } from 'react';
import { GitBranch, Zap, Layers } from 'lucide-react';

const SproutSection = () => {
    const [depth, setDepth] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDepth(prev => (prev + 1) % 4);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col-reverse md:flex-row items-center justify-center p-8 md:p-24 overflow-hidden relative">

            {/* Visual - The Sprout Tree */}
            <div className="w-full md:w-1/2 relative h-[600px] flex items-center justify-center perspective-[1000px]">
                {/* Sprout Container */}
                <div className="relative w-full h-full flex flex-col items-center justify-end pb-20">
                    {/* Root Node */}
                    <TreeNode
                        level={0}
                        currentDepth={depth}
                        x={0}
                        y={0}
                        angle={0}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="w-full md:w-1/2 z-10 mb-12 md:mb-0 pl-10">
                <div className="flex gap-4 mb-6">
                    <Badge label="128k Token Window" icon={Layers} color="blue" />
                    <Badge label="∞ Depth" icon={Zap} color="purple" />
                </div>

                <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                    Recursive <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">
                        "Sprout"
                    </span>
                </h2>
                <p className="text-gray-400 text-xl leading-relaxed max-w-md">
                    Active ideation. Click <span className="text-white font-bold">"Sprout"</span> to have the AI recursively branch one thought into five divergent execution paths.
                </p>
            </div>
        </div>
    );
};

const Badge = ({ label, icon: Icon, color }) => {
    const colors = {
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20"
    };
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${colors[color]}`}>
            <Icon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </div>
    );
}

// Recursive Tree Node Component
const TreeNode = ({ level, currentDepth, angle }) => {
    // Only render if we are at or below current depth visibility (actually we want to show all up to currentDepth)
    // But to animate, we just use Opacity/Scale based on level vs currentDepth
    const isVisible = level <= currentDepth;
    const isNew = level === currentDepth;

    // Branches configuration
    // Level 0: 1 root
    // Level 1: 3 branches (-45, 0, 45)
    // Level 2: 2 sub-branches (-30, 30)

    if (level > 3) return null;

    const branches = level === 0 ? [0] :
        level === 1 ? [-40, 0, 40] :
            [-20, 20];

    const length = 120 * Math.pow(0.7, level);

    return (
        <div
            className="absolute bottom-0 left-1/2 origin-bottom transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
                height: `${length}px`,
                width: '2px', // Invisible container width, used for positioning line
                transform: `translateX(-50%) rotate(${angle}deg)`,
                opacity: isVisible ? 1 : 0,
                // transformOrigin: 'bottom center' // Classname handles this? Tailwind origin-bottom is typically correct.
            }}
        >
            {/* The Branch Line */}
            <div
                className={`w-[2px] bg-gradient-to-t from-white/40 to-white/80 rounded-full mx-auto transition-all duration-1000 delay-[${level * 200}ms]`}
                style={{
                    height: isVisible ? '100%' : '0%',
                    boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                }}
            />

            {/* The Node (Leaf/Joint) */}
            <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.6)] z-10 transition-all duration-500`}
                style={{
                    transform: `translate(-50%, -50%) scale(${isVisible ? 1 : 0})`,
                    transitionDelay: `${level * 200 + 500}ms`
                }}
            />

            {/* Recursive Children - ONLY if this level is visible (or to prep animation) */}
            {level < 3 && (
                <div className="absolute top-0 left-1/2 w-0 h-0">
                    {branches.map((branchAngle, i) => (
                        <TreeNode
                            key={i}
                            level={level + 1}
                            currentDepth={currentDepth}
                            angle={branchAngle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SproutSection;
