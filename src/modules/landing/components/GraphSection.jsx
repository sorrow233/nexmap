import React, { useEffect, useState } from 'react';

const GraphSection = () => {
    const [activeNode, setActiveNode] = useState(0);
    const [prunedNodes, setPrunedNodes] = useState([]);

    // Auto-play simulation cycle
    useEffect(() => {
        const interval = setInterval(() => {
            // Simple logic to cycle through states
            setActiveNode(prev => (prev + 1) % 6);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Randomly prune some nodes when active node changes
        if (activeNode === 0) {
            setPrunedNodes([]); // Reset
        } else {
            // Prune nodes that are not neighbors? Just visual effect.
            // Let's just say nodes 4 and 5 get pruned at step 3
            if (activeNode === 3) setPrunedNodes([4, 5]);
        }
    }, [activeNode]);

    return (
        <div className="min-h-screen bg-[#080808] flex flex-col md:flex-row items-center justify-center p-8 md:p-24 overflow-hidden relative">

            {/* Left Content */}
            <div className="w-full md:w-1/2 z-10 mb-12 md:mb-0">
                <div className="inline-block px-3 py-1 mb-6 border border-emerald-500/30 rounded-full bg-emerald-500/10">
                    <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">Engine Core v2.1</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                    Graph Context <br />
                    <span className="text-emerald-500">Walking.</span>
                </h2>
                <p className="text-gray-400 text-xl leading-relaxed max-w-md">
                    It reads the <span className="text-white border-b border-white/20">connections</span>.
                    Traditional chat UIs are oblivious to structure. Our engine traverses the semantic graph of your canvas,
                    <span className="text-red-400/80 mx-1">pruning irrelevant nodes</span>
                    and injecting precise neighbor context into every generation.
                </p>
            </div>

            {/* Right Visual - The Graph */}
            <div className="w-full md:w-1/2 relative h-[500px] flex items-center justify-center">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

                {/* The Graph SVG */}
                <svg className="w-full h-full visible overflow-visible">
                    {/* Edges */}
                    <Edge start={nodes[0]} end={nodes[1]} active={activeNode >= 1} />
                    <Edge start={nodes[1]} end={nodes[2]} active={activeNode >= 2} />
                    <Edge start={nodes[1]} end={nodes[3]} active={activeNode >= 3} />

                    {/* Pruned Edges */}
                    <Edge start={nodes[0]} end={nodes[4]} active={false} pruned={prunedNodes.includes(4)} />
                    <Edge start={nodes[0]} end={nodes[5]} active={false} pruned={prunedNodes.includes(5)} />

                    {/* Nodes */}
                    {nodes.map((node, i) => (
                        <Node
                            key={i}
                            x={node.x}
                            y={node.y}
                            active={i <= activeNode && !prunedNodes.includes(i)}
                            isPruned={prunedNodes.includes(i)}
                            isCurrent={i === activeNode}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};

// Node Positions relative to center %
const nodes = [
    { x: 20, y: 50 },  // 0: Start
    { x: 45, y: 50 },  // 1: Middle
    { x: 70, y: 30 },  // 2: Top Right (Goal)
    { x: 70, y: 70 },  // 3: Bottom Right
    { x: 30, y: 80 },  // 4: Irrelevant 1
    { x: 35, y: 20 },  // 5: Irrelevant 2
];

const Node = ({ x, y, active, isPruned, isCurrent }) => (
    <g style={{ transform: `translate(${x}%, ${y}%)`, transition: 'all 0.5s ease' }}>
        {/* Glow */}
        <circle
            r={isCurrent ? 30 : 0}
            fill="rgba(16, 185, 129, 0.2)"
            className="animate-ping"
        />
        {/* Main Circle */}
        <circle
            r={12}
            className={`transition-all duration-500 ${isPruned ? 'fill-red-900/20 stroke-red-900/50' :
                    active ? 'fill-emerald-500 stroke-emerald-400' : 'fill-[#1a1a1a] stroke-white/20'
                }`}
            strokeWidth={2}
        />
        {/* Inner Ring (Active) */}
        <circle
            r={6}
            className={`transition-all duration-500 ${active && !isPruned ? 'fill-emerald-100' : 'fill-transparent'
                }`}
        />
    </g>
);

const Edge = ({ start, end, active, pruned }) => (
    <line
        x1={`${start.x}%`} y1={`${start.y}%`}
        x2={`${end.x}%`} y2={`${end.y}%`}
        className={`transition-all duration-700 ${pruned ? 'stroke-red-900/30 stroke-[1] stroke-dashed' :
                active ? 'stroke-emerald-500 stroke-[3]' : 'stroke-white/5 stroke-[1]'
            }`}
        strokeDasharray={pruned ? "4 4" : "0"}
    />
);

export default GraphSection;
