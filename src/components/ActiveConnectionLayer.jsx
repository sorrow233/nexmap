import React from 'react';
import { getBestAnchorPair, generateBezierPath } from '../utils/geometry';
import { isIOS, isSafari, prefersReducedMotion } from '../utils/browser';

/**
 * ActiveConnectionLayer
 * 
 * Renders the "Liquid Light" effects for active connections.
 * It overlays the standard ConnectionLayer and draws:
 * 1. A high-contrast "flow" line between the selected card and its neighbors.
 * 2. This layer is only active when there is a selection.
 */
const ActiveConnectionLayer = React.memo(function ActiveConnectionLayer({
    cards,
    cardMap,
    connections,
    selectedIdSet,
    offset,
    scale
}) {
    const shouldAnimate = !isIOS && !isSafari && !prefersReducedMotion;

    // If no selection, render nothing
    if (!selectedIdSet || selectedIdSet.size === 0) return null;

    // 1. Identify active connections (connected to any selected card)
    const activeConnections = connections.filter(conn =>
        selectedIdSet.has(conn.from) || selectedIdSet.has(conn.to)
    );

    if (activeConnections.length === 0) return null;

    // Helper to find card by ID - filter out soft-deleted cards
    const resolvedCardMap = cardMap || new Map(cards.filter(c => !c.deletedAt).map(c => [c.id, c]));

    return (
        <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-[50]"
            style={{
                overflow: 'visible'
            }}
        >
            {shouldAnimate && (
                <defs>
                    {/* Safari/iPad 对 SVG 滤镜动画开销偏高，这里只在更稳的环境启用 */}
                    <filter id="light-flow-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
            )}

            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
                {activeConnections.map(conn => {
                    const fromCard = resolvedCardMap.get(conn.from);
                    const toCard = resolvedCardMap.get(conn.to);

                    if (!fromCard || !toCard) return null;

                    const { source, target } = getBestAnchorPair(fromCard, toCard);
                    const pathData = generateBezierPath(source, target);
                    const key = `${conn.from}-${conn.to}`;

                    // Determine flow direction: Always flow OUT from the selected card
                    // If selected is 'to', we want flow 'to->from'? Or just highlight connection?
                    // User requirements: "From A (Source) to B (Target)" 
                    // If multiple selected, flow might be ambiguous, but usually single selection.
                    // Let's assume flow direction matches connection direction for now, 
                    // OR if users want "Selection -> Neighbor", we can reverse if needed.
                    // For now: Simple "Liquid Light" along the path.

                    // To make it look like it's flowing FROM selected TO neighbor:
                    // If selected is conn.to, we might want to reverse animation? 
                    // CSS animation `liquidFlow` moves dashoffset. 
                    // Default moves "forward" along path (Source -> Target).

                    return (
                        <g key={key}>
                            {/* Base high-contrast white line */}
                            <path
                                d={pathData}
                                fill="none"
                                stroke="var(--luminous-white)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                className="opacity-80"
                            />

                            {/* The Liquid Light Flow */}
                            <path
                                d={pathData}
                                fill="none"
                                stroke="var(--active-flow-color)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeDasharray={shouldAnimate ? '100 1000' : undefined}
                                filter={shouldAnimate ? 'url(#light-flow-glow)' : undefined}
                                style={shouldAnimate ? {
                                    animation: 'liquidFlow 2s linear infinite'
                                } : {
                                    opacity: 0.7
                                }}
                            />
                        </g>
                    );
                })}
            </g>
        </svg>
    );
});

export default ActiveConnectionLayer;
