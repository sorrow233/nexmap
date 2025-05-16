import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { debugLog } from '../utils/debugLogger';

/**
 * A shared hook for handling standardized drag-and-drop behavior 
 * across different canvas elements.
 */
export function useDraggable({
    id,
    x,
    y,
    onSelect,
    onMove,
    onDragEnd,
    onClick, // NEW: For click detection (no movement)
    isSelected,
    disabled = false,
    dragThreshold = 3
}) {
    const [isDragging, setIsDragging] = useState(false);
    const hasDraggedRef = useRef(false);
    const pendingDeselectRef = useRef(false);
    const cmdKeyPressedRef = useRef(false);

    // Internal state for drag calculations
    const dragDataRef = useRef({
        startX: 0,
        startY: 0,
        origX: 0,
        origY: 0,
        lastX: 0,
        lastY: 0
    });

    const handleStart = (e, clientX, clientY) => {
        if (disabled) return;
        if (e.target.closest('button') || e.target.closest('.no-drag') || e.target.closest('.custom-scrollbar')) return;

        e.stopPropagation();

        debugLog.ui(`Drag start: ${id}`, { clientX, clientY, isSelected });

        // Track Cmd/Ctrl key for drag mode
        cmdKeyPressedRef.current = e.metaKey || e.ctrlKey;
        const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey;

        if (onSelect) {
            if (isAdditive) {
                onSelect(id, e);
                pendingDeselectRef.current = false;
            } else if (!isSelected) {
                onSelect(id, e);
                pendingDeselectRef.current = false;
            } else {
                // Already selected, defer potential deselect
                pendingDeselectRef.current = true;
            }
        }

        dragDataRef.current = {
            startX: clientX,
            startY: clientY,
            origX: x,
            origY: y,
            lastX: clientX,
            lastY: clientY
        };

        setIsDragging(true);
        hasDraggedRef.current = false;
    };

    const handleMouseDown = (e) => handleStart(e, e.clientX, e.clientY);

    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        handleStart(e, touch.clientX, touch.clientY);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e) => {
            let clientX, clientY;
            if (e.type === 'touchmove') {
                if (!e.touches || e.touches.length === 0) return;
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            if (clientX === undefined || clientY === undefined) return;
            if (e.type === 'touchmove' && e.cancelable) e.preventDefault();

            const { startX, startY, origX, origY } = dragDataRef.current;
            const currentScale = useStore.getState().scale || 1;

            const dx = (clientX - startX) / currentScale;
            const dy = (clientY - startY) / currentScale;

            if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
                debugLog.error(`NaN detected in dragMove for ${id}`, { dx, dy, scale: currentScale });
                return;
            }

            if (!hasDraggedRef.current && (Math.abs(clientX - startX) > dragThreshold || Math.abs(clientY - startY) > dragThreshold)) {
                hasDraggedRef.current = true;
                pendingDeselectRef.current = false;
                debugLog.ui(`Drag threshold exceeded for ${id}`);
            }

            if (hasDraggedRef.current && onMove) {
                onMove(id, origX + dx, origY + dy, cmdKeyPressedRef.current);
            }

            // Track last known good coordinates
            dragDataRef.current.lastX = clientX;
            dragDataRef.current.lastY = clientY;
        };

        const handleEnd = (e) => {
            setIsDragging(false);
            const dragHappened = hasDraggedRef.current;

            debugLog.ui(`Drag end: ${id}`, { dragHappened });

            // Handle pure click
            if (!dragHappened && onClick) {
                onClick(e);
            }

            if (pendingDeselectRef.current && !dragHappened) {
                if (onSelect) {
                    onSelect(id, { ...e, shiftKey: false, metaKey: false, ctrlKey: false });
                }
            }

            if (dragHappened && onDragEnd) {
                let clientX, clientY;
                if (e.type === 'touchend' || e.type === 'touchcancel') {
                    if (e.changedTouches && e.changedTouches.length > 0) {
                        clientX = e.changedTouches[0].clientX;
                        clientY = e.changedTouches[0].clientY;
                    } else {
                        // Fallback to last known drag data
                        clientX = dragDataRef.current.lastX;
                        clientY = dragDataRef.current.lastY;
                    }
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                if (clientX !== undefined && clientY !== undefined) {
                    const { startX, startY, origX, origY } = dragDataRef.current;
                    const currentScale = useStore.getState().scale || 1;

                    const dx = (clientX - startX) / currentScale;
                    const dy = (clientY - startY) / currentScale;

                    if (Number.isFinite(dx) && Number.isFinite(dy)) {
                        onDragEnd(id, origX + dx, origY + dy, cmdKeyPressedRef.current);
                    }
                }
            }

            pendingDeselectRef.current = false;
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('touchcancel', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('touchcancel', handleEnd);
        };
    }, [isDragging, id, onMove, onDragEnd, onSelect, onClick, dragThreshold]);

    return {
        isDragging,
        hasDragged: hasDraggedRef.current,
        handleMouseDown,
        handleTouchStart
    };
}
