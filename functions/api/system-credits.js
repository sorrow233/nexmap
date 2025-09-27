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

import { verifyFirebaseToken } from '../utils/auth.js';
import { getCurrentWeekNumber } from '../utils/weekUtils.js';

// Constants - Conversation model (free tier)
const CONVERSATION_MODEL = 'moonshotai/Kimi-K2-Thinking';
// Analysis model (for system tasks like image analysis, not counted in conversation limit)
const ANALYSIS_MODEL = 'deepseek-ai/DeepSeek-V3.2';
const SYSTEM_BASE_URL = 'https://api.gmi-serving.com/v1';

// Image generation model (Seedream)
const IMAGE_MODEL = 'seedream-4-0-250828';
const IMAGE_API_BASE = 'https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey';

// Weekly usage limits
const WEEKLY_CONVERSATION_LIMIT = 200;
const WEEKLY_IMAGE_LIMIT = 20;

// Style prefix - AI models KNOW いらすとや by name!
const IMAGE_STYLE_PREFIX =
    'いらすとや style by みふねたかし (Takashi Mifune). Japanese free clip art, white background. ';

/**
 * Get user usage data from KV storage
 */
async function getUserUsage(env, userId) {
    const key = `usage:${userId}`;
    const data = await env.SYSTEM_CREDITS_KV?.get(key, 'json');
    const currentWeek = getCurrentWeekNumber();

    if (!data || data.week !== currentWeek) {
        // Initialize new user or reset for new week
        // IMPORTANT: Preserve bonusCredits across week resets!
        const previousBonus = data?.bonusCredits || 0;
        const newData = {
            conversationCount: 0,
            imageCount: 0,
            week: currentWeek,
            bonusCredits: previousBonus, // Preserve bonus credits
            createdAt: data?.createdAt || Date.now(),
            lastUpdated: Date.now()
        };
        await env.SYSTEM_CREDITS_KV?.put(key, JSON.stringify(newData));
        return newData;
    }

    // Ensure imageCount exists for older records
    if (data.imageCount === undefined) {
        data.imageCount = 0;
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

/**
 * Increment image count in KV storage
 */
async function incrementImageCount(env, userId, currentData) {
    const key = `usage:${userId}`;
    const data = {
        ...currentData,
        imageCount: (currentData.imageCount || 0) + 1,
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

        // Get admin UIDs for admin check
        const adminUids = (env.ADMIN_UIDS || '').split(',').map(id => id.trim()).filter(id => id.length > 0);
        const isUserAdmin = adminUids.includes(userId);
        console.log('[SystemCredits] Admin check:', { userId, adminUids, isUserAdmin });

        // 4. Parse request
        const body = await request.json();
        const { requestBody, stream = false, action, taskType } = body;

        // Handle usage check action
        if (action === 'check') {
            return new Response(JSON.stringify({
                conversationCount: usageData.conversationCount,
                weeklyLimit: WEEKLY_CONVERSATION_LIMIT,
                bonusCredits: usageData.bonusCredits || 0,
                remaining: (WEEKLY_CONVERSATION_LIMIT + (usageData.bonusCredits || 0)) - usageData.conversationCount,
                week: usageData.week,
                model: CONVERSATION_MODEL,
                // Image quota info
                imageCount: usageData.imageCount || 0,
                imageLimit: WEEKLY_IMAGE_LIMIT,
                imageRemaining: WEEKLY_IMAGE_LIMIT - (usageData.imageCount || 0),
                imageModel: IMAGE_MODEL,
                // Legacy compatibility
                credits: (WEEKLY_CONVERSATION_LIMIT + (usageData.bonusCredits || 0)) - usageData.conversationCount,
                initialCredits: WEEKLY_CONVERSATION_LIMIT + (usageData.bonusCredits || 0),
                isPro: !!usageData.isPro,
                isAdmin: isUserAdmin
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Handle image generation action
        if (action === 'image') {
            const { prompt, size = '1024x1024', watermark = false } = body;

            if (!prompt) {
                return new Response(JSON.stringify({ error: 'Prompt is required for image generation' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }

            // Check image limit
            const imageCount = usageData.imageCount || 0;
            if (imageCount >= WEEKLY_IMAGE_LIMIT) {
                return new Response(JSON.stringify({
                    error: 'Image limit reached',
                    message: `本周免费图片生成次数（${WEEKLY_IMAGE_LIMIT}次）已用完！每周一重置。请在设置中配置您自己的 API Key 继续使用。`,
                    imageCount: imageCount,
                    imageLimit: WEEKLY_IMAGE_LIMIT,
                    imageRemaining: 0,
                    needsUpgrade: true
                }), {
                    status: 402,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }

            try {
                console.log(`[SystemCredits] User ${userId} generating image (${imageCount}/${WEEKLY_IMAGE_LIMIT}): ${prompt.substring(0, 50)}...`);

                // 1. Submit image generation request
                const submitResponse = await fetch(`${IMAGE_API_BASE}/requests`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${systemApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: IMAGE_MODEL,
                        payload: {
                            // Prepend style prefix for consistent みふねたかし/Irasutoya style
                            prompt: IMAGE_STYLE_PREFIX + prompt,
                            size: size,
                            max_images: 1,
                            watermark: watermark
                        }
                    })
                });

                if (!submitResponse.ok) {
                    const err = await submitResponse.json().catch(() => ({}));
                    console.error('[SystemCredits] Image submit failed:', err);
                    return new Response(JSON.stringify({
                        error: 'Image generation failed',
                        message: err.error?.message || err.error || 'Failed to submit image request'
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }

                const submitData = await submitResponse.json();
                const requestId = submitData.request_id;

                if (!requestId) {
                    console.error('[SystemCredits] No request_id in response:', submitData);
                    return new Response(JSON.stringify({
                        error: 'Image generation failed',
                        message: 'No request ID returned from API'
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }

                console.log(`[SystemCredits] Image request queued: ${requestId}`);

                // 2. Poll for completion (max 30 attempts, 2s interval = 60s timeout)
                let attempts = 0;
                const maxAttempts = 30;

                while (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 2000));
                    attempts++;

                    const pollResponse = await fetch(`${IMAGE_API_BASE}/requests/${requestId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${systemApiKey}`
                        }
                    });

                    if (!pollResponse.ok) {
                        console.warn(`[SystemCredits] Poll attempt ${attempts} failed:`, pollResponse.status);
                        continue;
                    }

                    const pollData = await pollResponse.json();

                    if (pollData.status === 'success') {
                        const imageUrl = pollData.outcome?.media_urls?.[0]?.url;
                        if (!imageUrl) {
                            return new Response(JSON.stringify({
                                error: 'Image generation failed',
                                message: 'Image generated but no URL returned'
                            }), {
                                status: 500,
                                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                            });
                        }

                        // Increment usage count on success
                        const updatedUsage = await incrementImageCount(env, userId, usageData);
                        console.log(`[SystemCredits] User ${userId} image generation success. Count: ${updatedUsage.imageCount}/${WEEKLY_IMAGE_LIMIT}`);

                        return new Response(JSON.stringify({
                            url: imageUrl,
                            imageCount: updatedUsage.imageCount,
                            imageLimit: WEEKLY_IMAGE_LIMIT,
                            imageRemaining: WEEKLY_IMAGE_LIMIT - updatedUsage.imageCount
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                        });
                    }

                    if (pollData.status === 'failed' || pollData.status === 'cancelled') {
                        console.error('[SystemCredits] Image generation failed:', pollData);
                        return new Response(JSON.stringify({
                            error: 'Image generation failed',
                            message: pollData.error || pollData.message || 'Generation failed'
                        }), {
                            status: 500,
                            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                        });
                    }
                }

                // Timeout
                return new Response(JSON.stringify({
                    error: 'Image generation timeout',
                    message: 'Image generation timed out after 60 seconds'
                }), {
                    status: 504,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });

            } catch (error) {
                console.error('[SystemCredits] Image generation error:', error);
                return new Response(JSON.stringify({
                    error: 'Image generation failed',
                    message: error.message || 'Internal server error'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }

        // Determine which model to use based on task type
        // taskType: 'conversation' (default, counted) or 'analysis' (not counted, uses DeepSeek)
        const isConversation = taskType !== 'analysis';
        const selectedModel = isConversation ? CONVERSATION_MODEL : ANALYSIS_MODEL;

        // Check conversation limit only for conversation tasks
        const effectiveLimit = WEEKLY_CONVERSATION_LIMIT + (usageData.bonusCredits || 0);
        if (isConversation && usageData.conversationCount >= effectiveLimit) {
            return new Response(JSON.stringify({
                error: 'Limit reached',
                message: `本周免费对话次数（${effectiveLimit}次，含奖励）已用完！请在设置中配置您自己的 API Key 继续使用。`,
                conversationCount: usageData.conversationCount,
                weeklyLimit: WEEKLY_CONVERSATION_LIMIT,
                bonusCredits: usageData.bonusCredits || 0,
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
        // For Kimi-K2-Thinking: use temperature=1.0 to enable reasoning exploration
        const openaiBody = {
            ...requestBody,
            model: selectedModel,
            stream: stream,
            // Enable reasoning mode with recommended settings for Kimi-K2-Thinking
            temperature: selectedModel === CONVERSATION_MODEL ? 1.0 : (requestBody.temperature || 0.7),
            max_tokens: requestBody.max_tokens || 16384, // Higher limit for reasoning chains
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
                bonusCredits: updatedUsageData.bonusCredits || 0,
                remaining: (WEEKLY_CONVERSATION_LIMIT + (updatedUsageData.bonusCredits || 0)) - updatedUsageData.conversationCount
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
