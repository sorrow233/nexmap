import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Card from './Card';
import StickyNote from './StickyNote';
import ConnectionLayer from './ConnectionLayer';
import { getBestAnchorPair, generateBezierPath, getCardRect, isRectIntersect } from '../utils/geometry';
import { useStore } from '../store/useStore';

export default function Canvas({
    cards,
    connections = [],
    onUpdateCards,
    onCardMove,
    onDragEnd,
    onExpandCard,
    onConnect,
    onDeleteCard,
    isConnecting,
    connectionStartId,
}) {
    const {
        offset, scale, setOffset, setScale,
        selectedIds, setSelectedIds,
        interactionMode, setInteractionMode,
        selectionRect, setSelectionRect
    } = useStore();

    const canvasRef = useRef(null);
    const ZOOM_sensitivity = 0.005;
    const PAN_sensitivity = 1.0;

    const stateRef = useRef({ scale: 1, offset: { x: 0, y: 0 }, interactionMode: 'none', cards: [] });

    useEffect(() => {
        stateRef.current.scale = scale;
        stateRef.current.offset = offset;
        stateRef.current.interactionMode = interactionMode;
        stateRef.current.cards = cards;
    }, [scale, offset, interactionMode, cards]);

    const toCanvasCoords = useCallback((viewX, viewY) => {
        return {
            x: (viewX - offset.x) / scale,
            y: (viewY - offset.y) / scale
        };
    }, [offset, scale]);

    const handleMouseDown = (e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            const isPan = e.button === 1 || e.button === 2 || (e.button === 0 && (e.spaceKey || e.altKey));

            if (isPan) {
                setInteractionMode('panning');
            } else {
                setInteractionMode('selecting');
                setSelectionRect({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
                if (!e.shiftKey) {
                    setSelectedIds([]);
                }
            }
        }
    };

    const handleMouseMove = (e) => {
        if (interactionMode === 'panning') {
            setOffset({
                x: offset.x + e.movementX,
                y: offset.y + e.movementY
            });
        } else if (interactionMode === 'selecting' && selectionRect) {
            const newSelectionRect = { ...selectionRect, x2: e.clientX, y2: e.clientY };
            setSelectionRect(newSelectionRect);

            const xMin = Math.min(newSelectionRect.x1, newSelectionRect.x2);
            const xMax = Math.max(newSelectionRect.x1, newSelectionRect.x2);
            const yMin = Math.min(newSelectionRect.y1, newSelectionRect.y2);
            const yMax = Math.max(newSelectionRect.y1, newSelectionRect.y2);

            const canvasTopLeft = toCanvasCoords(xMin, yMin);
            const canvasBottomRight = toCanvasCoords(xMax, yMax);

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
        }
    };

    const handleMouseUp = () => {
        setInteractionMode('none');
        setSelectionRect(null);
    };

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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleNativeWheel = (e) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const currentScale = stateRef.current.scale;
                const currentOffset = stateRef.current.offset;
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                const canvasX = (mouseX - currentOffset.x) / currentScale;
                const canvasY = (mouseY - currentOffset.y) / currentScale;
                const delta = -e.deltaY * ZOOM_sensitivity;
                const newZoom = Math.min(Math.max(0.1, currentScale + delta), 5);
                const newOffsetX = mouseX - canvasX * newZoom;
                const newOffsetY = mouseY - canvasY * newZoom;
                setScale(newZoom);
                setOffset({ x: newOffsetX, y: newOffsetY });
            } else {
                const currentOffset = stateRef.current.offset;
                setOffset({
                    x: currentOffset.x - e.deltaX * PAN_sensitivity,
                    y: currentOffset.y - e.deltaY * PAN_sensitivity
                });
            }
        };

        canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleNativeWheel);
    }, [setScale, setOffset]);

    // Viewport Culling Logic
    const visibleCards = useMemo(() => {
        const viewportRect = {
            left: (0 - offset.x) / scale - 400, // Buffer zone
            top: (0 - offset.y) / scale - 400,
            right: (window.innerWidth - offset.x) / scale + 400,
            bottom: (window.innerHeight - offset.y) / scale + 400
        };

        return cards.filter(card => {
            // Selected cards or generating cards always render to avoid UI glitches
            if (Array.isArray(selectedIds) && selectedIds.indexOf(card.id) !== -1) return true;

            // Basic culling
            const rect = getCardRect(card);
            return isRectIntersect(viewportRect, rect);
        });
    }, [cards, offset, scale, selectedIds]);

    return (
        <div
            ref={canvasRef}
            className="w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative cursor-grab active:cursor-grabbing canvas-bg transition-colors duration-500"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: `${offset.x}px ${offset.y}px`
            }}
        >
            {/* Connection Layer (Canvas) */}
            <ConnectionLayer
                cards={cards}
                connections={connections}
                scale={scale}
                offset={offset}
            />

            <div
                className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform pointer-events-none"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
            >
                {/* Cards Layer - Cull and Memoize */}
                {visibleCards.map(card => {
                    const Component = card.type === 'note' ? StickyNote : Card;
                    return (
                        <Component
                            key={card.id}
                            data={card}
                            isSelected={Array.isArray(selectedIds) && selectedIds.indexOf(card.id) !== -1}
                            onSelect={handleCardSelect}
                            onMove={onCardMove}
                            onDelete={onDeleteCard}
                            onUpdate={(id, newData) => onUpdateCards(prev => prev.map(c => c.id === id ? { ...c, data: newData } : c))}
                            onDragEnd={onDragEnd}
                            onConnect={() => onConnect && onConnect(card.id)}
                            onExpand={() => onExpandCard(card.id)}
                            isConnecting={isConnecting}
                            isConnectionStart={connectionStartId === card.id}
                            scale={scale}
                        />
                    );
                })}
            </div>

            {/* Status Indicator */}
            <div className="absolute bottom-4 left-4 text-slate-400 text-xs font-mono pointer-events-none select-none">
                Canvas: {Math.round(offset.x)}, {Math.round(offset.y)} | Objects: {visibleCards.length}/{cards.length} | Zoom: {scale.toFixed(2)}
            </div>

            {/* Rubber Band Selection Rect */}
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
        </div>
    );
}

