import { idbSet, idbGet } from './db/indexedDB';

const IMAGE_PREFIX = 'img_';

export const saveImageToIDB = async (imageId, base64Data) => {
    if (!imageId || !base64Data) return;
    try {
        await idbSet(IMAGE_PREFIX + imageId, base64Data);
        return true;
    } catch (e) {
        console.error('[Storage] Failed to save image to IDB', e);
        return false;
    }
};

export const getImageFromIDB = async (imageId) => {
    if (!imageId) return null;
    try {
        return await idbGet(IMAGE_PREFIX + imageId);
    } catch (e) {
        console.error('[Storage] Failed to get image from IDB', e);
        return null;
    }
};

// Helper: Download image from S3 URL and convert to base64
export const downloadImageAsBase64 = async (url) => {
    try {
        console.log('[S3 Download] Fetching:', url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('text/html') !== -1) {
            throw new Error('Received HTML content instead of image (fetch likely redirected to SPA index)');
        }

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                console.log('[S3 Download] Success:', url.substring(0, 50) + '...');
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('[S3 Download] Failed:', error);
        return null;
    }
};
