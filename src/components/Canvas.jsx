
import React, { useRef, useEffect, useState } from 'react';
import Card from './Card';

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
    isConnecting,
    connectionStartId
}) {
    const canvasRef = useRef(null);
    const [panning, setPanning] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    // Config for smooth feel
    const ZOOM_sensitivity = 0.005; // Finer control
    const PAN_sensitivity = 1.0;

    // Ref to access current state in native event listeners without closure staleness
    const stateRef = useRef({ scale: 1, offset: { x: 0, y: 0 } });

    // Sync ref with state
    useEffect(() => {
        stateRef.current.scale = scale;
        stateRef.current.offset = offset;
    }, [scale, offset]);

    // Convert screen to canvas coordinates
    const toCanvasCoords = (clientX, clientY) => {
        return {
            x: (clientX - offset.x) / scale,
            y: (clientY - offset.y) / scale
        };
    };

    // Only handle panning here. Card movement is delegated to Card component + App handler
    const handleMouseDown = (e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            setPanning(true);
            // Clear selection on canvas click
            if (onSelectionChange) onSelectionChange([]);
        }
    };

    const handleCardSelect = (id) => {
        if (!onSelectionChange) return;
        // Simple single selection or toggle for now
        // TODO: Shift+Click logic if needed, but keeping simple for fix
        const newSelection = selectedIds.includes(id) ? [] : [id];
        // Or if we want additive:
        // const newSelection = [id]; 
        onSelectionChange(newSelection);
    };

    const handleMouseMove = (e) => {
        if (panning) {
            setOffset(prev => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY
            }));
        }
    };

    const handleMouseUp = () => {
        setPanning(false);
    };

    // Touch Support for Panning
    const lastTouchRef = useRef(null);

    const handleTouchStart = (e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            setPanning(true);
            if (e.touches.length > 0) {
                lastTouchRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            }
            if (onSelectionChange) onSelectionChange([]);
        }
    };

    const handleTouchMove = (e) => {
        if (panning && e.touches.length > 0) {
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
    }, []); // Empty deps

    /* Removed React onWheel prop since we handle it natively */

    return (
        <div
            ref={canvasRef}
            className="w-full h-full overflow-hidden bg-slate-900 relative cursor-grab active:cursor-grabbing canvas-bg"
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
                backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
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

                        // Calculate centers (approximate, assuming card width 320, height dynamic but starts ~200)
                        const startX = fromCard.x + 160;
                        const startY = fromCard.y + 100; // rough center
                        const endX = toCard.x + 160;
                        const endY = toCard.y + 100;

                        return (
                            <line
                                key={`${conn.from}-${conn.to}-${idx}`}
                                x1={startX}
                                y1={startY}
                                x2={endX}
                                y2={endY}
                                stroke="#94a3b8" // slate-400
                                strokeWidth="3"
                                strokeDasharray="6 4" // Dashed line styling
                                className="opacity-60"
                            />
                        );
                    })}

                    {/* Active Connection Line Preview */}
                    {isConnecting && connectionStartId && (
                        // We'd need mouse position here to draw line to cursor. 
                        // Omitted for simplicity, we rely on "click source, click target" UI.
                        null
                    )}
                </svg>

                {/* Cards Layer */}
                {cards.map(card => (
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
                ))}
            </div>

            {/* Status Indicator */}
            <div className="absolute bottom-4 left-4 text-slate-400 text-xs font-mono pointer-events-none select-none">
                Canvas: {Math.round(offset.x)}, {Math.round(offset.y)} | Objects: {cards.length}
            </div>
        </div>
    );
}
