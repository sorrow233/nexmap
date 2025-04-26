import React, { useMemo } from 'react';

const DemoFractal = ({ scrollProgress }) => {
    // Active range: 2.5 to 3.5
    const localProgress = (scrollProgress - 2.5);
    const isActive = localProgress > -0.5 && localProgress < 1.0;

    if (!isActive) return null;

    const opacity = localProgress < 0
        ? Math.max(0, 1 + localProgress * 4)
        : Math.max(0, 1 - (localProgress - 0.5) * 4);

    const drawProgress = Math.min(1, Math.max(0, localProgress * 2));

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none"
            style={{ opacity }}
        >
            <div className="absolute bottom-32 left-0 right-0 text-center z-30">
                <h2 className="text-4xl md:text-6xl font-bold text-[#1a1a1a] mb-4">
                    Structured Thought
                </h2>
                <p className="text-xl text-gray-500">
                    Connect the dots. Automatically.
                </p>
            </div>

            <div className="w-[800px] h-[600px] relative">
                <svg className="w-full h-full" viewBox="0 0 800 600">
                    <FractalTree progress={drawProgress} x={400} y={500} length={150} angle={-Math.PI / 2} depth={0} maxDepth={4} />
                </svg>
            </div>
        </div>
    );
};

// Recursive Component for Tree
const FractalTree = ({ progress, x, y, length, angle, depth, maxDepth }) => {
    if (depth >= maxDepth) return null;

    // Calculate end point
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    // Animation logic
    // Each depth level activates sequentially based on total progress
    const step = 1 / maxDepth;
    const startTrigger = depth * step;
    const endTrigger = startTrigger + step;

    // Local progress 0 to 1 for this specific branch
    const localP = Math.min(1, Math.max(0, (progress - startTrigger) / step));

    const currentEndX = x + (endX - x) * localP;
    const currentEndY = y + (endY - y) * localP;

    return (
        <>
            <line
                x1={x}
                y1={y}
                x2={currentEndX}
                y2={currentEndY}
                stroke="#1a1a1a"
                strokeWidth={maxDepth - depth}
                strokeLinecap="round"
                opacity={0.2 + (localP * 0.8)}
            />
            {localP > 0.8 && (
                <>
                    <FractalTree
                        progress={progress}
                        x={endX}
                        y={endY}
                        length={length * 0.7}
                        angle={angle - 0.5}
                        depth={depth + 1}
                        maxDepth={maxDepth}
                    />
                    <FractalTree
                        progress={progress}
                        x={endX}
                        y={endY}
                        length={length * 0.7}
                        angle={angle + 0.5}
                        depth={depth + 1}
                        maxDepth={maxDepth}
                    />
                </>
            )}
            {/* Nodes at the end of branches if full grown */}
            {localP === 1 && depth === maxDepth - 1 && (
                <circle cx={endX} cy={endY} r={4} fill="#3b82f6" opacity={0.5} />
            )}
        </>
    );
};

export default DemoFractal;
