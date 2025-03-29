import { useEffect } from 'react';

const ZOOM_sensitivity = 0.01;
const PAN_sensitivity = 1;

export function useCanvasGestures(canvasRef, stateRef, setScale, setOffset) {
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
    }, [canvasRef, setScale, setOffset]); // Remove stateRef from deps to avoid re-bind loops, it's a ref.
}
