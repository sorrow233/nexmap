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

    // REFS FOR PROPS
    // We use refs for these to access them inside the animation loop/effects 
    // without triggering re-runs of the effects themselves.
    const pathCacheRef = useRef(new Map());
    const prevCardsMapRef = useRef(new Map());

    // Store latest transform to avoid re-binding loop
    const transformRef = useRef({ x: 0, y: 0, s: 1 });

    // Version counter to signal the render loop that paths have updated
    const pathVersionRef = useRef(0);

    // Update transform ref whenever props change
    useEffect(() => {
        transformRef.current = {
            x: offset?.x ?? 0,
            y: offset?.y ?? 0,
            s: scale ?? 1
        };
        // We do NOT increment pathVersion here because transform changes 
        // don't require path recalculation, just a clearRect + redraw which the loop handles.
    }, [offset, scale]);

    // =========================================================================
    // 1. PATH MANAGEMENT EFFECT
    // This effect runs ONLY when cards or connections change.
    // It updates the pathCacheRef with granular updates.
    // =========================================================================
    useEffect(() => {
        const pathCache = pathCacheRef.current;
        const prevCardsMap = prevCardsMapRef.current;
        const nextCardsMap = new Map();

        // Build map for O(1) access
        cards.forEach(c => nextCardsMap.set(c.id, c));

        // Detect which cards moved
        const movedCardIds = new Set();
        nextCardsMap.forEach((card, id) => {
            const prev = prevCardsMap.get(id);
            // If new card, or position/size moved, mark as moved
            if (!prev || prev.x !== card.x || prev.y !== card.y) {
                movedCardIds.add(id);
            }
        });

        // Also handle deleted cards (though connections usually get deleted too)
        // If a card is deleted, we don't strictly *need* to mark it as moved 
        // because the connection loop below will just fail to find it and clean up.

        let hasUpdates = false;

        // Clean up connections using a Keep list
        const activeKeys = new Set();

        connections.forEach(conn => {
            const key = `${conn.from}-${conn.to}`;
            activeKeys.add(key);

            // Check if we need to recalc
            const isCached = pathCache.has(key);
            const sourceMoved = movedCardIds.has(conn.from);
            const targetMoved = movedCardIds.has(conn.to);

            if (!isCached || sourceMoved || targetMoved) {
                // Recalculate THIS path
                const fromCard = nextCardsMap.get(conn.from);
                const toCard = nextCardsMap.get(conn.to);

                if (fromCard && toCard) {
                    const { source, target } = getBestAnchorPair(fromCard, toCard);
                    const pathData = generateBezierPath(source, target);
                    pathCache.set(key, new Path2D(pathData));
                    hasUpdates = true;
                }
            }
        });

        // Prune stale paths
        for (const key of pathCache.keys()) {
            if (!activeKeys.has(key)) {
                pathCache.delete(key);
                hasUpdates = true;
            }
        }

        // Update previous state
        prevCardsMapRef.current = nextCardsMap;

        // Signal redraw if we changed anything
        if (hasUpdates) {
            pathVersionRef.current += 1;
        }

    }, [cards, connections]);

    // =========================================================================
    // 2. RENDER LOOP EFFECT
    // This handles the actual canvas drawing.
    // It runs once and loops via requestAnimationFrame.
    // =========================================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        let animationFrameId;

        // Track last drawn state to avoid unnecessary redraws
        let lastRenderState = { x: null, y: null, s: null, v: -1 };

        const resize = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            // Force redraw
            lastRenderState = { x: null, y: null, s: null, v: -1 };
        };

        resize();
        window.addEventListener('resize', resize);

        const loop = () => {
            const { x: cx, y: cy, s: cs } = transformRef.current;
            const cv = pathVersionRef.current;

            // Only redraw if transform changed OR paths changed (version bumped)
            if (
                cx !== lastRenderState.x ||
                cy !== lastRenderState.y ||
                cs !== lastRenderState.s ||
                cv !== lastRenderState.v
            ) {
                // Determine clear area? For now just clear all
                // NOTE: dividing by dpr because we scaled the context by dpr
                ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

                const pathCache = pathCacheRef.current;

                if (pathCache.size > 0) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.scale(cs, cs);

                    // Style
                    ctx.lineWidth = 3 / cs;
                    ctx.strokeStyle = document.documentElement.classList.contains('dark')
                        ? 'rgba(129, 140, 248, 0.4)'
                        : 'rgba(99, 102, 241, 0.5)';
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // Draw all cached paths
                    for (const path of pathCache.values()) {
                        ctx.stroke(path);
                    }

                    ctx.restore();
                }

                lastRenderState = { x: cx, y: cy, s: cs, v: cv };
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, []); // Empty dependency array = runs once

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
