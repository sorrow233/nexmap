/**
 * Cloudflare Function: System Credits AI Proxy
 * 
 * Provides free trial AI access for users without their own API key.
 * - API Key is stored securely in Cloudflare environment variables (NEVER exposed to frontend)
 * - Only supports Gemini Flash model for cost efficiency
 * - Deducts credits based on token usage
 * 
 * Security: Uses Firebase ID Token for user authentication
 */

// Constants
const SYSTEM_MODEL = 'deepseek-ai/DeepSeek-V3.2';
const SYSTEM_BASE_URL = 'https://api.gmi-serving.com/v1';

// Pricing (per million tokens, in credits where 100 credits = $1)
// DeepSeek-V3.2 pricing: 60% of original Gemini Flash pricing
const PRICING = {
    INPUT_PER_MILLION: 0.24,   // 60% of $0.40/M = 0.24 credits/M
    OUTPUT_PER_MILLION: 1.44,  // 60% of $2.40/M = 1.44 credits/M
};

const INITIAL_CREDITS = 100; // New users get 100 credits ($1 worth)

/**
 * Calculate credits to deduct based on token usage
 */
function calculateCreditsUsed(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
    const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
    return inputCost + outputCost;
}

/**
 * Verify Firebase ID Token
 * For Cloudflare Workers, we use a simplified verification approach
 */
async function verifyFirebaseToken(token) {
    if (!token) return null;

    try {
        // Decode JWT payload (base64)
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            console.log('[SystemCredits] Token expired');
            return null;
        }

        // Return user ID
        return payload.user_id || payload.sub;
    } catch (e) {
        console.error('[SystemCredits] Token verification failed:', e);
        return null;
    }
}

/**
 * Get user credits from KV storage
 */
async function getUserCredits(env, userId) {
    const key = `credits:${userId}`;
    const data = await env.SYSTEM_CREDITS_KV?.get(key, 'json');

    if (!data) {
        // Initialize new user with default credits
        const newData = {
            credits: INITIAL_CREDITS,
            createdAt: Date.now(),
            lastUpdated: Date.now()
        };
        await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(newData));
        return newData;
    }

    return data;
}

/**
 * Update user credits in KV storage
 */
async function updateUserCredits(env, userId, newCredits) {
    const key = `credits:${userId}`;
    const data = {
        credits: Math.max(0, newCredits), // Never go below 0
        lastUpdated: Date.now()
    };
    await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(data));
    return data.credits;
}

export async function onRequest(context) {
    const { request, env } = context;

    // CORS preflight
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
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 1. Verify user authentication
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const userId = await verifyFirebaseToken(token);

        if (!userId) {
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                message: '请先登录以使用免费试用积分'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 2. Check system API key is configured
        const systemApiKey = env.SYSTEM_GMI_API_KEY;
        if (!systemApiKey) {
            console.error('[SystemCredits] SYSTEM_GMI_API_KEY not configured!');
            return new Response(JSON.stringify({
                error: 'Service unavailable',
                message: '系统配置错误，请联系管理员'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 3. Get user credits
        const userData = await getUserCredits(env, userId);

        if (userData.credits <= 0) {
            return new Response(JSON.stringify({
                error: 'Credits exhausted',
                message: '免费试用积分已用完！请在设置中配置您自己的 API Key 继续使用。',
                credits: 0,
                needsUpgrade: true
            }), {
                status: 402, // Payment Required
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 4. Parse request
        const body = await request.json();
        const { requestBody, stream = false, action } = body;

        // Handle credits check action
        if (action === 'check') {
            return new Response(JSON.stringify({
                credits: userData.credits,
                initialCredits: INITIAL_CREDITS,
                model: SYSTEM_MODEL
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (!requestBody) {
            return new Response(JSON.stringify({ error: 'Missing requestBody' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 5. Build upstream request
        const endpoint = stream
            ? `/models/${SYSTEM_MODEL}:streamGenerateContent`
            : `/models/${SYSTEM_MODEL}:generateContent`;

        const url = `${SYSTEM_BASE_URL}${endpoint}`;

        console.log(`[SystemCredits] User ${userId} (${userData.credits.toFixed(2)} credits) -> ${url}`);

        // 6. Make request to GMI API
        const upstreamResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${systemApiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        // 7. Handle errors
        if (!upstreamResponse.ok) {
            const errText = await upstreamResponse.text();
            console.error(`[SystemCredits] Upstream error ${upstreamResponse.status}:`, errText);
            return new Response(JSON.stringify({
                error: { message: `AI Error: ${errText}` }
            }), {
                status: upstreamResponse.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 8. Handle streaming response
        if (stream) {
            const { readable, writable } = new TransformStream();

            // Process stream and count tokens in background
            const processStream = async () => {
                const reader = upstreamResponse.body.getReader();
                const writer = writable.getWriter();
                let totalInputTokens = 0;
                let totalOutputTokens = 0;

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        await writer.write(value);

                        // Try to extract usage from chunks (Gemini includes it in last chunk)
                        const text = new TextDecoder().decode(value);
                        const usageMatch = text.match(/"usageMetadata":\s*{[^}]*"promptTokenCount":\s*(\d+)[^}]*"candidatesTokenCount":\s*(\d+)/);
                        if (usageMatch) {
                            totalInputTokens = parseInt(usageMatch[1]);
                            totalOutputTokens = parseInt(usageMatch[2]);
                        }
                    }
                } finally {
                    writer.close();

                    // Deduct credits after stream completes
                    if (totalInputTokens > 0 || totalOutputTokens > 0) {
                        const creditsUsed = calculateCreditsUsed(totalInputTokens, totalOutputTokens);
                        const newCredits = await updateUserCredits(env, userId, userData.credits - creditsUsed);
                        console.log(`[SystemCredits] User ${userId} used ${creditsUsed.toFixed(4)} credits (${totalInputTokens}in/${totalOutputTokens}out). Remaining: ${newCredits.toFixed(2)}`);
                    }
                }
            };

            // Don't await - let it run in background
            context.waitUntil(processStream());

            return new Response(readable, {
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'X-Accel-Buffering': 'no'
                }
            });
        }

        // 9. Handle non-streaming response
        const data = await upstreamResponse.json();

        // Extract token usage
        const inputTokens = data.usageMetadata?.promptTokenCount || 0;
        const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

        // Deduct credits
        const creditsUsed = calculateCreditsUsed(inputTokens, outputTokens);
        const newCredits = await updateUserCredits(env, userId, userData.credits - creditsUsed);

        console.log(`[SystemCredits] User ${userId} used ${creditsUsed.toFixed(4)} credits. Remaining: ${newCredits.toFixed(2)}`);

        // Return response with credits info
        return new Response(JSON.stringify({
            ...data,
            _systemCredits: {
                used: creditsUsed,
                remaining: newCredits
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('[SystemCredits] Error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
