import { useCallback, useEffect, useRef } from 'react';

const DRAG_PREVIEW_SYNC_MS = 34;

export function useDragPreviewSync({ buildOverrides, applyOverrides }) {
    const timerRef = useRef(null);
    const pendingPayloadRef = useRef(null);

    const flushDragPreview = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const payload = pendingPayloadRef.current;
        pendingPayloadRef.current = null;
        if (!payload) return;

        applyOverrides(buildOverrides(payload));
    }, [applyOverrides, buildOverrides]);

    const scheduleDragPreview = useCallback((payload) => {
        pendingPayloadRef.current = payload;

        if (timerRef.current) {
            return;
        }

        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            const nextPayload = pendingPayloadRef.current;
            pendingPayloadRef.current = null;
            if (!nextPayload) return;

            applyOverrides(buildOverrides(nextPayload));
        }, DRAG_PREVIEW_SYNC_MS);
    }, [applyOverrides, buildOverrides]);

    const resetDragPreview = useCallback((emptyOverrides) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        pendingPayloadRef.current = null;
        applyOverrides(emptyOverrides);
    }, [applyOverrides]);

    useEffect(() => () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    return {
        scheduleDragPreview,
        flushDragPreview,
        resetDragPreview
    };
}
