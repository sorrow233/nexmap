import React, { useEffect, useRef } from 'react';
import { getBestAnchorPair, generateBezierPath } from '../utils/geometry';

/**
 * ConnectionLayer
 * 
 * Optimized to strictly separate Path Calculation from Render Logic.
 * 
 * 1. Path Calculation:
 *    - Depends ONLY on `cards` and `connections`.
 *    - Updates `pathCacheRef` (Map <key, Path2D>).
 *    - Does NOT run when `offset` or `scale` changes.
 * 
 * 2. Render Loop:
 *    - Uses `requestAnimationFrame`.
 *    - Reads `offset`/`scale` from `transformRef` (updated via effect).
 *    - Uses `pathCacheRef` to draw.
 *    - Clears and transforms canvas context.
 */
const ConnectionLayer = React.memo(function ConnectionLayer({ cards, connections, offset, scale }) {
    const canvasRef = useRef(null);

    // =========================================================================
    // 1. DATA Staging (Refs) - To avoid re-triggering effects unnecessarily
    // =========================================================================

    // Stores pre-calculated Path2D objects -> O(1) lookup during render
    // Key: "fromId-toId"
    const pathCacheRef = useRef(new Map());

    // Stores the previous state of cards to detect movements efficiently
    const prevCardsMapRef = useRef(new Map());

    // Stores the latest transform (View) so the loop can access it without binding to React state
    const transformRef = useRef({ x: 0, y: 0, s: 1 });

    // Signals the render loop that paths have been updated (Content changed)
    const pathVersionRef = useRef(0);

    // Update transformRef whenever view props change.
    // This allows the render loop to "see" the new transform without breaking the loop.
    useEffect(() => {
        transformRef.current = {
            x: offset?.x ?? 0,
            y: offset?.y ?? 0,
            s: scale ?? 1
        };
        // Note: We don't increment pathVersion here. Transform changes are handled
        // by the loop checking against its own lastRenderState.
    }, [offset, scale]);


    // =========================================================================
    // 2. PATH CALCULATION (Content Logic)
    // CRITICAL: This effect MUST depend ONLY on [cards, connections].
    // It must NEVER depend on offset/scale.
    // =========================================================================
    useEffect(() => {
        const pathCache = pathCacheRef.current;
        const prevCardsMap = prevCardsMapRef.current;
        const nextCardsMap = new Map();

        // Index current cards for O(1) lookup
        for (const c of cards) {
            nextCardsMap.set(c.id, c);
        }

        // 1. Detect which cards actually moved/resized
        const movedCardIds = new Set();
        for (const [id, card] of nextCardsMap) {
            const prev = prevCardsMap.get(id);
            if (!prev || prev.x !== card.x || prev.y !== card.y || prev.w !== card.w || prev.h !== card.h) {
                movedCardIds.add(id);
            }
        }

        let hasUpdates = false;
        const activeKeys = new Set();

        // 2. Update connections
        for (const conn of connections) {
            const key = `${conn.from}-${conn.to}`;
            activeKeys.add(key);

            // We recalc if:
            // A) It's not in cache
            // B) Source card moved/changed
            // C) Target card moved/changed
            const isCached = pathCache.has(key);
            const sourceMoved = movedCardIds.has(conn.from);
            const targetMoved = movedCardIds.has(conn.to);

            if (!isCached || sourceMoved || targetMoved) {
                const fromCard = nextCardsMap.get(conn.from);
                const toCard = nextCardsMap.get(conn.to);

                if (fromCard && toCard) {
                    const { source, target } = getBestAnchorPair(fromCard, toCard);
                    const pathData = generateBezierPath(source, target);
                    pathCache.set(key, new Path2D(pathData));
                    hasUpdates = true;
                }
            }
        }

        // 3. Prune stale connections (deleted)
        for (const key of pathCache.keys()) {
            if (!activeKeys.has(key)) {
                pathCache.delete(key);
                hasUpdates = true;
            }
        }

        // 4. Update previous state map for next run
        prevCardsMapRef.current = nextCardsMap;

        // 5. Signal render loop if needed
        if (hasUpdates) {
            pathVersionRef.current += 1;
        }

    }, [cards, connections]); // <--- STRICT DEPENDENCIES


    // =========================================================================
    // 3. RENDER LOOP (View Logic)
    // Manages Canvas drawing synchronized with browser paint.
    // =========================================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true }); // Optimized ctx
        let animationFrameId;

        // State tracking to prevent redundant clears/draws
        let lastRenderState = { x: null, y: null, s: null, v: -1 };

        // Handle canvas resizing
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            // Force redraw after resize
            lastRenderState = { ...lastRenderState, x: null };
        };

        window.addEventListener('resize', resize);
        resize(); // Initial size

        const loop = () => {
            const { x: cx, y: cy, s: cs } = transformRef.current;
            const cv = pathVersionRef.current;

            // Redraw ONLY if View changed (pan/zoom) OR Content changed (pathVersion)
            if (
                cx !== lastRenderState.x ||
                cy !== lastRenderState.y ||
                cs !== lastRenderState.s ||
                cv !== lastRenderState.v
            ) {
                // 1. Clear Screen
                // We user stored dpr logic implicity via canvas width/height, 
                // but for clearRect we need logical coords if we didn't scale context?
                // We DID scale context by dpr. Canvas Size is W*dpr, H*dpr.
                // clearRect(0,0, W, H) clears logical W*H.
                const width = canvas.width / (window.devicePixelRatio || 1);
                const height = canvas.height / (window.devicePixelRatio || 1);
                ctx.clearRect(0, 0, width, height);

                const map = pathCacheRef.current;
                if (map.size > 0) {
                    ctx.save();

                    // 2. Apply Transform (Pan/Zoom)
                    ctx.translate(cx, cy);
                    ctx.scale(cs, cs);

                    // 3. Set Styles
                    // Thin lines relative to zoom? Or constant screen width?
                    // "ctx.lineWidth = 3 / cs" makes line constant physical width on screen (gets thinner in world space as you zoom in)
                    // Usually we want constant SCREEN width for UI lines.
                    ctx.lineWidth = 3 / cs;

                    // Theme detection (cheap check or passed prop would be better, but classList is okay)
                    const isDark = document.documentElement.classList.contains('dark');
                    ctx.strokeStyle = isDark ? 'rgba(129, 140, 248, 0.4)' : 'rgba(99, 102, 241, 0.5)';
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // 4. Draw Paths from Cache
                    for (const path of map.values()) {
                        ctx.stroke(path);
                    }

                    ctx.restore();
                }

                // Update state
                lastRenderState = { x: cx, y: cy, s: cs, v: cv };
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []); // <--- Runs once, loops forever

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
