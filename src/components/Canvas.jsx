import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Card from './Card';
import StickyNote from './StickyNote';
import ConnectionLayer from './ConnectionLayer';
import { getCardRect, isRectIntersect } from '../utils/geometry';
import { useStore } from '../store/useStore';
import ErrorBoundary from './ErrorBoundary';

const ZOOM_sensitivity = 0.01;
const PAN_sensitivity = 1;

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
    const stateRef = useRef({ offset, scale });

    // Keep stateRef fresh for event handlers
    useEffect(() => {
        stateRef.current = { offset, scale };
    }, [offset, scale]);

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
            if (!e.shiftKey) setSelectedIds([]);
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

    // Native wheel and gesture event handlers for stable zoom
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleNativeWheel = (e) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                // Zooming
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
                // Panning
                const currentOffset = stateRef.current.offset;
                setOffset({
                    x: currentOffset.x - e.deltaX * PAN_sensitivity,
                    y: currentOffset.y - e.deltaY * PAN_sensitivity
                });
            }
        };

        let startScale = 1;
        const handleGestureStart = (e) => {
            e.preventDefault();
            startScale = stateRef.current.scale;
        };

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

    // Viewport culling optimization from beta
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
            {/* ConnectionLayer from beta - optimized Canvas rendering */}
            <ConnectionLayer cards={cards} connections={connections} offset={offset} scale={scale} />

            <div
                className="absolute top-0 left-0 w-full h-full origin-top-left transition-transform duration-75 ease-out will-change-transform pointer-events-none"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
            >
                {/* Cards Layer with viewport culling from beta */}
                {visibleCards.map(card => {
                    const Component = card.type === 'note' ? StickyNote : Card;
                    return (
                        <ErrorBoundary key={card.id} level="card">
                            <Component
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
                        </ErrorBoundary>
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
