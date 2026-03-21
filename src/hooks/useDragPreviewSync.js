import { useCallback, useEffect, useRef } from 'react';

export function useDragPreviewSync({ buildOverrides, applyOverrides }) {
    const frameRef = useRef(null);
    const pendingPayloadRef = useRef(null);

    const flushDragPreview = useCallback(() => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }

        const payload = pendingPayloadRef.current;
        pendingPayloadRef.current = null;
        if (!payload) return;

        applyOverrides(buildOverrides(payload));
    }, [applyOverrides, buildOverrides]);

    const scheduleDragPreview = useCallback((payload) => {
        pendingPayloadRef.current = payload;

        if (frameRef.current) {
            return;
        }

        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            const nextPayload = pendingPayloadRef.current;
            pendingPayloadRef.current = null;
            if (!nextPayload) return;

            applyOverrides(buildOverrides(nextPayload));
        });
    }, [applyOverrides, buildOverrides]);

    const resetDragPreview = useCallback((emptyOverrides) => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
        pendingPayloadRef.current = null;
        applyOverrides(emptyOverrides);
    }, [applyOverrides]);

    useEffect(() => () => {
        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
        }
    }, []);

    return {
        scheduleDragPreview,
        flushDragPreview,
        resetDragPreview
    };
}
