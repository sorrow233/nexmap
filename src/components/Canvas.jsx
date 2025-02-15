import { getBestAnchorPair, generateBezierPath, getCardRect, isRectIntersect } from '../utils/geometry';

export default function Canvas({
    cards,
    connections = [],
    selectedIds = [],
    onUpdateCards,
    onCardMove,
    onDragEnd,
    onSelectionChange,
    onExpandCard,
    onConnect,
    onDeleteCard,
    isConnecting,
    connectionStartId,
    offset,
    setOffset,
    scale,
    setScale
}) {
    const canvasRef = useRef(null);
    const [interactionMode, setInteractionMode] = useState('none'); // 'none' | 'panning' | 'selecting'
    const [selectionRect, setSelectionRect] = useState(null); // { x1, y1, x2, y2 } in view-space

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
                // We don't clear selection immediately to allow additive selection if we want later,
                // but for now, standard behavior is clear unless Shift is held.
                if (!e.shiftKey) {
                    onSelectionChange([]);
                }
            }
        }
    };

    const handleMouseMove = (e) => {
        if (interactionMode === 'panning') {
            setOffset(prev => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY
            }));
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

            // If Shift is held, we want to toggle or add? Conventional is additive union.
            if (e.shiftKey) {
                // This is a bit tricky during drag because it flickers if we toggle.
                // Standard behavior: Union of previous selection + current intersected.
                // But for simplicity, let's just do standard box select for now.
                // onSelectionChange([...new Set([...selectedIds, ...intersectedIds])]);
            } else {
                onSelectionChange(intersectedIds);
            }
        }
    };

    const handleMouseUp = () => {
        setInteractionMode('none');
        setSelectionRect(null);
    };

    const handleCardSelect = (id, e) => {
        if (!onSelectionChange) return;

        const isAdditive = e && (e.shiftKey || e.metaKey || e.ctrlKey);

        if (isAdditive) {
            // Toggle selection
            const newSelection = selectedIds.includes(id)
                ? selectedIds.filter(sid => sid !== id)
                : [...selectedIds, id];
            onSelectionChange(newSelection);
        } else {
            // Standard single selection
            onSelectionChange([id]);
        }
    };

    // Touch Support for Panning/Selection
    const lastTouchRef = useRef(null);

    const handleTouchStart = (e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            if (e.touches.length === 1) {
                // Default to panning for touch on background?
                // Or selection if it's a long press? 
                // Let's keep touch as panning for now to avoid confusion.
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
            e.preventDefault(); // Prevent body scroll
            const touch = e.touches[0];
            const lastTouch = lastTouchRef.current;

            if (lastTouch) {
                const deltaX = touch.clientX - lastTouch.x;
                const deltaY = touch.clientY - lastTouch.y;

                setOffset(prev => ({
                    x: prev.x + deltaX,
                    y: prev.y + deltaY
                }));

                lastTouchRef.current = {
                    x: touch.clientX,
                    y: touch.clientY
                };
            }
        }
    };

    const handleTouchEnd = () => {
        setPanning(false);
        lastTouchRef.current = null;
    };

    // Native Wheel & Gesture Support for Trackpad Zoom
    // We attach these natively to support { passive: false } which is required to preventDefault() browser zoom.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleNativeWheel = (e) => {
            e.preventDefault(); // Stop browser back/forward swipe & zoom

            if (e.ctrlKey || e.metaKey) {
                // PINCH ZOOM (Trackpad) or Ctrl+Wheel
                const currentScale = stateRef.current.scale;
                const currentOffset = stateRef.current.offset;

                // Calculate cursor position relative to canvas (before zoom)
                // (mouseX - offsetX) / scale = canvasX
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                const canvasX = (mouseX - currentOffset.x) / currentScale;
                const canvasY = (mouseY - currentOffset.y) / currentScale;

                // Calculate new scale
                // Mac trackpad gives small deltaY for pinch
                const delta = -e.deltaY * ZOOM_sensitivity;
                const newZoom = Math.min(Math.max(0.1, currentScale + delta), 5); // 0.1x to 5x

                // Calculate new offset to keep canvasX/Y under mouseX/Y
                // mouseX = newOffsetX + canvasX * newZoom
                // newOffsetX = mouseX - canvasX * newZoom
                const newOffsetX = mouseX - canvasX * newZoom;
                const newOffsetY = mouseY - canvasY * newZoom;

                setScale(newZoom);
                setOffset({ x: newOffsetX, y: newOffsetY });

            } else {
                // PANNING (Trackpad swipe or Mouse Wheel)
                const currentOffset = stateRef.current.offset;
                setOffset({
                    x: currentOffset.x - e.deltaX * PAN_sensitivity,
                    y: currentOffset.y - e.deltaY * PAN_sensitivity
                });
            }
        };

        // Safari Gesture Events (Native Pinch-to-zoom on trackpad/iOS)
        // Note: gesturestart/change/end are non-standard but vital for smooth Safari pinch
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

            // Calculate center before zoom
            const canvasX = (mouseX - currentOffset.x) / startScale; // Note: use startScale approximation for stability? 
            // Better: use current rendered scale. But for Gesture, e.scale is relative to start.
            // Let's use standard continuous zoom:

            const newScale = Math.min(Math.max(0.1, startScale * e.scale), 5);

            // BUT, we need to know what 'scale' was just a moment ago to calculate offset delta?
            // Actually, we can recalculate offset from scratch based on startScale if we tracked startOffset.
            // Let's keep it simple: just map e.scale relative to startScale.

            // Re-calculate target offset based on the NEW scale
            // Where was the mouse relative to the canvas at the START of the gesture?
            // This is hard because mouse might move. 
            // Simplest robust way: 
            // Just use the math: newOffset = mouse - (mouse - oldOffset) * (newScale / oldScale)
            // But doing this incrementally is tricky.
            // Standard gesture implementation:

            setScale(newScale);

            // To properly center zoom, we strictly need to adjust offset. 
            // For now, let's just apply scale. Trackpad usually uses 'wheel' with ctrlKey for pinch,
            // 'gesture*' is more often for iOS or full-page zoom. 
            // However, on Mac Safari, 'gesturechange' is fired for pinch.

            // Let's apply the same logic as wheel zoom if possible?
            // The issue is e.scale is absolute cumulative scale for the gesture.

            const oldScale = stateRef.current.scale;
            // Avoid divide by zero or tiny updates
            if (Math.abs(newScale - oldScale) < 0.001) return;

            const canvasX_live = (mouseX - currentOffset.x) / oldScale;
            const canvasY_live = (mouseY - currentOffset.y) / oldScale;

            const newOffsetX = mouseX - canvasX_live * newScale;
            const newOffsetY = mouseY - canvasY_live * newScale;

            setOffset({ x: newOffsetX, y: newOffsetY });
        };

        const handleGestureEnd = (e) => {
            e.preventDefault();
        };

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
    }, [setScale, setOffset]); // Listen to prop changes if they swap (unlikely but safe)

    /* Removed React onWheel prop since we handle it natively */

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

            // onWheel handled natively for passive: false support
            style={{
                backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px)', // Works effectively on both light/dark
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
                                style={{
                                    filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.2))'
                                }}
                            />
                        );
                    })}

                    {/* Active Connection Line Preview */}
                    {isConnecting && connectionStartId && (
                        // Future: Follow mouse
                        null
                    )}
                </svg>

                {/* Cards Layer */}
                {cards.map(card => {
                    if (card.type === 'note') {
                        return (
                            <StickyNote
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
                    }
                    return (
                        <Card
                            key={card.id}
                            data={card}
                            isSelected={selectedIds.includes(card.id)}
                            onSelect={handleCardSelect}
                            onMove={(id, x, y) => onCardMove && onCardMove(id, x, y)}
                            onExpand={() => onExpandCard(card.id)}
                            scale={scale}
                            onConnect={() => onConnect && onConnect(card.id)}
                            isConnecting={isConnecting}
                            isConnectionStart={connectionStartId === card.id}
                            onDragEnd={onDragEnd} // Pass it down
                        />
                    );
                })}
            </div>

            {/* Status Indicator */}
            <div className="absolute bottom-4 left-4 text-slate-400 text-xs font-mono pointer-events-none select-none">
                Canvas: {Math.round(offset.x)}, {Math.round(offset.y)} | Objects: {cards.length}
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
