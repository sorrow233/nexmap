import React, { useRef, useEffect, useState } from 'react';
import Card from './Card';
import StickyNote from './StickyNote';
import { getBestAnchorPair, generateBezierPath, getCardRect, isRectIntersect } from '../utils/geometry';
import { useStore } from '../store/useStore';

export default function Canvas({
    cards, // Still passed from App for now as it handles cloud sync
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
    // const [interactionMode, setInteractionMode] = useState('none'); // Replaced by useStore
    // const [selectionRect, setSelectionRect] = useState(null); // Replaced by useStore

    // Config for smooth feel
    const ZOOM_sensitivity = 0.005; // Finer control
    const PAN_sensitivity = 1.0;

    // Ref to access current state in native event listeners without closure staleness
    const stateRef = useRef({ scale: 1, offset: { x: 0, y: 0 }, interactionMode: 'none', cards: [] });

    // Sync ref with state
    useEffect(() => {
        stateRef.current.scale = scale;
        stateRef.current.offset = offset;
        stateRef.current.interactionMode = interactionMode;
        stateRef.current.cards = cards;
    }, [scale, offset, interactionMode, cards]);

    // Convert view to canvas coordinates
    const toCanvasCoords = (viewX, viewY) => {
        return {
            x: (viewX - offset.x) / scale,
            y: (viewY - offset.y) / scale
        };
    };

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

            // Calculate intersection
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

    const handleCardSelect = (id, e) => {
        const isAdditive = e && (e.shiftKey || e.metaKey || e.ctrlKey);
        if (isAdditive) {
            const newSelection = selectedIds.includes(id)
                ? selectedIds.filter(sid => sid !== id)
                : [...selectedIds, id];
            setSelectedIds(newSelection);
        } else {
            setSelectedIds([id]);
        }
    };

    // Touch Support for Panning/Selection
    const lastTouchRef = useRef(null);

    const handleTouchStart = (e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            if (e.touches.length === 1) {
                setInteractionMode('panning');
                lastTouchRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            }
            if (onSelectionChange && !e.shiftKey) onSelectionChange([]);
        }
    };

    const handleTouchMove = (e) => {
        if (interactionMode === 'panning' && e.touches.length > 0) {
            e.preventDefault();
            const touch = e.touches[0];
            const lastTouch = lastTouchRef.current;
            if (lastTouch) {
                const deltaX = touch.clientX - lastTouch.x;
                const deltaY = touch.clientY - lastTouch.y;
                setOffset({
                    x: offset.x + deltaX,
                    y: offset.y + deltaY
                });
                lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
            }
        }
    };

    const handleTouchEnd = () => {
        setInteractionMode('none');
        lastTouchRef.current = null;
    };

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

        const handleGestureStart = (e) => {
            e.preventDefault();
            startScale = stateRef.current.scale;
        };
        let startScale = 1;

        const handleGestureChange = (e) => {
            e.preventDefault();
            const currentOffset = stateRef.current.offset;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const newScale = Math.min(Math.max(0.1, startScale * e.scale), 5);
            const oldScale = stateRef.current.scale;
            if (Math.abs(newScale - oldScale) < 0.001) return;
            const canvasX_live = (mouseX - currentOffset.x) / oldScale;
            const canvasY_live = (mouseY - currentOffset.y) / oldScale;
            const newOffsetX = mouseX - canvasX_live * newScale;
            const newOffsetY = mouseY - canvasY_live * newScale;
            setScale(newScale);
            setOffset({ x: newOffsetX, y: newOffsetY });
        };

        const handleGestureEnd = (e) => { e.preventDefault(); };

        canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
        canvas.addEventListener('gesturestart', handleGestureStart, { passive: false });
        canvas.addEventListener('gesturechange', handleGestureChange, { passive: false });
        canvas.addEventListener('gestureend', handleGestureEnd, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleNativeWheel);
            canvas.removeEventListener('gesturestart', handleGestureStart);
            canvas.removeEventListener('gesturechange', handleGestureChange);
            canvas.removeEventListener('gestureend', handleGestureEnd);
        };
    }, [setScale, setOffset]);

    return (
        <div
            ref={canvasRef}
            className="w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative cursor-grab active:cursor-grabbing canvas-bg transition-colors duration-500"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{
                backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: `${offset.x}px ${offset.y}px`
            }}
        >
            <div
                className="absolute top-0 left-0 w-full h-full origin-top-left transition-transform duration-75 ease-out will-change-transform pointer-events-none"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
            >
                {/* Connection Lines Layer */}
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
                    {connections.map((conn, idx) => {
                        const fromCard = cards.find(c => c.id === conn.from);
                        const toCard = cards.find(c => c.id === conn.to);
                        if (!fromCard || !toCard) return null;
                        const { source, target } = getBestAnchorPair(fromCard, toCard);
                        const pathData = generateBezierPath(source, target);
                        return (
                            <path
                                key={`${conn.from}-${conn.to}-${idx}`}
                                d={pathData}
                                fill="none"
                                stroke="currentColor"
                                className="text-brand-500/40 dark:text-brand-400/30 transition-all duration-300"
                                strokeWidth="3"
                                strokeLinecap="round"
                                style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.2))' }}
                            />
                        );
                    })}
                </svg>

                {/* Cards Layer */}
                {cards.map(card => {
                    const Component = card.type === 'note' ? StickyNote : Card;
                    return (
                        <Component
                            key={card.id}
                            data={card}
                            isSelected={selectedIds.includes(card.id)}
                            onSelect={handleCardSelect}
                            onMove={(id, x, y) => onCardMove && onCardMove(id, x, y)}
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
                Canvas: {Math.round(offset.x)}, {Math.round(offset.y)} | Scale: {scale.toFixed(2)} | Objects: {cards.length}
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

