import { useEffect, useState } from 'react';
import {
    canHydrateBackgroundCacheFromNetwork,
    fetchAndCacheBackgroundBlob,
    getCachedBackgroundBlob,
    isCacheableBackgroundUrl
} from '../services/backgroundImageCache';

export default function useCachedBackgroundImage(sourceUrl, options = {}) {
    const enabled = options.enabled !== false;
    const [resolvedUrl, setResolvedUrl] = useState(enabled ? (sourceUrl || '') : '');

    useEffect(() => {
        const normalizedSourceUrl = typeof sourceUrl === 'string' ? sourceUrl.trim() : '';

        if (!enabled) {
            setResolvedUrl('');
            return undefined;
        }

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

                if (!canHydrateBackgroundCacheFromNetwork(normalizedSourceUrl)) {
                    updateResolvedUrl(normalizedSourceUrl);
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
    }, [enabled, sourceUrl]);

    return resolvedUrl;
}
