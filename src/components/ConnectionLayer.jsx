import React, { useEffect, useRef } from 'react';
import { getBestAnchorPair, generateBezierPath } from '../utils/geometry';

/**
 * ConnectionLayer renders all connections between cards using Path2D on an HTML5 Canvas.
 * This is significantly more performant than SVG for many connections.
 */
const ConnectionLayer = React.memo(function ConnectionLayer({ cards, connections, scale, offset }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Resize canvas to fill viewport
        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
        };

        resize();
        window.addEventListener('resize', resize);

        // Render loop/function
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (connections.length === 0) return;

            // Create a lookup for card positions for O(1) access
            const cardMap = new Map();
            cards.forEach(c => cardMap.set(c.id, c));

            ctx.save();
            // We apply the same transform as the cards layer
            ctx.translate(offset.x, offset.y);
            ctx.scale(scale, scale);

            ctx.lineWidth = 3 / scale; // Keep stroke thickness constant regardless of zoom
            ctx.strokeStyle = document.documentElement.classList.contains('dark')
                ? 'rgba(129, 140, 248, 0.3)'
                : 'rgba(99, 102, 241, 0.4)';
            ctx.lineCap = 'round';

            connections.forEach(conn => {
                const fromCard = cardMap.get(conn.from);
                const toCard = cardMap.get(conn.to);

                if (!fromCard || !toCard) return;

                const { source, target } = getBestAnchorPair(fromCard, toCard);
                const pathData = generateBezierPath(source, target);

                // Use Path2D for efficient rendering of SVG-like paths
                const path = new Path2D(pathData);
                ctx.stroke(path);
            });

            ctx.restore();
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
        };
    }, [cards, connections, scale, offset]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
