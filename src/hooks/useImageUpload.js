import { useState, useEffect } from 'react';

/**
 * useImageUpload Hook
 * 
 * Manages image selection, preview URLs, Base64 conversion, and cleanup.
 * Shared between BoardGallery and ChatModal.
 */
export default function useImageUpload() {
    const [images, setImages] = useState([]);

    const processFiles = (files) => {
        Array.from(files).forEach(file => {
            // Security: Check file type blacklist/whitelist
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                alert(`File type not allowed: ${file.name}. Only images (JPG, PNG, WebP, GIF) are accepted.`);
                return;
            }

            // Security: Check file size (Max 5MB)
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            if (file.size > MAX_SIZE) {
                alert(`File too large: ${file.name}. Maximum size is 5MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setImages(prev => [...prev, {
                    file,
                    previewUrl: URL.createObjectURL(file),
                    base64: e.target.result.split(',')[1],
                    mimeType: file.type
                }]);
            };
            reader.readAsDataURL(file);
        });
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
