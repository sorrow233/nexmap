import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { useSpring, animated, config, to } from '@react-spring/web';
import Card from './Card';
import StickyNote from './StickyNote';
import ConnectionLayer from './ConnectionLayer';
import { getCardRect, isRectIntersect } from '../utils/geometry';
import { useStore } from '../store/useStore';

export default function Canvas() {
    const {
        cards, connections,
        offset, scale, setOffset, setScale,
        selectedIds, setSelectedIds,
        interactionMode, setInteractionMode,
        selectionRect, setSelectionRect,
        generatingCardIds, setExpandedCardId,
        isConnecting,
        connectionStartId,
        handleCardMove, handleCardMoveEnd,
        handleConnect, deleteCard, updateCardFull
    } = useStore();

    const canvasRef = useRef(null);

    // Spring-driven transform for silky smooth motion
    const [{ x, y, s }, api] = useSpring(() => ({
        x: offset.x,
        y: offset.y,
        s: scale,
        config: { ...config.stiff, precision: 0.0001, velocity: 0 }
    }));

    // Help with coordinate calculation - always fresh
    const getVisualCoords = (viewX, viewY) => {
        const currentScale = s.get();
        const currentX = x.get();
        const currentY = y.get();
        return {
            x: (viewX - currentX) / currentScale,
            y: (viewY - currentY) / currentScale
        };
    };

    // Update store for culling and persistence
    const syncStore = useCallback((nx, ny, ns) => {
        setOffset({ x: nx, y: ny });
        setScale(ns);
    }, [setOffset, setScale]);

    // Handle gesture events
    const bind = useGesture(
        {
            onDrag: ({ active, movement: [mx, my], event, memo, first, last, button, xy: [cx, cy], velocity: [vx, vy], direction: [dx, dy] }) => {
                if (first) {
                    const isPanAction = button === 1 || button === 2 || event.spaceKey || event.altKey;
                    const isBackground = event.target === canvasRef.current || event.target.classList.contains('canvas-bg');

                    if (isPanAction) {
                        setInteractionMode('panning');
                        return { type: 'pan', startX: x.get(), startY: y.get() };
                    } else if (isBackground) {
                        setInteractionMode('selecting');
                        setSelectionRect({ x1: cx, y1: cy, x2: cx, y2: cy });
                        if (!event.shiftKey) setSelectedIds([]);
                        return { type: 'select', startX: cx, startY: cy };
                    }
                    return null;
                }

                if (!memo) return;

                if (memo.type === 'pan') {
                    if (active) {
                        api.start({ x: memo.startX + mx, y: memo.startY + my, immediate: true });
                    } else {
                        // Kinetic inertia
                        api.start({
                            x: memo.startX + mx,
                            y: memo.startY + my,
                            config: { ...config.stiff, velocity: [vx * dx, vy * dy] },
                            immediate: false,
                            onRest: () => syncStore(x.get(), y.get(), s.get())
                        });
                    }
                    if (last) syncStore(x.get(), y.get(), s.get());
                } else if (memo.type === 'select') {
                    const newRect = { ...selectionRect, x1: memo.startX, y1: memo.startY, x2: cx, y2: cy };
                    setSelectionRect(newRect);

                    const xMin = Math.min(newRect.x1, newRect.x2);
                    const xMax = Math.max(newRect.x1, newRect.x2);
                    const yMin = Math.min(newRect.y1, newRect.y2);
                    const yMax = Math.max(newRect.y1, newRect.y2);

                    const canvasTopLeft = getVisualCoords(xMin, yMin);
                    const canvasBottomRight = getVisualCoords(xMax, yMax);

                    const selectionCanvasRect = {
                        left: canvasTopLeft.x,
                        top: canvasTopLeft.y,
                        right: canvasBottomRight.x,
                        bottom: canvasBottomRight.y
                    };

                    const intersectedIds = cards
                        .filter(card => isRectIntersect(selectionCanvasRect, getCardRect(card)))
                        .map(card => card.id);

                    setSelectedIds(intersectedIds);

                    if (last) {
                        setInteractionMode('none');
                        setSelectionRect(null);
                    }
                }
                return memo;
            },
            onWheel: ({ event, delta: [wx, wy], ctrlKey, metaKey }) => {
                event.preventDefault();

                if (ctrlKey || metaKey) {
                    const currentScale = s.get();
                    const delta = -wy * 0.01;
                    const nextScale = Math.min(Math.max(0.1, currentScale * (1 + delta)), 5);

                    const mouseX = event.clientX;
                    const mouseY = event.clientY;

                    const canvasX = (mouseX - x.get()) / currentScale;
                    const canvasY = (mouseY - y.get()) / currentScale;

                    const nextX = mouseX - canvasX * nextScale;
                    const nextY = mouseY - canvasY * nextScale;

                    api.start({ x: nextX, y: nextY, s: nextScale, immediate: true });
                    syncStore(nextX, nextY, nextScale);
                } else {
                    const nextX = x.get() - wx;
                    const nextY = y.get() - wy;
                    api.start({ x: nextX, y: nextY, immediate: true });
                    syncStore(nextX, nextY, s.get());
                }
            },
            onPinch: ({ origin: [ox, oy], first, movement: [ms], offset: [scaleFactor], memo, event }) => {
                event.preventDefault();
                if (first) return { startScale: s.get(), startX: x.get(), startY: y.get() };

                const nextScale = Math.min(Math.max(0.1, memo.startScale * scaleFactor), 5);
                const currentScale = s.get();

                const canvasX = (ox - x.get()) / currentScale;
                const canvasY = (oy - y.get()) / currentScale;

                const nextX = ox - canvasX * nextScale;
                const nextY = oy - canvasY * nextScale;

                api.start({ x: nextX, y: nextY, s: nextScale, immediate: true });
                syncStore(nextX, nextY, nextScale);

                return memo;
            }
        },
        {
            target: canvasRef,
            drag: { filterTaps: true, threshold: 5 },
            wheel: { eventOptions: { passive: false } },
            pinch: { eventOptions: { passive: false }, distanceBounds: { min: 0 } }
        }
    );

    // Sync spring when store changes from outside (e.g. initial board load)
    useEffect(() => {
        api.start({ x: offset.x, y: offset.y, s: scale });
    }, [offset.x, offset.y, scale, api]);

    const handleCardSelect = useCallback((id, e) => {
        const isAdditive = e && (e.shiftKey || e.metaKey || e.ctrlKey);
        setSelectedIds(prev => {
            const isArray = Array.isArray(prev);
            if (isAdditive) {
                if (!isArray) return [id];
                return prev.indexOf(id) !== -1 ? prev.filter(sid => sid !== id) : [...prev, id];
            }
            return [id];
        });
    }, [setSelectedIds]);

    const visibleCards = useMemo(() => {
        const viewportRect = {
            left: (0 - offset.x) / scale - 400,
            top: (0 - offset.y) / scale - 400,
            right: (window.innerWidth - offset.x) / scale + 400,
            bottom: (window.innerHeight - offset.y) / scale + 400
        };

        return cards.filter(card => {
            if (Array.isArray(selectedIds) && selectedIds.indexOf(card.id) !== -1) return true;
            if (generatingCardIds && generatingCardIds.has(card.id)) return true;
            return isRectIntersect(viewportRect, getCardRect(card));
        });
    }, [cards, offset, scale, selectedIds, generatingCardIds]);

    return (
        <animated.div
            ref={canvasRef}
            {...bind()}
            className="w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative canvas-bg transition-colors duration-500 touch-none"
            style={{
                backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: to([x, y], (xv, yv) => `${xv}px ${yv}px`)
            }}
        >
            <ConnectionLayer cards={cards} connections={connections} scale={scale} offset={offset} />

            <animated.div
                className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none"
                style={{
                    x,
                    y,
                    scale: s,
                    transformOrigin: '0 0'
                }}
            >
                {visibleCards.map(card => {
                    const Component = card.type === 'note' ? StickyNote : Card;
                    return (
                        <Component
                            key={card.id}
                            data={card}
                            isSelected={Array.isArray(selectedIds) && selectedIds.indexOf(card.id) !== -1}
                            onSelect={handleCardSelect}
                            onMove={handleCardMove}
                            onDelete={() => deleteCard(card.id)}
                            onUpdate={updateCardFull}
                            onDragEnd={handleCardMoveEnd}
                            onConnect={() => handleConnect(card.id)}
                            onExpand={() => setExpandedCardId(card.id)}
                            isConnecting={isConnecting}
                            isConnectionStart={connectionStartId === card.id}
                            scale={scale}
                        />
                    );
                })}
            </animated.div>

            <div className="absolute bottom-4 left-4 text-slate-400 text-xs font-mono pointer-events-none select-none">
                Canvas: {Math.round(offset.x)}, {Math.round(offset.y)} | Objects: {visibleCards.length}/{cards.length} | Zoom: {scale.toFixed(2)}
            </div>

            {interactionMode === 'selecting' && selectionRect && (
                <div
                    className="fixed border border-brand-500 bg-brand-500/10 pointer-events-none z-[9999] rounded-sm"
                    style={{
                        left: Math.min(selectionRect.x1, selectionRect.x2),
                        top: Math.min(selectionRect.y1, selectionRect.y2),
                        width: Math.abs(selectionRect.x1 - selectionRect.x2),
                        height: Math.abs(selectionRect.y1 - selectionRect.y2)
                    }}
                />
            )}
        </animated.div>
    );
}
