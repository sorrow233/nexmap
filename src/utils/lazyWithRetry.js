import { lazy } from 'react';

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
        const COOLDOWN_MS = 10000; // 10 second cooldown between reload attempts
        const lastRefreshTime = parseInt(
            window.sessionStorage.getItem('lazy-refresh-timestamp') || '0',
            10
        );
        const now = Date.now();
        const canRefresh = (now - lastRefreshTime) > COOLDOWN_MS;

        try {
            const component = await componentImport();
            // Clear the timestamp on successful load
            window.sessionStorage.removeItem('lazy-refresh-timestamp');
            return component;
        } catch (error) {
            console.error('Lazy loading error:', error);

            // Check if the error is related to dynamic import failure
            const isFetchError = error.name === 'TypeError' && (
                error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('error loading dynamically imported module') ||
                error.message.includes('Importing a module script failed')
            );

            if (isFetchError && canRefresh) {
                // Set the timestamp so we don't refresh again immediately
                window.sessionStorage.setItem('lazy-refresh-timestamp', now.toString());
                console.warn('Chunk loading failed. Reloading page to fetch latest assets...');
                window.location.reload();
                // Return empty module to prevent further errors during reload
                return { default: () => null };
            }

            // If it's not a fetch error or we've recently refreshed, throw the error
            throw error;
        }
    });

