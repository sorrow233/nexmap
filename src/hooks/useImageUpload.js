import { useState, useEffect } from 'react';
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

    const processFiles = async (files) => {
        for (const file of Array.from(files)) {
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

            const reader = new FileReader();
            reader.onload = (e) => {
                setImages(prev => [...prev, {
                    file: normalizedFile,
                    previewUrl: URL.createObjectURL(normalizedFile),
                    base64: e.target.result.split(',')[1],
                    mimeType: normalizedFile.type
                }]);
            };
            reader.readAsDataURL(normalizedFile);
        }
    };

    const handleImageUpload = (e) => {
        processFiles(e.target.files);
        e.target.value = ''; // Reset input
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        const files = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                files.push(items[i].getAsFile());
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            processFiles(files);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        processFiles(e.dataTransfer.files);
    };

    const removeImage = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            if (newImages[index].previewUrl) {
                URL.revokeObjectURL(newImages[index].previewUrl);
            }
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const clearImages = () => {
        console.log('[useImageUpload] clearImages called, current count:', images.length);
        // Revoke URLs first using current state reference
        images.forEach(img => {
            if (img.previewUrl) {
                URL.revokeObjectURL(img.previewUrl);
            }
        });
        // Then clear the state
        setImages([]);
    };

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach(img => {
                if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
            });
        };
    }, []);

    return {
        images,
        setImages,
        handleImageUpload,
        handlePaste,
        handleDrop,
        removeImage,
        clearImages
    };
}
