import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, Crosshair, Hand, MousePointer2 } from 'lucide-react';
import Card from './Card';
import StickyNote from './StickyNote';
import Zone from './Zone'; // NEW: Zone Component
import ConnectionLayer from './ConnectionLayer';
import ActiveConnectionLayer from './ActiveConnectionLayer';
import { getCardRect, isRectIntersect } from '../utils/geometry';
import { useStore } from '../store/useStore';
import ErrorBoundary from './ErrorBoundary';
import { useCanvasGestures } from '../hooks/useCanvasGestures';
import { useSelection } from '../hooks/useSelection';
import favoritesService from '../services/favoritesService';
import { useContextMenu } from './ContextMenu';

export default function Canvas({ onCreateNote, onCustomSprout, ...props }) {
    // Granular selectors to prevent unnecessary re-renders
    const cards = useStore(state => state.cards);
    const connections = useStore(state => state.connections);
    const groups = useStore(state => state.groups);
    const offset = useStore(state => state.offset);
    const scale = useStore(state => state.scale);
    const selectedIds = useStore(state => state.selectedIds);
    const interactionMode = useStore(state => state.interactionMode);
    const canvasMode = useStore(state => state.canvasMode);
    const selectionRect = useStore(state => state.selectionRect);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const isConnecting = useStore(state => state.isConnecting);
    const connectionStartId = useStore(state => state.connectionStartId);

    // Actions - stable references, but good to be explicit
    const setOffset = useStore(state => state.setOffset);
    const setScale = useStore(state => state.setScale);
    const setSelectedIds = useStore(state => state.setSelectedIds);
    const setInteractionMode = useStore(state => state.setInteractionMode);
    const setSelectionRect = useStore(state => state.setSelectionRect);
    const setExpandedCardId = useStore(state => state.setExpandedCardId);
    const handleCardMove = useStore(state => state.handleCardMove);
    const handleCardMoveEnd = useStore(state => state.handleCardMoveEnd);
    const handleConnect = useStore(state => state.handleConnect);
    const deleteCard = useStore(state => state.deleteCard);
    const updateCardFull = useStore(state => state.updateCardFull);
    const toggleCanvasMode = useStore(state => state.toggleCanvasMode);

    const { showContextMenu, getCanvasMenuItems } = useContextMenu();
    const canvasRef = useRef(null);
    const stateRef = useRef({ offset, scale });

    // Keep stateRef fresh for event handlers (needed for useCanvasGestures)
    useEffect(() => {
        stateRef.current = { offset, scale };
    }, [offset, scale]);

    // Extracted Logic
    useCanvasGestures(canvasRef, stateRef, setScale, setOffset);
    const { performSelectionCheck } = useSelection();

    // Right-click context menu for canvas
    const handleContextMenu = useCallback((e) => {
        // Only show menu if clicking on canvas background
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            e.preventDefault();
            const canvasX = (e.clientX - offset.x) / scale;
            const canvasY = (e.clientY - offset.y) / scale;

            const menuItems = getCanvasMenuItems(
                { x: canvasX, y: canvasY },
                {
                    onCreateCard: (pos) => {
                        if (props.onCanvasDoubleClick) {
                            props.onCanvasDoubleClick({
                                screenX: e.clientX,
                                screenY: e.clientY,
                                canvasX: pos.x,
                                canvasY: pos.y
                            });
                        }
                    },
                    onCreateNote: (pos) => {
                        if (props.onCreateStandaloneNote) {
                            props.onCreateStandaloneNote('', { x: pos.x, y: pos.y });
                        }
                    },
                    onPaste: () => {
                        // Paste functionality - trigger paste event
                        navigator.clipboard.readText().then(text => {
                            if (text && props.onCanvasDoubleClick) {
                                props.onCanvasDoubleClick({
                                    screenX: e.clientX,
                                    screenY: e.clientY,
                                    canvasX,
                                    canvasY,
                                    pastedText: text
                                });
                            }
                        }).catch(() => { });
                    },
                    canPaste: true // Assume paste is always available
                }
            );

            showContextMenu(e.clientX, e.clientY, menuItems);
        }
    }, [offset, scale, showContextMenu, getCanvasMenuItems, onCreateNote, props]);

    const handleMouseDown = (e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            // In pan mode, left click also pans
            const isPan = canvasMode === 'pan' || e.button === 1 || e.button === 2 || (e.button === 0 && (e.spaceKey || e.altKey));

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
            // Guard: Always show cards with invalid coordinates (they need to be visible for debugging/fixing)
            if (!Number.isFinite(card.x) || !Number.isFinite(card.y)) return true;
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

    const handleDoubleClick = (e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            // Calculate canvas coordinates
            const canvasX = (e.clientX - offset.x) / scale;
            const canvasY = (e.clientY - offset.y) / scale;

            if (props.onCanvasDoubleClick) {
                props.onCanvasDoubleClick({
                    screenX: e.clientX,
                    screenY: e.clientY,
                    canvasX,
                    canvasY
                });
            }
        }
    };

    // Keyboard shortcut: V key to toggle canvas mode (Figma-style)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only trigger if not typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            if (e.key === 'v' || e.key === 'V') {
                toggleCanvasMode();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleCanvasMode]);

    const handleDrop = (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'prompt') {
                // If dropping on background (e.target check is tricky with overlays, checking if NOT a card?)
                // Actually if dropping on a card, the card's onDrop usually fires and stops propagation?
                // We should check e.target.
                // But e.target might be an overlay if we are not careful.
                // Assuming Card handles its own drop and stops propagation.

                const canvasX = (e.clientX - offset.x) / scale;
                const canvasY = (e.clientY - offset.y) / scale;

                if (props.onPromptDrop) {
                    props.onPromptDrop(data, canvasX, canvasY);
                }
            }
        } catch (err) { }
    };

    return (
        <div
            ref={canvasRef}
            className={`w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative canvas-bg transition-colors duration-500 ${canvasMode === 'pan'
                ? 'cursor-grab active:cursor-grabbing'
                : 'cursor-default'
                }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}

            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}

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
                {/* Zones Layer (Behind Cards) */}
                {groups && groups.map(group => (
                    <div key={group.id} className="pointer-events-auto">
                        <Zone
                            group={group}
                            isSelected={false} // Zones selection separate from cards for now? Or maybe just visual?
                        />
                    </div>
                ))}

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
                                onMove={(id, x, y, withConnections) => handleCardMove(id, x, y, withConnections)}
                                onDelete={() => deleteCard(card.id)}
                                onUpdate={updateCardFull}
                                onDragEnd={(id, x, y, withConnections) => handleCardMoveEnd(id, x, y, withConnections)}
                                onConnect={() => handleConnect(card.id)}
                                onExpand={() => setExpandedCardId(card.id)}
                                isConnecting={isConnecting}
                                isConnectionStart={connectionStartId === card.id}
                                onCreateNote={onCreateNote}
                                onCardFullScreen={props.onCardFullScreen ? () => props.onCardFullScreen(card.id) : undefined}
                                onPromptDrop={props.onCardPromptDrop}
                                onCustomSprout={onCustomSprout}
                            />
                        </ErrorBoundary>
                    );
                })}
            </div>

            {/* Status Indicator - raised on mobile to avoid ChatBar overlap */}
            <div className="absolute bottom-20 sm:bottom-4 left-4 flex items-center gap-2 pointer-events-none select-none">
                {/* Canvas Mode Toggle - Modern canvas standard */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleCanvasMode();
                    }}
                    className={`pointer-events-auto p-2 backdrop-blur-md border rounded-lg transition-all shadow-sm group ${canvasMode === 'pan'
                        ? 'bg-brand-500 border-brand-600 text-white hover:bg-brand-600'
                        : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-500 hover:text-brand-500 hover:scale-110'
                        } active:scale-95`}
                    title={canvasMode === 'pan' ? '拖动模式 (V) - 点击切换到选择' : '选择模式 (V) - 点击切换到拖动'}
                >
                    {canvasMode === 'pan' ? (
                        <Hand size={16} className="group-hover:animate-pulse" />
                    ) : (
                        <MousePointer2 size={16} className="group-hover:animate-pulse" />
                    )}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        useStore.getState().focusOnNearestCard();
                    }}
                    className="pointer-events-auto p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-brand-500 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                    title="定位到最近的卡片 / Locate Nearest Card"
                >
                    <Crosshair size={16} className="group-hover:animate-pulse" />
                </button>
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
