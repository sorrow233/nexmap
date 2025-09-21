
/**
 * Admin API: Generate Redemption Codes
 * 
 * Generates unique redemption codes for system credits.
 * Access restricted to admins defined in ADMIN_UIDS env var.
 */

// Helper to verify Firebase ID Token (reused from system-credits.js logic)
async function verifyFirebaseToken(token) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return null;
        return payload.user_id || payload.sub;
    } catch (e) {
        return null;
    }
}

// Generate a random alphanumeric code
function generateCode(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude I, O, 1, 0 for clarity
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Format: XXXX-XXXX-XXXX
    return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}`;
}

export async function onRequest(context) {
    const { request, env } = context;

    // CORS
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        // 1. Auth check
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const userId = await verifyFirebaseToken(token);

        if (!userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // 2. Admin verification
        const adminUids = (env.ADMIN_UIDS || '').split(',').map(id => id.trim());
        if (!adminUids.includes(userId)) {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403 });
        }

        // 3. Parse request
        const { amount = 50, count = 1, note = '' } = await request.json();
        const safeAmount = Math.min(Math.max(1, parseInt(amount) || 50), 10000); // 1-10000 credits
        const safeCount = Math.min(Math.max(1, parseInt(count) || 1), 50); // Max 50 codes at once

        const generatedCodes = [];
        const operations = []; // Batched KV operations if possible, but we'll do sequential for safety with KV put

        for (let i = 0; i < safeCount; i++) {
            const code = generateCode();
            const codeData = {
                code,
                value: safeAmount,
                status: 'active', // active, redeemed
                createdAt: Date.now(),
                createdBy: userId,
                note: note
            };

            // Store in KV: Key = code:{CODE}
            // Expiration: 1 year (optional, but good for cleanup)
            await env.SYSTEM_CREDITS_KV.put(`code:${code}`, JSON.stringify(codeData), {
                expirationTtl: 31536000 // 1 year
            });

            generatedCodes.push(codeData);
        }

        return new Response(JSON.stringify({
            success: true,
            codes: generatedCodes,
            message: `Successfully generated ${safeCount} codes`
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
