import { useEffect, useState } from 'react';
import {
    fetchAndCacheBackgroundBlob,
    getCachedBackgroundBlob,
    isCacheableBackgroundUrl
} from '../services/backgroundImageCache';

export default function useCachedBackgroundImage(sourceUrl) {
    const [resolvedUrl, setResolvedUrl] = useState(sourceUrl || '');

    useEffect(() => {
        const normalizedSourceUrl = typeof sourceUrl === 'string' ? sourceUrl.trim() : '';

        if (!isCacheableBackgroundUrl(normalizedSourceUrl)) {
            setResolvedUrl(normalizedSourceUrl);
            return undefined;
        }

        let isActive = true;
        let cachedObjectUrl = null;
        const abortController = new AbortController();

        const updateResolvedUrl = (nextUrl) => {
            if (!isActive) return;
            setResolvedUrl(nextUrl);
        };

        const assignBlobUrl = (blob) => {
            if (!isActive || !(blob instanceof Blob)) return;
            cachedObjectUrl = URL.createObjectURL(blob);
            updateResolvedUrl(cachedObjectUrl);
        };

        updateResolvedUrl(normalizedSourceUrl);

        const load = async () => {
            try {
                const cachedBlob = await getCachedBackgroundBlob(normalizedSourceUrl);
                if (cachedBlob) {
                    assignBlobUrl(cachedBlob);
                    return;
                }

                const downloadedBlob = await fetchAndCacheBackgroundBlob(normalizedSourceUrl, {
                    signal: abortController.signal
                });
                if (downloadedBlob) {
                    assignBlobUrl(downloadedBlob);
                }
            } catch (error) {
                if (error?.name === 'AbortError') return;
                console.warn('[BackgroundCache] Failed to hydrate local background cache:', error);
                updateResolvedUrl(normalizedSourceUrl);
            }
        };

        load();

        return () => {
            isActive = false;
            abortController.abort();
            if (cachedObjectUrl) {
                URL.revokeObjectURL(cachedObjectUrl);
            }
        };
    }, [sourceUrl]);

    return resolvedUrl;
}
