import { useEffect, useRef } from 'react';

// Detect device type for optimal sensitivity
// Mouse wheel typically has larger deltaY values (100+)
// Trackpad has smaller, more granular deltaY values
const ZOOM_SENSITIVITY_TRACKPAD = 0.01;
const ZOOM_SENSITIVITY_MOUSE = 0.003; // More sensitive for mouse wheel
const PAN_SENSITIVITY = 1;

// Performance: Throttle limit for Store Updates (ms)
const THROTTLE_MS = 60; // ~16fps logic update, 60fps+ visual update

export function useCanvasGestures(canvasRef, contentRef, stateRef, setScale, setOffset) {
    // Refs to track pending updates for throttling
    const throttleTimeoutRef = useRef(null);
    const pendingStateRef = useRef(null);

    // Apply the visual transform directly to DOM elements
    const applyVisualTransform = (x, y, scale) => {
        // 1. Update Grid Background (Outer Canvas)
        if (canvasRef.current) {
            canvasRef.current.style.backgroundPosition = `${x}px ${y}px`;
        }

        // 2. Update Content Layer (Inner Cards)
        if (contentRef.current) {
            contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        }
    };

    // Throttled Store Sync
    const syncToStore = (x, y, scale) => {
        if (!throttleTimeoutRef.current) {
            // First call: execute immediately? Or wait?
            // Let's execute immediately to start, then throttle subsequent.
            // Actually, setting state triggers React Render. 
            // We want to update React eventually.

            // NOTE: Changing this to TRAILING throttle to avoid "fighting" the visual update immediately
            // But we need 'visibleCards' to update reasonably fast.

            setOffset({ x, y });
            setScale(scale);

            throttleTimeoutRef.current = setTimeout(() => {
                throttleTimeoutRef.current = null;
                // If there's a pending FINAL state that happened while waiting, sync it now
                if (pendingStateRef.current) {
                    const { x: px, y: py, s: ps } = pendingStateRef.current;
                    // Only sync if different from what we just synced? 
                    // Simplest: just sync.
                    setOffset({ x: px, y: py });
                    setScale(ps);
                    pendingStateRef.current = null;
                }
            }, THROTTLE_MS);
        } else {
            // Pending... update the target so the trailer catches it
            pendingStateRef.current = { x, y, s: scale };
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleNativeWheel = (e) => {
            // CRITICAL: Prevent browser navigation (back/forward) on trackpad swipes
            e.preventDefault();

            const currentScale = stateRef.current.scale;
            const currentOffset = stateRef.current.offset;

            let newScale = currentScale;
            let newOffsetX = currentOffset.x;
            let newOffsetY = currentOffset.y;

            if (e.ctrlKey || e.metaKey) {
                // --- ZOOMING ---
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                const canvasX = (mouseX - currentOffset.x) / currentScale;
                const canvasY = (mouseY - currentOffset.y) / currentScale;

                // Auto-detect device
                const isMouse = Math.abs(e.deltaY) > 50;
                const sensitivity = isMouse ? ZOOM_SENSITIVITY_MOUSE : ZOOM_SENSITIVITY_TRACKPAD;

                const delta = -e.deltaY * sensitivity;
                newScale = Math.min(Math.max(0.1, currentScale + delta), 5);
                newOffsetX = mouseX - canvasX * newScale;
                newOffsetY = mouseY - canvasY * newScale;

            } else {
                // --- PANNING ---
                newOffsetX = currentOffset.x - e.deltaX * PAN_SENSITIVITY;
                newOffsetY = currentOffset.y - e.deltaY * PAN_SENSITIVITY;
            }

            // 1. Update Local Ref (Source of Truth for next Event)
            stateRef.current = {
                scale: newScale,
                offset: { x: newOffsetX, y: newOffsetY }
            };

            // 2. Direct DOM Manipulation (Instant Visual Feedback ⚡️)
            applyVisualTransform(newOffsetX, newOffsetY, newScale);

            // 3. Throttled Store Sync (Deferred Logic Update 🐢)
            syncToStore(newOffsetX, newOffsetY, newScale);
        };

        // --- Gesture Handlers (Pinch Zoom) ---
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

            // Calculate new scale
            const newScale = Math.min(Math.max(0.1, startScale * e.scale), 5);

            // If scale hasn't changed enough, skip
            if (Math.abs(newScale - stateRef.current.scale) < 0.001) return;

            // Zoom Source Calculation
            const canvasX_live = (mouseX - currentOffset.x) / stateRef.current.scale;
            const canvasY_live = (mouseY - currentOffset.y) / stateRef.current.scale;

            const newOffsetX = mouseX - canvasX_live * newScale;
            const newOffsetY = mouseY - canvasY_live * newScale;

            // 1. Update Ref
            stateRef.current = {
                scale: newScale,
                offset: { x: newOffsetX, y: newOffsetY }
            };

            // 2. Direct DOM
            applyVisualTransform(newOffsetX, newOffsetY, newScale);

            // 3. Throttled Sync
            syncToStore(newOffsetX, newOffsetY, newScale);
        };

        const handleGestureEnd = (e) => {
            e.preventDefault();
            // Ensure final state is synced immediately on end
            const { offset, scale } = stateRef.current;
            setOffset(offset);
            setScale(scale);
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

            if (throttleTimeoutRef.current) {
                clearTimeout(throttleTimeoutRef.current);
            }
        };
    }, [canvasRef, contentRef, setScale, setOffset]); // Removed stateRef from deps
}
