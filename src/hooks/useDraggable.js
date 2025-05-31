import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

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
        origY: 0
    });

    const handleStart = (e, clientX, clientY) => {
        if (disabled) return;
        if (e.target.closest('button') || e.target.closest('.no-drag') || e.target.closest('.custom-scrollbar')) return;

        e.stopPropagation();

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
            origY: y
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
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            if (e.type === 'touchmove' && e.cancelable) e.preventDefault();

            const { startX, startY, origX, origY } = dragDataRef.current;
            const currentScale = useStore.getState().scale || 1;

            const dx = (clientX - startX) / currentScale;
            const dy = (clientY - startY) / currentScale;

            if (!hasDraggedRef.current && (Math.abs(clientX - startX) > dragThreshold || Math.abs(clientY - startY) > dragThreshold)) {
                hasDraggedRef.current = true;
                pendingDeselectRef.current = false;
            }

            if (hasDraggedRef.current && onMove) {
                onMove(id, origX + dx, origY + dy, cmdKeyPressedRef.current);
            }
        };

        const handleEnd = (e) => {
            setIsDragging(false);
            const dragHappened = hasDraggedRef.current;

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
                // For touch end, coordinates might be tricky.
                // We'll try to get them from changedTouches if available.
                const clientX = (e.type === 'touchend' || e.type === 'touchcancel') ? (e.changedTouches ? e.changedTouches[0].clientX : 0) : e.clientX;
                const clientY = (e.type === 'touchend' || e.type === 'touchcancel') ? (e.changedTouches ? e.changedTouches[0].clientY : 0) : e.clientY;

                const { startX, startY, origX, origY } = dragDataRef.current;
                const currentScale = useStore.getState().scale || 1;

                const dx = (clientX - startX) / currentScale;
                const dy = (clientY - startY) / currentScale;

                onDragEnd(id, origX + dx, origY + dy, cmdKeyPressedRef.current);
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
