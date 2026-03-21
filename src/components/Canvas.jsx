import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Sparkles, Crosshair, Hand, MousePointer2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import CanvasViewportLayer from './canvas/CanvasViewportLayer';
import { useCanvasGestures } from '../hooks/useCanvasGestures';
import { useCanvasPanSync } from '../hooks/useCanvasPanSync';
import { useVisibleCanvasData } from '../hooks/useVisibleCanvasData';
import { useSelection } from '../hooks/useSelection';
import {
    buildCardPositionOverrides,
    resolveDraggedCardIds
} from '../utils/cardDrag';
import InstantTooltip from './InstantTooltip';
import { optimizeImageUrl } from '../utils/imageOptimizer';

const isTextInputElement = (element) => {
    if (!element || !(element instanceof Element)) return false;
    const tagName = element.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') return true;
    if (element.isContentEditable) return true;
    return Boolean(element.closest('[contenteditable="true"]'));
};

const EMPTY_POSITION_OVERRIDES = new Map();

export default function Canvas({
    boardBackgroundImage,
    onCreateNote,
    onCustomSprout,
    onCanvasDoubleClick,
    onCardFullScreen,
    onCardPromptDrop
}) {
    const RIGHT_BUTTON_LONG_PRESS_MS = 220;
    // Granular selectors to prevent unnecessary re-renders
    const cards = useStore(state => state.cards);
    const connections = useStore(state => state.connections);
    const groups = useStore(state => state.groups);
    const offset = useStore(state => state.offset);
    const scale = useStore(state => state.scale);
    const selectedIds = useStore(state => state.selectedIds);
    const interactionMode = useStore(state => state.interactionMode);
    const canvasMode = useStore(state => state.canvasMode);
    const isSpacePanning = useStore(state => state.isSpacePanning);
    const selectionRect = useStore(state => state.selectionRect);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const isConnecting = useStore(state => state.isConnecting);
    const connectionStartId = useStore(state => state.connectionStartId);

    // Actions - stable references, but good to be explicit
    const setOffset = useStore(state => state.setOffset);
    const setScale = useStore(state => state.setScale);
    const setSelectedIds = useStore(state => state.setSelectedIds);
    const setInteractionMode = useStore(state => state.setInteractionMode);
    const setIsSpacePanning = useStore(state => state.setIsSpacePanning);
    const setSelectionRect = useStore(state => state.setSelectionRect);
    const setExpandedCardId = useStore(state => state.setExpandedCardId);
    const handleCardMoveEnd = useStore(state => state.handleCardMoveEnd);
    const handleConnect = useStore(state => state.handleConnect);
    const deleteCard = useStore(state => state.deleteCard);
    const updateCardFull = useStore(state => state.updateCardFull);
    const toggleCanvasMode = useStore(state => state.toggleCanvasMode);
    const canvasRef = useRef(null);
    const contentRef = useRef(null); // Reference for Direct DOM Manipulation
    const stateRef = useRef({ offset, scale });
    const rightPressTimerRef = useRef(null);
    const isRightHoldPanningRef = useRef(false);
    const isSpaceHoldPanningRef = useRef(false);
    const suppressNextContextToggleRef = useRef(false);
    const [dragPositionOverrides, setDragPositionOverrides] = React.useState(EMPTY_POSITION_OVERRIDES);

    const {
        cardSpatialIndex,
        visibleCards,
        visibleConnections,
        connectionCards,
        connectionCardMap,
        visibleGroups,
        selectedIdSet,
        targetCardIds
    } = useVisibleCanvasData({
        cards,
        connections,
        groups,
        offset,
        scale,
        selectedIds,
        generatingCardIds,
        positionOverrides: dragPositionOverrides
    });

    // Keep stateRef fresh for event handlers (needed for useCanvasGestures)
    useEffect(() => {
        stateRef.current = { offset, scale };
    }, [offset, scale]);

    // Keep DOM transform/background in sync with canonical store state.
    // This avoids occasional style conflicts with gesture-level direct DOM updates.
    useLayoutEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.style.backgroundPosition = `${offset.x}px ${offset.y}px`;
        }
        if (contentRef.current) {
            contentRef.current.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
        }
    }, [offset, scale]);

    // Extracted Logic - Now with Direct DOM capabilities
    useCanvasGestures(canvasRef, contentRef, stateRef, setScale, setOffset);
    const { applyPanDelta, flushPanSync } = useCanvasPanSync({
        canvasRef,
        contentRef,
        stateRef,
        setOffset
    });
    const { performSelectionCheck } = useSelection(cardSpatialIndex);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code !== 'Space') return;

            const target = e.target instanceof Element ? e.target : null;
            const activeEl = document.activeElement;
            if (isTextInputElement(target) || isTextInputElement(activeEl)) return;

            e.preventDefault();
            setIsSpacePanning(true);
        };

        const handleKeyUp = (e) => {
            if (e.code !== 'Space') return;

            e.preventDefault();
            setIsSpacePanning(false);

            if (isSpaceHoldPanningRef.current) {
                isSpaceHoldPanningRef.current = false;
                setInteractionMode('none');
                setSelectionRect(null);
            }
        };

        const handleWindowBlur = () => {
            setIsSpacePanning(false);

            if (isSpaceHoldPanningRef.current) {
                isSpaceHoldPanningRef.current = false;
                setInteractionMode('none');
                setSelectionRect(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { passive: false });
        window.addEventListener('keyup', handleKeyUp, { passive: false });
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleWindowBlur);
            setIsSpacePanning(false);
        };
    }, [setInteractionMode, setIsSpacePanning, setSelectionRect]);

    // Right-click canvas background: toggle select/pan mode
    const handleContextMenu = useCallback((e) => {
        // Only handle background right-click; keep card/connection context menus intact
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            e.preventDefault();
            if (rightPressTimerRef.current) {
                clearTimeout(rightPressTimerRef.current);
                rightPressTimerRef.current = null;
            }
            if (suppressNextContextToggleRef.current) {
                suppressNextContextToggleRef.current = false;
                return;
            }
            toggleCanvasMode();
        }
    }, [toggleCanvasMode]);

    const handleMouseDown = (e) => {
        // Ensure we are clicking on the canvas or background layers, not interactive elements like cards/buttons
        // Interactive elements should call e.stopPropagation()
        const target = e.target;
        const isInteractive = target.closest('button') || target.closest('.no-drag') || target.closest('.card-sharp-selected') || target.classList.contains('card-ref-link');

        if (!isInteractive) {
            const isCanvasBackground = target === canvasRef.current || target.classList.contains('canvas-bg');

            // Right-click hold on canvas background: temporary pan mode
            if (e.button === 2 && isCanvasBackground) {
                suppressNextContextToggleRef.current = false;
                isRightHoldPanningRef.current = false;
                isSpaceHoldPanningRef.current = false;

                if (rightPressTimerRef.current) {
                    clearTimeout(rightPressTimerRef.current);
                }

                rightPressTimerRef.current = setTimeout(() => {
                    isRightHoldPanningRef.current = true;
                    suppressNextContextToggleRef.current = true;
                    setInteractionMode('panning');
                }, RIGHT_BUTTON_LONG_PRESS_MS);
                return;
            }

            // In pan mode, left click also pans
            // Right-click is now reserved for mode toggle (see handleContextMenu), not temporary pan.
            const isPan = canvasMode === 'pan' || e.button === 1 || (e.button === 0 && isSpacePanning);

            if (isPan) {
                isSpaceHoldPanningRef.current = e.button === 0 && isSpacePanning;
                setInteractionMode('panning');
            } else {
                isSpaceHoldPanningRef.current = false;
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
            applyPanDelta(e.movementX, e.movementY);
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
        if (rightPressTimerRef.current) {
            clearTimeout(rightPressTimerRef.current);
            rightPressTimerRef.current = null;
        }

        if (interactionMode === 'panning') {
            flushPanSync();
        }

        if (isRightHoldPanningRef.current) {
            isRightHoldPanningRef.current = false;
            isSpaceHoldPanningRef.current = false;
            setInteractionMode('none');
            setSelectionRect(null);
            return;
        }

        // Perform final check to ensure accuracy
        if (interactionMode === 'selecting' && selectionRect) {
            performSelectionCheck(selectionRect);
        }
        setInteractionMode('none');
        setSelectionRect(null);
        isSpaceHoldPanningRef.current = false;
    };

    useEffect(() => {
        return () => {
            if (rightPressTimerRef.current) {
                clearTimeout(rightPressTimerRef.current);
            }
        };
    }, []);

    const handleCardSelect = useCallback((id, e) => {
        const isAdditive = e && (e.shiftKey || e.metaKey || e.ctrlKey);
        setSelectedIds(prev => {
            const isArray = Array.isArray(prev);
            if (isAdditive) {
                if (!isArray) return [id];
                const selectedSet = new Set(prev);
                if (selectedSet.has(id)) {
                    return prev.filter(sid => sid !== id);
                }
                return [...prev, id];
            }
            return [id];
        });
    }, [setSelectedIds]);

    const handleCardPreviewMove = useCallback((id, newX, newY, moveWithConnections = false) => {
        const {
            cards: sourceCards,
            connections: sourceConnections,
            selectedIds: sourceSelectedIds
        } = useStore.getState();

        const sourceCard = sourceCards.find((card) => card.id === id);
        if (!sourceCard) return;

        const dx = newX - sourceCard.x;
        const dy = newY - sourceCard.y;

        if (dx === 0 && dy === 0) {
            setDragPositionOverrides(EMPTY_POSITION_OVERRIDES);
            return;
        }

        const moveIds = resolveDraggedCardIds({
            cardId: id,
            selectedIds: sourceSelectedIds,
            connections: sourceConnections,
            moveWithConnections
        });

        setDragPositionOverrides(buildCardPositionOverrides(sourceCards, moveIds, dx, dy));
    }, []);

    const handleCardCommitMove = useCallback((id, newX, newY, moveWithConnections = false) => {
        handleCardMoveEnd(id, newX, newY, moveWithConnections);
        setDragPositionOverrides(EMPTY_POSITION_OVERRIDES);
    }, [handleCardMoveEnd]);

    // Touch Support for Panning/Selection
    const lastTouchRef = useRef(null);

    const handleTouchStart = (e) => {
        const target = e.target;
        const isInteractive = target.closest('button') || target.closest('.no-drag') || target.closest('.card-sharp-selected') || target.classList.contains('card-ref-link');

        if (!isInteractive) {
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
                applyPanDelta(deltaX, deltaY);
                lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
            }
        }
    };

    const handleTouchEnd = () => {
        if (interactionMode === 'panning') {
            flushPanSync();
        }
        setInteractionMode('none');
        lastTouchRef.current = null;
    };

    const handleDoubleClick = useCallback((e) => {
        const target = e.target;
        const isInteractive = target.closest('button') || target.closest('.no-drag') || target.closest('.card-sharp-selected') || target.classList.contains('card-ref-link');

        if (!isInteractive) {
            // Calculate canvas coordinates
            const canvasX = (e.clientX - offset.x) / scale;
            const canvasY = (e.clientY - offset.y) / scale;

            if (onCanvasDoubleClick) {
                onCanvasDoubleClick({
                    screenX: e.clientX,
                    screenY: e.clientY,
                    canvasX,
                    canvasY
                });
            }
        }
    }, [offset.x, offset.y, onCanvasDoubleClick, scale]);

    // Handle Drop on Canvas (similar to Paste)
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const canvasX = (e.clientX - offset.x) / scale;
        const canvasY = (e.clientY - offset.y) / scale;

        // Try to get text/url data
        const text = e.dataTransfer.getData('text/plain');
        if (text && onCanvasDoubleClick) {
            onCanvasDoubleClick({
                screenX: e.clientX,
                screenY: e.clientY,
                canvasX,
                canvasY,
                pastedText: text
            });
        }
    }, [offset.x, offset.y, onCanvasDoubleClick, scale]);

    // AI Batch Summary Handler
    const [isSummarizing, setIsSummarizing] = React.useState(false);

    const handleBatchSummary = useCallback(async () => {
        if (isSummarizing) return;
        setIsSummarizing(true);

        try {
            const cards = useStore.getState().cards;
            const config = useStore.getState().getActiveConfig();
            const { aiSummaryService } = await import('../services/aiSummaryService');

            // define simple chunk helper
            const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );

            // Filter cards that are not deleted
            const validCards = cards.filter(c => !c.deletedAt);

            // Chunk into batches of 5
            const batches = chunk(validCards, 5);

            for (const batch of batches) {
                // Determine which cards need summary (optional: currently we can just re-summarize all or check strict need)
                // For "Action" button, usually implies "Do it now for these".
                const summaries = await aiSummaryService.generateBatchSummaries(batch, config);

                // Update store
                Object.entries(summaries).forEach(([cardId, summaryData]) => {
                    updateCardFull(cardId, (prev) => ({
                        ...prev,
                        summary: summaryData // { title, summary }
                    }));
                });
            }

            // Simple Success Toast (can be replaced by formal Toast component if available)
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-[9999] animate-fade-in-up';
            toast.textContent = `✨ Analyzed ${validCards.length} cards`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);

        } catch (error) {
            console.error("Batch Summary Failed", error);
        } finally {
            setIsSummarizing(false);
        }
    }, [isSummarizing, updateCardFull]);

    // Single Card Summary Handler (for manual testing)
    const handleSingleSummary = useCallback(async (cardId) => {
        if (isSummarizing) return;

        // Find the card
        const card = useStore.getState().cards.find(c => c.id === cardId);
        if (!card) return;

        setIsSummarizing(true);
        try {
            const baseConfig = useStore.getState().getActiveConfig();
            const { aiSummaryService } = await import('../services/aiSummaryService');
            // Get the 'sprouting' role model (🌱 想法发芽 / Analysis)
            const sproutingModel = useStore.getState().getRoleModel('sprouting');

            // Merge the specific model into the config for the AI service
            const config = {
                ...baseConfig,
                model: sproutingModel || baseConfig?.model // Ensure model is set
            };

            console.log('[Canvas] AI Summary with config:', config);
            console.log('[Canvas] Using Sprouting Model:', sproutingModel);

            // Reuse service, passing single card as array
            const summaries = await aiSummaryService.generateBatchSummaries([card], config);

            // Update store
            if (summaries[cardId]) {
                updateCardFull(cardId, (prev) => ({
                    ...prev,
                    summary: summaries[cardId]
                }));
                // Simple Toast
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-[9999] animate-fade-in-up';
                toast.textContent = `✨ Summary Generated`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            }
        } catch (error) {
            console.error("Single Summary Failed", error);
            // Error Toast
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-[9999] animate-fade-in-up';
            toast.textContent = `⚠️ Summary Failed: ${error.message}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } finally {
            setIsSummarizing(false);
        }
    }, [isSummarizing, updateCardFull]);

    const normalizedBackgroundUrl = (
        typeof boardBackgroundImage === 'string' && boardBackgroundImage.trim()
            ? optimizeImageUrl(boardBackgroundImage.trim(), 1800)
            : ''
    );

    return (
        <div
            ref={canvasRef}
            className={`w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative canvas-bg transition-colors duration-500 ${interactionMode === 'panning'
                ? 'cursor-grabbing'
                : (canvasMode === 'pan' || isSpacePanning ? 'cursor-grab' : 'cursor-default')
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
                backgroundSize: '24px 24px'
            }}
        >
            {normalizedBackgroundUrl && (
                <div
                    className="absolute inset-0 pointer-events-none bg-cover bg-center opacity-30"
                    style={{ backgroundImage: `url(${normalizedBackgroundUrl})` }}
                />
            )}

            {normalizedBackgroundUrl && (
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(248,250,252,0.08)_0%,rgba(248,250,252,0.16)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.25)_0%,rgba(2,6,23,0.45)_100%)]" />
            )}

            <CanvasViewportLayer
                contentRef={contentRef}
                visibleGroups={visibleGroups}
                connectionCards={connectionCards}
                connectionCardMap={connectionCardMap}
                visibleConnections={visibleConnections}
                visibleCards={visibleCards}
                selectedIdSet={selectedIdSet}
                targetCardIds={targetCardIds}
                isConnecting={isConnecting}
                connectionStartId={connectionStartId}
                onSelect={handleCardSelect}
                onMove={handleCardPreviewMove}
                onDelete={deleteCard}
                onUpdate={updateCardFull}
                onDragEnd={handleCardCommitMove}
                onConnect={handleConnect}
                onExpand={setExpandedCardId}
                onCreateNote={onCreateNote}
                onCardFullScreen={onCardFullScreen}
                onPromptDrop={onCardPromptDrop}
                onCustomSprout={onCustomSprout}
                onSummarize={handleSingleSummary}
                offset={offset}
                scale={scale}
            />

            {/* Status Indicator - raised on mobile to avoid ChatBar overlap */}
            <div className="absolute bottom-20 sm:bottom-4 left-4 flex items-center gap-2 pointer-events-none select-none">
                {/* Canvas Mode Toggle - Modern canvas standard */}
                <InstantTooltip content={canvasMode === 'pan' ? 'Switch to Select Mode (Right Click) · Hold Space to Drag' : 'Switch to Pan Mode (Right Click) · Hold Space to Drag'}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleCanvasMode();
                        }}
                        className={`pointer-events-auto p-2 backdrop-blur-md border rounded-lg transition-all shadow-sm group ${canvasMode === 'pan'
                            ? 'bg-brand-500 border-brand-600 text-white hover:bg-brand-600'
                            : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-500 hover:text-brand-500 hover:scale-110'
                            } active:scale-95`}
                    >
                        {canvasMode === 'pan' ? (
                            <Hand size={16} className="group-hover:animate-pulse" />
                        ) : (
                            <MousePointer2 size={16} className="group-hover:animate-pulse" />
                        )}
                    </button>
                </InstantTooltip>

                <InstantTooltip content="Locate Nearest Card">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            useStore.getState().focusOnNearestCard();
                        }}
                        className="pointer-events-auto p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-brand-500 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                    >
                        <Crosshair size={16} className="group-hover:animate-pulse" />
                    </button>
                </InstantTooltip>

                <InstantTooltip content="Auto Layout">
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent canvas click
                            useStore.getState().arrangeCards();
                        }}
                        className="pointer-events-auto p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:text-brand-500 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                    >
                        <Sparkles size={16} className="group-hover:animate-pulse" />
                    </button>
                </InstantTooltip>

                {/* NEW: AI Auto Read Button - Optimized (HIDDEN for testing phase) */}
                {/* <InstantTooltip content="Generate AI Summaries">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleBatchSummary();
                        }}
                        disabled={isSummarizing}
                        className={`pointer-events-auto p-2 backdrop-blur-md border rounded-lg transition-all shadow-sm group relative overflow-hidden
                            ${isSummarizing
                                ? 'bg-brand-50 border-brand-200 text-brand-400 cursor-wait'
                                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-white/10 text-slate-500 hover:text-violet-500 hover:border-violet-200 hover:scale-110 active:scale-95'
                            }`}
                    >
                        <Bot size={16} className={`${isSummarizing ? 'animate-spin' : 'group-hover:animate-bounce'}`} />
                        {!isSummarizing && <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>}
                    </button>
                </InstantTooltip> */}
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
