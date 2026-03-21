import { useState, useEffect, useCallback } from 'react';
import { useGlobalHotkeys } from '../useGlobalHotkeys';
import { isDialogActive, isEventInsideDialog } from '../../utils/dialogScope';

export function useBoardGlobalInput({ isReadOnly }) {
    const [globalImages, setGlobalImages] = useState([]);
    const [clipboard, setClipboard] = useState(null);

    const handleGlobalPaste = useCallback((event) => {
        const items = event.clipboardData.items;
        let hasImage = false;

        for (const item of items) {
            if (item.type.indexOf('image') === -1) continue;
            hasImage = true;
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (loadEvent) => setGlobalImages(prev => [...prev, {
                file,
                previewUrl: URL.createObjectURL(file),
                base64: loadEvent.target.result.split(',')[1],
                mimeType: file.type
            }]);
            reader.readAsDataURL(file);
        }

        if (hasImage) {
            event.preventDefault();
        }
    }, []);

    useGlobalHotkeys(clipboard, setClipboard);

    useEffect(() => {
        const handlePaste = (event) => {
            const isInsideModal = isEventInsideDialog(event) || isDialogActive();
            if (isInsideModal) return;
            handleGlobalPaste(event);
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleGlobalPaste]);

    const handleGlobalImageUpload = useCallback((event) => {
        if (isReadOnly) return;
        const files = Array.from(event.target.files);
        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (loadEvent) => setGlobalImages(prev => [...prev, {
                file,
                previewUrl: URL.createObjectURL(file),
                base64: loadEvent.target.result.split(',')[1],
                mimeType: file.type
            }]);
            reader.readAsDataURL(file);
        });
        event.target.value = '';
    }, [isReadOnly]);

    const removeGlobalImage = useCallback((index) => {
        if (isReadOnly) return;
        setGlobalImages(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[index].previewUrl);
            next.splice(index, 1);
            return next;
        });
    }, [isReadOnly]);

    return {
        globalImages,
        setGlobalImages,
        clipboard,
        handleGlobalPaste,
        handleGlobalImageUpload,
        removeGlobalImage
    };
}
