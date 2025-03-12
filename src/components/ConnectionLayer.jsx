import React, { useEffect, useRef, useState } from 'react';
import { getBestAnchorPair, getCardRect, generateBezierPath } from '../utils/geometry';

/**
 * ConnectionLayer renders all connections between cards using Path2D on an HTML5 Canvas.
 * This is significantly more performant than SVG for many connections.
 * Now uses animated spring values for real-time sync with card layer during gesture interactions.
 */
const ConnectionLayer = React.memo(function ConnectionLayer({ cards, connections, springValues }) {
    const canvasRef = useRef(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, s: 1 });

    // Subscribe to spring animation values for real-time updates
    useEffect(() => {
        if (!springValues) return;

        const { x, y, s } = springValues;

        // Subscribe to spring changes
        const unsubX = x.onChange(v => setTransform(prev => ({ ...prev, x: v })));
        const unsubY = y.onChange(v => setTransform(prev => ({ ...prev, y: v })));
        const unsubS = s.onChange(v => setTransform(prev => ({ ...prev, s: v })));

        // Initialize with current values
        setTransform({ x: x.get(), y: y.get(), s: s.get() });

        return () => {
            unsubX();
            unsubY();
            unsubS();
        };
    }, [springValues]);

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
            // Apply the same transform as the cards layer using spring values
            ctx.translate(transform.x, transform.y);
            ctx.scale(transform.s, transform.s);

            ctx.lineWidth = 3 / transform.s; // Keep stroke thickness constant regardless of zoom
            ctx.strokeStyle = document.documentElement.classList.contains('dark')
                ? 'rgba(129, 140, 248, 0.4)'
                : 'rgba(99, 102, 241, 0.5)';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

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
    }, [cards, connections, transform]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
