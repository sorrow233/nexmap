import React, { useEffect, useRef, useMemo } from 'react';
import { getBestAnchorPair, getCardRect } from '../utils/geometry';
import { findSmartPath, generateRoundedPath } from '../utils/routing';

/**
 * ConnectionLayer renders all connections between cards using Path2D on an HTML5 Canvas.
 * This is significantly more performant than SVG for many connections.
 */
const ConnectionLayer = React.memo(function ConnectionLayer({ cards, connections, scale, offset }) {
    const canvasRef = useRef(null);

    // Obstacles for routing: all current card rects
    const obstacles = useMemo(() => cards.map(c => getCardRect(c)), [cards]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Resize canvas to fill viewport
        const resize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
        };

        resize();
        window.addEventListener('resize', resize);

        // Render loop/function
        const render = () => {
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            if (connections.length === 0) return;

            // Create a lookup for card positions for O(1) access
            const cardMap = new Map();
            cards.forEach(c => cardMap.set(c.id, c));

            ctx.save();
            // We apply the same transform as the cards layer
            ctx.translate(offset.x, offset.y);
            ctx.scale(scale, scale);

            ctx.lineWidth = 4 / scale; // Slightly thicker for visibility
            ctx.strokeStyle = document.documentElement.classList.contains('dark')
                ? 'rgba(129, 140, 248, 0.5)'
                : 'rgba(99, 102, 241, 0.6)';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            connections.forEach(conn => {
                const fromCard = cardMap.get(conn.from);
                const toCard = cardMap.get(conn.to);

                if (!fromCard || !toCard) return;

                const { source, target } = getBestAnchorPair(fromCard, toCard);

                // Exclude source and target from obstacles to avoid routing around yourself
                const routingObstacles = obstacles.filter(o =>
                    !(o.left === fromCard.x && o.top === fromCard.y) &&
                    !(o.left === toCard.x && o.top === toCard.y)
                );

                const points = findSmartPath(source, target, routingObstacles);
                const pathData = generateRoundedPath(points);

                // Use Path2D for efficient rendering of SVG-like paths
                const path = new Path2D(pathData);
                ctx.stroke(path);
            });

            ctx.restore();
        };

        // Use requestAnimationFrame to debounce renders and prevent main thread blocking
        let rafId = null;
        const scheduleRender = () => {
            if (rafId !== null) return; // Already scheduled
            rafId = requestAnimationFrame(() => {
                render();
                rafId = null;
            });
        };

        scheduleRender(); // Initial render

        return () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            window.removeEventListener('resize', resize);
        };
    }, [cards, connections, scale, offset, obstacles]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
