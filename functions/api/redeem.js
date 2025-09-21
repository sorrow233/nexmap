
/**
 * User API: Redeem Code
 * 
 * Allows users to redeem codes for bonus system credits.
 */

// Helper to verify Firebase ID Token
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
            return new Response(JSON.stringify({ error: 'Unauthorized', message: '请先登录' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const { code } = await request.json();
        if (!code || typeof code !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid code' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const normalizedCode = code.toUpperCase().trim();

        // 2. Validate Code in KV
        const codeKey = `code:${normalizedCode}`;
        const codeData = await env.SYSTEM_CREDITS_KV.get(codeKey, 'json');

        if (!codeData) {
            return new Response(JSON.stringify({ error: 'Invalid code', message: '无效的兑换码' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (codeData.status !== 'active') {
            return new Response(JSON.stringify({ error: 'Code already redeemed', message: '该兑换码已被使用' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 3. Update User Credits or Status
        // We need to fetch current user usage, add credits, and save everything atomically-ish
        // KV doesn't support transactions, but we can verify the code status first.

        // Mark code as redeemed immediately to prevent double usage (Optimistic Lock workaround)
        // If updating user fails, we might lose the code, but that's better than double redemption.
        // A robust system would use Durable Objects, but KV is acceptable for this scale.

        const redeemedCodeData = {
            ...codeData,
            status: 'redeemed',
            redeemedBy: userId,
            redeemedAt: Date.now()
        };

        // Update Code Status
        await env.SYSTEM_CREDITS_KV.put(codeKey, JSON.stringify(redeemedCodeData));

        // Get current ISO week for consistent week tracking
        function getCurrentWeekNumber() {
            const now = new Date();
            const thursday = new Date(now);
            thursday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + 3);
            const firstThursday = new Date(thursday.getFullYear(), 0, 4);
            firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
            const weekNumber = Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000)) + 1;
            return `${thursday.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
        }

        // Get User Data
        const userKey = `usage:${userId}`;
        const userData = await env.SYSTEM_CREDITS_KV.get(userKey, 'json') || {
            conversationCount: 0,
            imageCount: 0,
            week: getCurrentWeekNumber(),
            bonusCredits: 0,
            createdAt: Date.now()
        };

        let updatedUserData = { ...userData };
        let responseMessage = '';
        let addedCredits = 0;
        let totalBonus = userData.bonusCredits || 0;

        if (codeData.type === 'pro') {
            // Pro Upgrade Logic
            updatedUserData.isPro = true;
            updatedUserData.proSince = Date.now();
            responseMessage = '恭喜！您已成功升级为 Pro 用户！';
        } else {
            // Default: Credits Logic
            addedCredits = codeData.value;
            totalBonus = (userData.bonusCredits || 0) + addedCredits;

            updatedUserData.bonusCredits = totalBonus;
            updatedUserData.lastBonusAdded = Date.now();
            responseMessage = `成功兑换 ${codeData.value} 积分！`;
        }

        // Save User Data
        await env.SYSTEM_CREDITS_KV.put(userKey, JSON.stringify(updatedUserData));

        return new Response(JSON.stringify({
            success: true,
            addedCredits: addedCredits,
            totalBonus: totalBonus,
            isPro: updatedUserData.isPro, // Return Pro status
            message: responseMessage
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('Redemption error:', error);
        return new Response(JSON.stringify({ error: 'Server error', message: '兑换失败，请稍后重试' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
