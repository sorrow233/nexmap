/**
 * Authentication Utilities
 * 
 * Shared utility functions for Firebase authentication in Cloudflare Functions.
 */

/**
 * Verify Firebase ID Token
 * For Cloudflare Workers, we use a simplified verification approach
 * (decode JWT payload without cryptographic verification)
 * 
 * @param {string} token - Firebase ID Token
 * @returns {Promise<string|null>} User ID if valid, null otherwise
 */
export async function verifyFirebaseToken(token) {
    if (!token) return null;

    try {
        // Decode JWT payload (base64)
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            console.log('[Auth] Token expired');
            return null;
        }

        // Return user ID
        return payload.user_id || payload.sub;
    } catch (e) {
        console.error('[Auth] Token verification failed:', e);
        return null;
    }
}
