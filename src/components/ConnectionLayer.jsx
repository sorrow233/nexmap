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

        // Index current cards for O(1) lookup - skip soft deleted cards
        for (const c of cards) {
            if (c.deletedAt) continue; // Skip soft-deleted cards
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
    // =========================================================================
    // 3. RENDER LOOP (View Logic) - Optimized with SLEEP MODE 💤
    // =========================================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        let animationFrameId;
        let isRunning = true;
        let idleFrames = 0; // Count frames with no changes

        // State tracking
        let lastRenderState = { x: null, y: null, s: null, v: -1, d: null };

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
            lastRenderState = { ...lastRenderState, x: null }; // Force redraw
            if (!isRunning) startLoop(); // Wake up
        };

        window.addEventListener('resize', resize);
        resize();

        const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');

        // Loop Function
        const loop = () => {
            if (!isRunning) return;

            const { x: cx, y: cy, s: cs } = transformRef.current;
            const cv = pathVersionRef.current;
            const isDark = document.documentElement.classList.contains('dark') || darkMatcher.matches;

            // Check if anything changed
            const hasChanged =
                cx !== lastRenderState.x ||
                cy !== lastRenderState.y ||
                cs !== lastRenderState.s ||
                cv !== lastRenderState.v ||
                isDark !== lastRenderState.d;

            if (hasChanged) {
                idleFrames = 0; // Reset idle counter

                // --- DRAWING LOGIC ---
                const width = canvas.width / (window.devicePixelRatio || 1);
                const height = canvas.height / (window.devicePixelRatio || 1);
                ctx.clearRect(0, 0, width, height);

                const map = pathCacheRef.current;
                if (map.size > 0) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.scale(cs, cs);
                    ctx.lineWidth = 3 / cs;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    const colors = {
                        default: isDark ? 'rgba(129, 140, 248, 0.4)' : 'rgba(99, 102, 241, 0.5)',
                        red: isDark ? 'rgba(244, 63, 94, 0.7)' : 'rgba(244, 63, 94, 0.65)',
                        rose: isDark ? 'rgba(244, 63, 94, 0.7)' : 'rgba(244, 63, 94, 0.65)',
                        orange: isDark ? 'rgba(249, 115, 22, 0.7)' : 'rgba(249, 115, 22, 0.65)',
                        amber: isDark ? 'rgba(245, 158, 11, 0.7)' : 'rgba(251, 191, 36, 0.65)',
                        green: isDark ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.65)',
                        emerald: isDark ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.65)',
                        teal: isDark ? 'rgba(6, 182, 212, 0.7)' : 'rgba(6, 182, 212, 0.65)',
                        blue: isDark ? 'rgba(59, 130, 246, 0.6)' : 'rgba(96, 165, 250, 0.6)',
                        violet: isDark ? 'rgba(124, 58, 237, 0.6)' : 'rgba(167, 139, 250, 0.6)',
                    };

                    const colorGroups = {};
                    for (const key of Object.keys(colors)) colorGroups[key] = [];

                    for (const entry of map.values()) {
                        const path = entry.path || entry;
                        const color = entry.cardColor;
                        if (color && colorGroups[color]) colorGroups[color].push(path);
                        else colorGroups.default.push(path);
                    }

                    for (const [colorKey, paths] of Object.entries(colorGroups)) {
                        if (paths.length > 0) {
                            ctx.strokeStyle = colors[colorKey];
                            for (const path of paths) ctx.stroke(path);
                        }
                    }
                    ctx.restore();
                }

                lastRenderState = { x: cx, y: cy, s: cs, v: cv, d: isDark };
            } else {
                idleFrames++;
            }

            // Sleep Logic: Stop loop if idle for > 120 frames (~2 seconds)
            if (idleFrames > 120) {
                // console.log("💤 ConnectionLayer sleeping...");
                isRunning = false;
                cancelAnimationFrame(animationFrameId);
                return;
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        const startLoop = () => {
            if (!isRunning) {
                // console.log("⏰ ConnectionLayer waking up!");
                isRunning = true;
                idleFrames = 0;
                loop();
            }
        };

        // Initial Start
        loop();

        // Wake up listeners
        // We need to attach startLoop to the refs so the OTHER effects can call it?
        // Actually, the other effects can't access this scope.
        // We need a way to trigger wake up.
        // A simple way is to use a mutable ref attached to the component instance or just expose a method?
        // No, simplest way is:
        // The *dependency array* of this useEffect is empty [], so it never re-runs.
        // But we need to restart the loop when props change.
        // Ah, the previous implementation depended on [] and read from Refs.
        // We need to listen to changes.

        // SOLUTION:
        // We attach the `startLoop` method to a ref that is accessible by the other effects.
        canvasRef.current.__wakeUp = startLoop;

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
            isRunning = false;
        };
    }, []);

    // 4. Wake Up Effect
    // Whenever [offset, scale] or [cards, connections] change, we assume we need to wake up.
    // However, [cards, connections] update `pathVersionRef` via their own effect.
    // [offset, scale] update `transformRef` via their own effect.
    // We can add a simple effect here that watches them and wakes up the canvas.
    useEffect(() => {
        if (canvasRef.current && canvasRef.current.__wakeUp) {
            canvasRef.current.__wakeUp();
        }
    }, [offset, scale, cards, connections]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
