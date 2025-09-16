/**
 * Cloudflare Function: System Credits AI Proxy
 * 
 * Provides free trial AI access for users without their own API key.
 * - API Key is stored securely in Cloudflare environment variables (NEVER exposed to frontend)
 * - Uses Kimi-K2-Thinking for conversations (200 times per week, resets every Monday)
 * - Uses DeepSeek-V3.2 for system analysis tasks (separate tracking)
 * 
 * Security: Uses Firebase ID Token for user authentication
 */

// Constants - Conversation model (free tier)
const CONVERSATION_MODEL = 'moonshotai/Kimi-K2-Thinking';
// Analysis model (for system tasks like image analysis, not counted in conversation limit)
const ANALYSIS_MODEL = 'deepseek-ai/DeepSeek-V3.2';
const SYSTEM_BASE_URL = 'https://api.gmi-serving.com/v1';

// Weekly usage limit for conversations
const WEEKLY_CONVERSATION_LIMIT = 200;

/**
 * Get the current week number (ISO week, Monday is first day)
 * Used to reset usage count every week
 */
function getCurrentWeekNumber() {
    const now = new Date();
    // Get the Thursday of the current week (ISO week algorithm)
    const thursday = new Date(now);
    thursday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + 3);
    // Get the first Thursday of the year
    const firstThursday = new Date(thursday.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
    // Calculate week number
    const weekNumber = Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return `${thursday.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
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
 * Get user usage data from KV storage
 */
async function getUserUsage(env, userId) {
    const key = `usage:${userId}`;
    const data = await env.SYSTEM_CREDITS_KV?.get(key, 'json');
    const currentWeek = getCurrentWeekNumber();

    if (!data || data.week !== currentWeek) {
        // Initialize new user or reset for new week
        const newData = {
            conversationCount: 0,
            week: currentWeek,
            createdAt: data?.createdAt || Date.now(),
            lastUpdated: Date.now()
        };
        await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(newData));
        return newData;
    }

    return data;
}

/**
 * Increment conversation count in KV storage
 */
async function incrementConversationCount(env, userId, currentData) {
    const key = `usage:${userId}`;
    const data = {
        ...currentData,
        conversationCount: currentData.conversationCount + 1,
        lastUpdated: Date.now()
    };
    await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(data));
    return data;
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
                message: '请先登录以使用免费试用功能'
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

        // 3. Get user usage data
        const usageData = await getUserUsage(env, userId);

        // 4. Parse request
        const body = await request.json();
        const { requestBody, stream = false, action, taskType } = body;

        // Handle usage check action
        if (action === 'check') {
            return new Response(JSON.stringify({
                conversationCount: usageData.conversationCount,
                weeklyLimit: WEEKLY_CONVERSATION_LIMIT,
                remaining: WEEKLY_CONVERSATION_LIMIT - usageData.conversationCount,
                week: usageData.week,
                model: CONVERSATION_MODEL,
                // Legacy compatibility
                credits: WEEKLY_CONVERSATION_LIMIT - usageData.conversationCount,
                initialCredits: WEEKLY_CONVERSATION_LIMIT
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Determine which model to use based on task type
        // taskType: 'conversation' (default, counted) or 'analysis' (not counted, uses DeepSeek)
        const isConversation = taskType !== 'analysis';
        const selectedModel = isConversation ? CONVERSATION_MODEL : ANALYSIS_MODEL;

        // Check conversation limit only for conversation tasks
        if (isConversation && usageData.conversationCount >= WEEKLY_CONVERSATION_LIMIT) {
            return new Response(JSON.stringify({
                error: 'Limit reached',
                message: `本周免费对话次数（${WEEKLY_CONVERSATION_LIMIT}次）已用完！每周一重置。请在设置中配置您自己的 API Key 继续使用。`,
                conversationCount: usageData.conversationCount,
                weeklyLimit: WEEKLY_CONVERSATION_LIMIT,
                remaining: 0,
                needsUpgrade: true,
                // Legacy compatibility
                credits: 0
            }), {
                status: 402, // Payment Required
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (!requestBody) {
            return new Response(JSON.stringify({ error: 'Missing requestBody' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 5. Build upstream request (OpenAI Protocol)
        const endpoint = '/chat/completions';
        const url = `${SYSTEM_BASE_URL}${endpoint}`;

        console.log(`[SystemCredits] User ${userId} (${usageData.conversationCount}/${WEEKLY_CONVERSATION_LIMIT} this week) -> ${url} [${selectedModel}]`);

        // Ensure request body matches OpenAI spec
        const openaiBody = {
            ...requestBody,
            model: selectedModel,
            stream: stream,
            stream_options: stream ? { include_usage: true } : undefined
        };

        // 6. Make request to GMI/OpenAI API
        const upstreamResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${systemApiKey}`
            },
            body: JSON.stringify(openaiBody)
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

        // 8. Increment conversation count for conversation tasks (before streaming starts)
        let updatedUsageData = usageData;
        if (isConversation) {
            updatedUsageData = await incrementConversationCount(env, userId, usageData);
            console.log(`[SystemCredits] User ${userId} conversation count: ${updatedUsageData.conversationCount}/${WEEKLY_CONVERSATION_LIMIT}`);
        }

        // 9. Handle streaming response
        if (stream) {
            const { readable, writable } = new TransformStream();

            // Process stream in background
            const processStream = async () => {
                const reader = upstreamResponse.body.getReader();
                const writer = writable.getWriter();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        await writer.write(value);
                    }
                } finally {
                    writer.close();
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

        // 10. Handle non-streaming response
        const data = await upstreamResponse.json();

        // Return response with usage info
        return new Response(JSON.stringify({
            ...data,
            _systemCredits: {
                conversationCount: updatedUsageData.conversationCount,
                weeklyLimit: WEEKLY_CONVERSATION_LIMIT,
                remaining: WEEKLY_CONVERSATION_LIMIT - updatedUsageData.conversationCount
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
