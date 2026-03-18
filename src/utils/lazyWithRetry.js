import { lazy } from 'react';
import { recoverFromChunkLoadError } from './chunkLoadRecovery';

/**
 * A wrapper around React.lazy and import() that handles chunk loading errors
 * by reloading the page. This is useful when a new deployment has occurred
 * and the browser is trying to load a chunk that no longer exists on the server.
 * 
 * Uses timestamp-based cooldown to prevent infinite reload loops while still
 * allowing legitimate retries after some time has passed.
 * 
 * @param {Function} componentImport A function that returns a dynamic import, e.g. () => import('./MyComponent')
 * @returns {React.Component} A lazy-loaded component with retry logic
 */
export const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        try {
            const component = await componentImport();
            return component;
        } catch (error) {
            console.error('Lazy loading error:', error);
            const recovered = await recoverFromChunkLoadError({
                reason: error,
                source: 'lazyWithRetry'
            });

            if (recovered) {
                return { default: () => null };
            }

            throw error;
        }
    });
