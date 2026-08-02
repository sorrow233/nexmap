import { useState, useEffect, useRef, useCallback } from 'react';
import {
    getAcceptedImageTypeLabel,
    isSupportedImageUploadFile,
    normalizeImageUploadFile
} from '../services/image/uploadImageNormalizer';

/**
 * useImageUpload Hook
 * 
 * Manages image selection, preview URLs, Base64 conversion, and cleanup.
 * Shared between BoardGallery and ChatModal.
 */
export default function useImageUpload(options = {}) {
    const {
        maxFileSizeBytes = null // null = unlimited for local-only chat image flow
    } = options;
    const [images, setImages] = useState([]);
    const imagesRef = useRef(images);

    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    const processFiles = useCallback(async (files) => {
        const selectedFiles = Array.from(files || []).filter(Boolean);
        const processedImages = [];

        for (const file of selectedFiles) {
            // Security: Check file type blacklist/whitelist
            if (!isSupportedImageUploadFile(file)) {
                alert(`File type not allowed: ${file.name}. Only images (${getAcceptedImageTypeLabel()}) are accepted.`);
                continue;
            }

            let normalizedFile = file;
            try {
                normalizedFile = await normalizeImageUploadFile(file);
            } catch (error) {
                console.error('[useImageUpload] Failed to normalize uploaded image', error);
                alert(`Failed to process image: ${file.name}. Please convert it to JPG or PNG and try again.`);
                continue;
            }

            // Optional file size guard. Disabled by default in local-only workflow.
            if (typeof maxFileSizeBytes === 'number' && maxFileSizeBytes > 0 && normalizedFile.size > maxFileSizeBytes) {
                const maxMB = (maxFileSizeBytes / (1024 * 1024)).toFixed(1);
                alert(`File too large: ${normalizedFile.name}. Maximum size is ${maxMB}MB.`);
                continue;
            }

            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target.result.split(',')[1]);
                    reader.onerror = () => reject(reader.error || new Error('Failed to read image file.'));
                    reader.readAsDataURL(normalizedFile);
                });

                processedImages.push({
                    file: normalizedFile,
                    previewUrl: URL.createObjectURL(normalizedFile),
                    base64,
                    mimeType: normalizedFile.type
                });
            } catch (error) {
                console.error('[useImageUpload] Failed to read uploaded image', error);
                alert(`Failed to read image: ${file.name}. Please try again.`);
            }
        }

        if (processedImages.length > 0) {
            setImages(prev => [...prev, ...processedImages]);
        }
    }, [maxFileSizeBytes]);

    const handleImageUpload = useCallback((e) => {
        const input = e.currentTarget || e.target;
        const files = Array.from(input?.files || []);
        if (input) input.value = ''; // Reset input before async processing.
        void processFiles(files);
    }, [processFiles]);

    const handlePaste = useCallback((e) => {
        const items = e.clipboardData?.items || [];
        const files = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                files.push(items[i].getAsFile());
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            void processFiles(files);
        }
    }, [processFiles]);

    const handleDrop = useCallback((e) => {
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        void processFiles(files);
    }, [processFiles]);

    const removeImage = useCallback((index) => {
        setImages(prev => {
            const newImages = [...prev];
            if (!newImages[index]) return prev;
            if (newImages[index].previewUrl) {
                URL.revokeObjectURL(newImages[index].previewUrl);
            }
            newImages.splice(index, 1);
            return newImages;
        });
    }, []);

    const clearImages = useCallback(() => {
        setImages(prev => {
            prev.forEach(img => {
                if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
            });
            return [];
        });
    }, []);

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            imagesRef.current.forEach(img => {
                if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
            });
        };
    }, []);

    return {
        images,
        setImages,
        processFiles,
        handleImageUpload,
        handlePaste,
        handleDrop,
        removeImage,
        clearImages
    };
}
