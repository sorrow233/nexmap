import React, { useEffect, useRef } from 'react';
import { getBestAnchorPair, generateBezierPath } from '../utils/geometry';

/**
 * ConnectionLayer renders all connections between cards using Path2D on an HTML5 Canvas.
 * This is significantly more performant than SVG for many connections.
 * 
 * Performance Note:
 * This component uses a direct requestAnimationFrame loop for smooth rendering.
 * This avoids React state updates (useState) during animation, which would cause
 * excessive re-renders.
 */
const ConnectionLayer = React.memo(function ConnectionLayer({ cards, connections, offset, scale }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let animationFrameId;

        // Track last drawn state to avoid unnecessary redraws
        let lastTransform = { x: null, y: null, s: null };

        // Resize canvas to fill viewport
        const resize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            // Force redraw on resize
            lastTransform = { x: null, y: null, s: null };
        };

        resize();
        window.addEventListener('resize', resize);

        // Create a lookup for card positions for O(1) access
        const cardMap = new Map();
        cards.forEach(c => cardMap.set(c.id, c));

        // ========== PATH CACHING OPTIMIZATION ==========
        // Compute all connection paths ONCE when cards or connections change
        // This is the key optimization: paths are NOT recomputed on canvas pan/zoom
        const pathCache = new Map();

        connections.forEach(conn => {
            const fromCard = cardMap.get(conn.from);
            const toCard = cardMap.get(conn.to);
            if (!fromCard || !toCard) return;

            const { source, target } = getBestAnchorPair(fromCard, toCard);
            const pathData = generateBezierPath(source, target);
            const path = new Path2D(pathData);

            pathCache.set(`${conn.from}-${conn.to}`, path);
        });
        // ================================================

        // Main render loop - now only handles drawing, not path computation
        const loop = () => {
            // Use plain offset and scale values
            const cx = offset?.x ?? 0;
            const cy = offset?.y ?? 0;
            const cs = scale ?? 1;

            // Only redraw if transform changed significantly, or if we haven't drawn yet
            if (
                cx !== lastTransform.x ||
                cy !== lastTransform.y ||
                cs !== lastTransform.s
            ) {
                ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

                if (pathCache.size > 0) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.scale(cs, cs);

                    ctx.lineWidth = 3 / cs; // Keep stroke thickness constant regardless of zoom
                    ctx.strokeStyle = document.documentElement.classList.contains('dark')
                        ? 'rgba(129, 140, 248, 0.4)'
                        : 'rgba(99, 102, 241, 0.5)';
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // Draw cached paths - NO path computation here!
                    connections.forEach(conn => {
                        const cachedPath = pathCache.get(`${conn.from}-${conn.to}`);
                        if (cachedPath) {
                            ctx.stroke(cachedPath);
                        }
                    });

                    ctx.restore();
                }

                lastTransform = { x: cx, y: cy, s: cs };
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, [cards, connections, offset, scale]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
