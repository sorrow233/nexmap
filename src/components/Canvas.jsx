import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import Card from './Card';
import StickyNote from './StickyNote';
import ConnectionLayer from './ConnectionLayer';
import ActiveConnectionLayer from './ActiveConnectionLayer';
import { getCardRect, isRectIntersect } from '../utils/geometry';
import { useStore } from '../store/useStore';
import ErrorBoundary from './ErrorBoundary';
import { useCanvasGestures } from '../hooks/useCanvasGestures';
import { useSelection } from '../hooks/useSelection';
import favoritesService from '../services/favoritesService';

export default function Canvas({ onCreateNote }) {
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
        handleConnect, deleteCard, updateCardFull,
        toCanvasCoords, // Now from store
        toggleFavorite, favoritesLastUpdate // For favorites
    } = useStore();

    const canvasRef = useRef(null);
    const stateRef = useRef({ offset, scale });

    // Keep stateRef fresh for event handlers (needed for useCanvasGestures)
    useEffect(() => {
        stateRef.current = { offset, scale };
    }, [offset, scale]);

    // Extracted Logic
    useCanvasGestures(canvasRef, stateRef, setScale, setOffset);
    const { performSelectionCheck } = useSelection();

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

    const lastSelectionCheckRef = useRef(0);

    const handleMouseMove = (e) => {
        if (interactionMode === 'panning') {
            setOffset({
                x: offset.x + e.movementX,
                y: offset.y + e.movementY
            });
        } else if (interactionMode === 'selecting' && selectionRect) {
            const newSelectionRect = { ...selectionRect, x2: e.clientX, y2: e.clientY };
            setSelectionRect(newSelectionRect);

            // Throttle selection calculation to every 50ms
            const now = Date.now();
            if (now - lastSelectionCheckRef.current > 50) {
                performSelectionCheck(newSelectionRect);
                lastSelectionCheckRef.current = now;
            }
        }
    };

    const handleMouseUp = () => {
        // Perform final check to ensure accuracy
        if (interactionMode === 'selecting' && selectionRect) {
            performSelectionCheck(selectionRect);
        }
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

    // Identify "Target" cards (connected to selected cards) for Luminous Guide
    const targetCardIds = useMemo(() => {
        if (!selectedIds || selectedIds.length === 0) return new Set();

        const targets = new Set();
        connections.forEach(conn => {
            if (selectedIds.includes(conn.from)) targets.add(conn.to);
            if (selectedIds.includes(conn.to)) targets.add(conn.from);
        });

        // Exclude selected cards themselves from being "targets"
        selectedIds.forEach(id => targets.delete(id));

        return targets;
    }, [selectedIds, connections]);

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

            {/* NEW: Active "Liquid Light" Connection Layer */}
            <ActiveConnectionLayer
                cards={cards}
                connections={connections}
                selectedIds={selectedIds}
                offset={offset}
                scale={scale}
            />

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
                                isTarget={targetCardIds.has(card.id)}
                                onSelect={handleCardSelect}
                                onMove={handleCardMove}
                                onDelete={() => deleteCard(card.id)}
                                onUpdate={updateCardFull}
                                onDragEnd={handleCardMoveEnd}
                                onConnect={() => handleConnect(card.id)}
                                onExpand={() => setExpandedCardId(card.id)}
                                isConnecting={isConnecting}
                                isConnectionStart={connectionStartId === card.id}
                                onCreateNote={onCreateNote}
                                // Favorites prop (only for Card, StickyNote handles gracefully if it ignores extra props or we check type)
                                isFavorite={card.type !== 'note' ? favoritesService.isFavorite(card.id) : false}
                                onToggleFavorite={() => toggleFavorite(card.id)}
                            />
                        </ErrorBoundary>
                    );
                })}
            </div>

            {/* Status Indicator */}
            <div className="absolute bottom-4 left-4 flex items-center gap-4 pointer-events-none select-none">
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent canvas click
                        useStore.getState().arrangeCards();
                    }}
                    className="pointer-events-auto p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-brand-500 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                    title="Auto Layout"
                >
                    <Sparkles size={16} className="group-hover:animate-pulse" />
                </button>
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
