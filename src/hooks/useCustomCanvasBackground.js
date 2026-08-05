import { useEffect, useState } from 'react';
import {
    CUSTOM_CANVAS_BACKGROUNDS_EVENT,
    getCustomCanvasBackgroundBlob,
    loadCustomCanvasBackgroundSettings,
    selectCustomCanvasBackground
} from '../services/customCanvasBackgrounds';

const EMPTY_BACKGROUND = {
    url: '',
    opacity: 0.34,
    isCustom: false,
    isConfigured: false
};

const buildPlaceholderBackground = (boardId) => {
    const settings = loadCustomCanvasBackgroundSettings();
    return {
        ...EMPTY_BACKGROUND,
        opacity: settings.opacity,
        isConfigured: Boolean(
            settings.enabled && selectCustomCanvasBackground(settings.items, boardId)
        )
    };
};

export default function useCustomCanvasBackground(boardId) {
    const [revision, setRevision] = useState(0);
    const [background, setBackground] = useState(() => buildPlaceholderBackground(boardId));

    useEffect(() => {
        const handleChange = () => setRevision(value => value + 1);
        window.addEventListener(CUSTOM_CANVAS_BACKGROUNDS_EVENT, handleChange);
        return () => window.removeEventListener(CUSTOM_CANVAS_BACKGROUNDS_EVENT, handleChange);
    }, []);

    useEffect(() => {
        let active = true;
        let objectUrl = '';
        const settings = loadCustomCanvasBackgroundSettings();
        const selected = settings.enabled
            ? selectCustomCanvasBackground(settings.items, boardId)
            : null;

        setBackground({
            ...EMPTY_BACKGROUND,
            opacity: settings.opacity,
            isConfigured: Boolean(selected)
        });

        if (!selected) {
            return undefined;
        }

        getCustomCanvasBackgroundBlob(selected.id)
            .then((blob) => {
                if (!active) return;
                if (!(blob instanceof Blob)) {
                    setBackground({
                        ...EMPTY_BACKGROUND,
                        opacity: settings.opacity
                    });
                    return;
                }
                objectUrl = URL.createObjectURL(blob);
                setBackground({
                    url: objectUrl,
                    opacity: settings.opacity,
                    isCustom: true,
                    isConfigured: true
                });
            })
            .catch((error) => {
                console.warn('[CanvasBackgrounds] Failed to resolve selected background:', error);
                if (active) {
                    setBackground({
                        ...EMPTY_BACKGROUND,
                        opacity: settings.opacity
                    });
                }
            });

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [boardId, revision]);

    return background;
}
