import React, { useCallback, useEffect, useRef } from 'react';
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
const ConnectionLayer = React.memo(function ConnectionLayer({ cards, cardMap, connections, offset, scale }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const renderFrameRef = useRef(null);
    const systemDarkModeRef = useRef(false);

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
    const lastRenderStateRef = useRef({
        x: null,
        y: null,
        s: null,
        v: -1,
        d: null,
        width: 0,
        height: 0,
        dpr: 1
    });
    const canvasMetricsRef = useRef({
        width: 0,
        height: 0,
        dpr: 1
    });

    const drawConnections = useCallback(() => {
        renderFrameRef.current = null;

        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

        const { x: cx, y: cy, s: cs } = transformRef.current;
        const cv = pathVersionRef.current;
        const isDark = document.documentElement.classList.contains('dark') || systemDarkModeRef.current;
        const { width, height, dpr } = canvasMetricsRef.current;
        const lastRenderState = lastRenderStateRef.current;

        const hasChanged =
            cx !== lastRenderState.x ||
            cy !== lastRenderState.y ||
            cs !== lastRenderState.s ||
            cv !== lastRenderState.v ||
            isDark !== lastRenderState.d ||
            width !== lastRenderState.width ||
            height !== lastRenderState.height ||
            dpr !== lastRenderState.dpr;

        if (!hasChanged) {
            return;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

        lastRenderStateRef.current = {
            x: cx,
            y: cy,
            s: cs,
            v: cv,
            d: isDark,
            width,
            height,
            dpr
        };
    }, []);

    const scheduleRender = useCallback(() => {
        if (renderFrameRef.current) return;
        renderFrameRef.current = requestAnimationFrame(drawConnections);
    }, [drawConnections]);

    // Update transformRef whenever view props change.
    useEffect(() => {
        transformRef.current = {
            x: offset?.x ?? 0,
            y: offset?.y ?? 0,
            s: scale ?? 1
        };
        scheduleRender();
    }, [offset, scale, scheduleRender]);


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

        for (const [id] of prevCardsMap) {
            if (!activeCardIds.has(id)) {
                hasUpdates = true;
                break;
            }
        }

        // 4. Update previous state map for next run
        prevCardsMapRef.current = nextCardsMap;

        if (hasUpdates) {
            pathVersionRef.current += 1;
            scheduleRender();
        }
    }, [cardMap, cards, connections, scheduleRender]); // <--- STRICT DEPENDENCIES

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        contextRef.current = ctx;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = window.innerWidth;
            const height = window.innerHeight;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            canvasMetricsRef.current = { width, height, dpr };
            lastRenderStateRef.current = {
                ...lastRenderStateRef.current,
                width: 0,
                height: 0,
                dpr: 0
            };

            scheduleRender();
        };

        const darkMatcher = window.matchMedia('(prefers-color-scheme: dark)');
        const handleDarkModeChange = () => {
            systemDarkModeRef.current = darkMatcher.matches;
            scheduleRender();
        };
        const classObserver = new MutationObserver(handleDarkModeChange);

        window.addEventListener('resize', resize);
        systemDarkModeRef.current = darkMatcher.matches;
        if (typeof darkMatcher.addEventListener === 'function') {
            darkMatcher.addEventListener('change', handleDarkModeChange);
        } else if (typeof darkMatcher.addListener === 'function') {
            darkMatcher.addListener(handleDarkModeChange);
        }
        classObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        resize();

        return () => {
            window.removeEventListener('resize', resize);
            if (typeof darkMatcher.removeEventListener === 'function') {
                darkMatcher.removeEventListener('change', handleDarkModeChange);
            } else if (typeof darkMatcher.removeListener === 'function') {
                darkMatcher.removeListener(handleDarkModeChange);
            }
            classObserver.disconnect();
            if (renderFrameRef.current) {
                cancelAnimationFrame(renderFrameRef.current);
                renderFrameRef.current = null;
            }
            contextRef.current = null;
        };
    }, [scheduleRender]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ imageRendering: 'auto' }}
        />
    );
});

export default ConnectionLayer;
