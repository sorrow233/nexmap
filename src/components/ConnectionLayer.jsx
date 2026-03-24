import React, { useEffect, useRef } from 'react';
import { getBestAnchorPair, generateBezierPath } from '../utils/geometry';
import { isDarkThemeActive, subscribeToThemeChange } from '../utils/theme';
import {
    createAggregatedStrokeGroups,
    createConnectionStrokePalette,
    normalizeConnectionColorKey
} from './connectionLayer/renderCache';

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
const ConnectionLayer = React.memo(function ConnectionLayer({ cards, cardMap, connections, offset, scale }) {
    const canvasRef = useRef(null);

    // =========================================================================
    // 1. DATA Staging (Refs) - To avoid re-triggering effects unnecessarily
    // =========================================================================

    // Stores pre-calculated Path2D objects -> O(1) lookup during render
    // Key: "fromId-toId"
    const pathCacheRef = useRef(new Map());
    const strokeGroupsRef = useRef(new Map());

    // Stores the previous state of cards to detect movements efficiently
    const prevCardsMapRef = useRef(new Map());

    // Stores the latest transform (View) so the loop can access it without binding to React state
    const transformRef = useRef({ x: 0, y: 0, s: 1 });

    // Signals the render loop that paths have been updated (Content changed)
    const pathVersionRef = useRef(0);
    const renderStateRef = useRef({ x: null, y: null, s: null, v: -1, d: null });
    const renderRequestRef = useRef(0);
    const scheduleRenderRef = useRef(() => {});

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
        const nextCardsMap = cardMap || new Map();
        const activeCardIds = new Set();

        if (!cardMap) {
            for (const card of cards) {
                if (card.deletedAt) continue;
                nextCardsMap.set(card.id, card);
            }
        }

        // 1. Detect which cards actually moved/resized OR changed color
        const movedCardIds = new Set();
        for (const [id, card] of nextCardsMap) {
            activeCardIds.add(id);
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
                    const cardColor = normalizeConnectionColorKey(fromCard.data?.cardColor || null);
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

        for (const [id] of prevCardsMap) {
            if (!activeCardIds.has(id)) {
                hasUpdates = true;
                break;
            }
        }

        // 4. Update previous state map for next run
        prevCardsMapRef.current = nextCardsMap;

        // 5. Signal render loop if needed
        if (hasUpdates) {
            strokeGroupsRef.current = createAggregatedStrokeGroups(pathCache);
            pathVersionRef.current += 1;
        }

    }, [cardMap, cards, connections]); // <--- STRICT DEPENDENCIES


    // =========================================================================
    // 3. RENDER LOOP (View Logic)
    // Draw only when the viewport/content actually changed.
    // =========================================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const draw = () => {
            renderRequestRef.current = 0;

            const { x: cx, y: cy, s: cs } = transformRef.current;
            const cv = pathVersionRef.current;
            const isDark = isDarkThemeActive();
            const lastRenderState = renderStateRef.current;

            const hasChanged =
                cx !== lastRenderState.x ||
                cy !== lastRenderState.y ||
                cs !== lastRenderState.s ||
                cv !== lastRenderState.v ||
                isDark !== lastRenderState.d;

            if (!hasChanged) {
                return;
            }

            const dpr = window.devicePixelRatio || 1;
            const width = canvas.width / dpr;
            const height = canvas.height / dpr;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            if (strokeGroupsRef.current.size > 0) {
                const colors = createConnectionStrokePalette(isDark);

                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(cs, cs);
                ctx.lineWidth = 3 / Math.max(cs, 0.001);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                strokeGroupsRef.current.forEach((groupedPath, colorKey) => {
                    ctx.strokeStyle = colors[colorKey] || colors.default;
                    ctx.stroke(groupedPath);
                });

                ctx.restore();
            }

            renderStateRef.current = { x: cx, y: cy, s: cs, v: cv, d: isDark };
        };

        const scheduleRender = () => {
            if (renderRequestRef.current) return;
            renderRequestRef.current = requestAnimationFrame(draw);
        };

        scheduleRenderRef.current = scheduleRender;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            renderStateRef.current = { ...renderStateRef.current, x: null };
            scheduleRender();
        };

        window.addEventListener('resize', resize);
        resize();

        const unsubscribeThemeChange = subscribeToThemeChange(() => {
            renderStateRef.current = { ...renderStateRef.current, d: null };
            scheduleRender();
        }, { emitCurrent: false });

        return () => {
            window.removeEventListener('resize', resize);
            unsubscribeThemeChange();
            if (renderRequestRef.current) {
                cancelAnimationFrame(renderRequestRef.current);
                renderRequestRef.current = 0;
            }
            scheduleRenderRef.current = () => {};
        };
    }, []);

    useEffect(() => {
        scheduleRenderRef.current();
    }, [offset, scale, cardMap, cards, connections]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
