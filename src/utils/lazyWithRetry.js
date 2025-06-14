import { lazy } from 'react';

/**
 * A wrapper around React.lazy and import() that handles chunk loading errors
 * by reloading the page. This is useful when a new deployment has occurred
 * and the browser is trying to load a chunk that no longer exists on the server.
 * 
 * @param {Function} componentImport A function that returns a dynamic import, e.g. () => import('./MyComponent')
 * @returns {React.Component} A lazy-loaded component with retry logic
 */
export const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        );

        try {
            const component = await componentImport();
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error) {
            console.error('Lazy loading error:', error);

            // Check if the error is related to dynamic import failure
            const isFetchError = error.name === 'TypeError' && (
                error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('error loading dynamically imported module') ||
                error.message.includes('Importing a module script failed')
            );

            if (isFetchError && !pageHasAlreadyBeenForceRefreshed) {
                // Set the flag in session storage so we don't end up in an infinite loop
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
                console.warn('Chunk loading failed. Reloading page to fetch latest assets...');
                window.location.reload();
                return;
            }

            // If it's not a fetch error or we've already tried to refresh, throw the error
            throw error;
        }
    });
