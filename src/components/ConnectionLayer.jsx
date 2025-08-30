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

        // 1. Detect which cards actually moved/resized OR changed color
        const movedCardIds = new Set();
        for (const [id, card] of nextCardsMap) {
            const prev = prevCardsMap.get(id);
            if (!prev ||
                prev.x !== card.x ||
                prev.y !== card.y ||
                prev.w !== card.w ||
                prev.h !== card.h ||
                prev.data?.cardColor !== card.data?.cardColor // Deep check for color change
            ) {
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
                    // Safety check for NaN coordinates which causes rendering errors
                    if (!Number.isFinite(fromCard.x) || !Number.isFinite(fromCard.y) ||
                        !Number.isFinite(toCard.x) || !Number.isFinite(toCard.y)) {
                        continue;
                    }

                    const { source, target } = getBestAnchorPair(fromCard, toCard);
                    const pathData = generateBezierPath(source, target);
                    // Store the Path2D, connection info, and card color for colored connections
                    const cardColor = fromCard.data?.cardColor || null;
                    pathCache.set(key, {
                        path: new Path2D(pathData),
                        fromId: conn.from,
                        toId: conn.to,
                        cardColor: cardColor
                    });
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
        // Added 'd' to track dark mode state
        let lastRenderState = { x: null, y: null, s: null, v: -1, d: null };

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

        // PRE-INIT dark mode matcher to avoid recreating it every frame
        const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');

        const loop = () => {
            const { x: cx, y: cy, s: cs } = transformRef.current;
            const cv = pathVersionRef.current;

            // Check theme state (efficient property access)
            const isDark = document.documentElement.classList.contains('dark') || darkMatcher.matches;

            // Redraw ONLY if View changed (pan/zoom) OR Content changed (pathVersion) OR Theme changed
            if (
                cx !== lastRenderState.x ||
                cy !== lastRenderState.y ||
                cs !== lastRenderState.s ||
                cv !== lastRenderState.v ||
                isDark !== lastRenderState.d
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

                    // 3. Set Base Styles
                    // Thin lines relative to zoom? Or constant screen width?
                    // "ctx.lineWidth = 3 / cs" makes line constant physical width on screen (gets thinner in world space as you zoom in)
                    // Usually we want constant SCREEN width for UI lines.
                    ctx.lineWidth = 3 / cs;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    // 4. Group paths by color for efficient batch drawing
                    const colorGroups = {
                        default: [],
                        rose: [],
                        teal: [],
                        blue: []
                    };

                    for (const entry of map.values()) {
                        const path = entry.path || entry;
                        const color = entry.cardColor || 'default';
                        if (colorGroups[color]) {
                            colorGroups[color].push(path);
                        } else {
                            colorGroups.default.push(path);
                        }
                    }

                    // Color definitions for light/dark mode - Modern Pastels
                    const colors = {
                        default: isDark ? 'rgba(129, 140, 248, 0.4)' : 'rgba(99, 102, 241, 0.5)',
                        rose: isDark ? 'rgba(244, 63, 94, 0.6)' : 'rgba(251, 113, 133, 0.6)', // rose-500/400
                        amber: isDark ? 'rgba(244, 63, 94, 0.6)' : 'rgba(251, 113, 133, 0.6)', // legacy mapping -> rose

                        teal: isDark ? 'rgba(20, 184, 166, 0.6)' : 'rgba(45, 212, 191, 0.6)', // teal-500/400
                        emerald: isDark ? 'rgba(20, 184, 166, 0.6)' : 'rgba(45, 212, 191, 0.6)', // legacy mapping -> teal

                        blue: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(96, 165, 250, 0.6)', // blue-500/400
                        violet: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(96, 165, 250, 0.6)' // legacy mapping -> blue
                    };

                    // Draw each color group
                    for (const [colorKey, paths] of Object.entries(colorGroups)) {
                        if (paths.length > 0) {
                            ctx.strokeStyle = colors[colorKey];
                            for (const path of paths) {
                                ctx.stroke(path);
                            }
                        }
                    }

                    ctx.restore();
                }

                // Update state
                lastRenderState = { x: cx, y: cy, s: cs, v: cv, d: isDark };
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
