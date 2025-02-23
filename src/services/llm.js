// Version 3.1 - Robust, Extensible, and Context-Aware


/**
 * 核心配置管理
 */
const CONFIG_KEY = 'mixboard_providers_v3';

// 默认提供的基础模板
const DEFAULT_PROVIDERS = {
    'google': {
        id: 'google',
        name: 'GMI Gemini (Native)',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-3-flash-preview',
        protocol: 'gemini'
    },
    'openai-compatible': {
        id: 'openai-compatible',
        name: 'GMI OpenAI (Compatible)',
        baseUrl: 'https://api.gmi-serving.com/v1',
        apiKey: '',
        model: 'google/gemini-3-flash-preview',
        protocol: 'openai'
    }
};

/**
 * 获取完整的提供者列表和当前激活的 ID
 */
export const getProviderSettings = () => {
    try {
        const stored = localStorage.getItem(CONFIG_KEY);
        const settings = stored ? JSON.parse(stored) : null;

        // Migration Logic: Check for V2 config if V3 is missing
        if (!settings) {
            console.log('[LLM Config] V3 missing, checking for V2 legacy...');
            const v2ConfigStr = localStorage.getItem('mixboard_api_config_v2');
            if (v2ConfigStr) {
                try {
                    const v2Config = JSON.parse(v2ConfigStr);
                    // Standard migration for GMI Serving
                    const migrated = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));

                    // Migrate API Key
                    const apiKey = v2Config.apiKey || '';
                    migrated.google.apiKey = apiKey;
                    migrated['openai-compatible'].apiKey = apiKey;

                    // Migrate Model - prioritize gemini-3-flash-preview
                    const targetModel = (v2Config.model && v2Config.model.indexOf('gemini') !== -1)
                        ? 'google/gemini-3-flash-preview'
                        : (v2Config.model || 'google/gemini-3-flash-preview');

                    migrated.google.model = targetModel;
                    migrated['openai-compatible'].model = targetModel;

                    console.log('[LLM Config] Migrated V2 to V3 GMI Providers');
                    return { providers: migrated, activeId: 'google' };
                } catch (e) { console.warn('Migration failed', e); }
            }
            return { providers: DEFAULT_PROVIDERS, activeId: 'google' };
        }

        return settings;
    } catch (e) {
        console.error('[LLM Config] Load failed:', e);
        return { providers: DEFAULT_PROVIDERS, activeId: 'google' };
    }
};

/**
 * 保存配置
 */
export const saveProviderSettings = (providers, activeId) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ providers, activeId }));
};

/**
 * 获取当前正在使用的配置
 */
export const getActiveConfig = () => {
    const { providers, activeId } = getProviderSettings();
    return providers[activeId] || DEFAULT_PROVIDERS['google'];
};

// Backwards compatibility alias
export const getApiConfig = () => {
    return getActiveConfig();
};

// --- 协议适配器 ---

/**
 * Gemini 原生协议转换
 */
const formatGeminiMessages = (messages) => {
    const contents = [];
    let systemInstruction = "";

    messages.forEach(msg => {
        if (msg.role === 'system') {
            systemInstruction += (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)) + "\n";
            return;
        }

        const role = msg.role === 'assistant' ? 'model' : 'user';
        let parts = [];

        if (typeof msg.content === 'string') {
            parts = [{ text: msg.content }];
        } else if (Array.isArray(msg.content)) {
            parts = msg.content.map(part => {
                if (part.type === 'text') return { text: part.text };
                if (part.type === 'image') return {
                    inline_data: {
                        mime_type: part.source.media_type,
                        data: part.source.data
                    }
                };
                return null;
            }).filter(Boolean);
        }

        // Gemini 不允许连续相同角色的消息，需要合并
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts.push(...parts);
        } else {
            contents.push({ role, parts });
        }
    });

    return { contents, systemInstruction };
};

/**
 * OpenAI 协议转换
 */
const formatOpenAIMessages = (messages) => {
    return messages.map(msg => {
        if (Array.isArray(msg.content)) {
            return {
                role: msg.role,
                content: msg.content.map(part => {
                    if (part.type === 'text') return { type: 'text', text: part.text };
                    if (part.type === 'image') {
                        return {
                            type: 'image_url',
                            image_url: { url: `data:${part.source.media_type};base64,${part.source.data}` }
                        };
                    }
                    return null;
                }).filter(Boolean)
            };
        }
        return msg;
    });
};

/**
 * Utility: Resolve remote image URLs to Base64
 */
const resolveRemoteImages = async (messages) => {
    const resolved = JSON.parse(JSON.stringify(messages));
    for (const msg of resolved) {
        if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'image' && part.source?.media_type === 'url') {
                    try {
                        const resp = await fetch(part.source.data);
                        const blob = await resp.blob();
                        const reader = new FileReader();
                        const base64 = await new Promise((resolve) => {
                            reader.onloadend = () => resolve(reader.result.split(',')[1]);
                            reader.readAsDataURL(blob);
                        });
                        part.source.data = base64;
                        part.source.media_type = blob.type;
                    } catch (e) {
                        console.error("[LLM] Image resolution failed", e);
                    }
                }
            }
        }
    }
    return resolved;
};

/**
 * Utility: Determine auth method from URL
 */
const getAuthMethod = (url) => {
    if (url.indexOf('googleapis.com') !== -1) return 'query';
    return 'bearer';
};

/**
 * Main chat completion function
 */
export async function chatCompletion(messages, model = null, config = {}) {
    let apiConfig;
    if (config.providerId) {
        const settings = getProviderSettings();
        apiConfig = settings.providers[config.providerId] || getActiveConfig();
    } else {
        apiConfig = config.overrideConfig || getActiveConfig();
    }

    const modelToUse = model || apiConfig.model;
    const { apiKey, baseUrl, protocol } = apiConfig;

    if (!apiKey) {
        throw new Error("API Key is missing for provider " + (apiConfig.name || "default"));
    }

    console.log('[LLM] Chat Completion:', { model: modelToUse, baseUrl, protocol });

    if (protocol === 'gemini') {
        return nativeGeminiCompletion(messages, modelToUse, apiKey, baseUrl, config);
    } else {
        return openAICompatibleCompletion(messages, modelToUse, apiKey, baseUrl, config);
    }
}

/**
 * Native Gemini API completion
 */
async function nativeGeminiCompletion(messages, model, apiKey, baseUrl, config = {}) {
    // GMI Native endpoint expects the model without 'google/' prefix if using GMI base URL
    let cleanModel = (baseUrl.indexOf('gmi') !== -1)
        ? model.replace('google/', '')
        : model;

    const authMethod = getAuthMethod(baseUrl);

    let endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:generateContent`;
    if (authMethod === 'query') {
        endpoint += `?key=${apiKey}`;
    }

    const resolvedMessages = await resolveRemoteImages(messages);
    const { contents, systemInstruction } = formatGeminiMessages(resolvedMessages);

    const requestBody = {
        contents: contents,
        tools: [{ google_search: {} }],
        generationConfig: {
            temperature: config.temperature !== undefined ? config.temperature : 0.7,
            maxOutputTokens: 8192
        }
    };

    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    let retries = 3;
    while (retries >= 0) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (authMethod === 'bearer') {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                }
                return "";
            }

            // Retry on upstream errors
            if ([500, 502, 503, 504].indexOf(response.status) !== -1 && retries > 0) {
                console.warn(`[Native API] Error ${response.status}, retrying...`, { retriesLeft: retries });
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
                continue;
            }

            // Extract error message
            let errorMsg = 'API request failed';
            try {
                const err = await response.json();
                errorMsg = err.error?.message || JSON.stringify(err);
            } catch (e) {
                errorMsg = await response.text();
            }
            throw new Error(errorMsg);

        } catch (networkError) {
            if (retries > 0) {
                console.warn('[Native API] Network error, retrying...', networkError);
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
                continue;
            }
            throw networkError;
        }
    }
}

/**
 * OpenAI-compatible API completion
 */
async function openAICompatibleCompletion(messages, model, apiKey, baseUrl, config = {}) {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: formatOpenAIMessages(messages),
            ...(config.temperature && { temperature: config.temperature }),
            ...(config.tools && { tools: config.tools }),
            ...(config.tool_choice && { tool_choice: config.tool_choice })
        })
    });

    if (!response.ok) {
        let errorMsg = 'API request failed';
        try {
            const err = await response.json();
            errorMsg = err.error?.message || errorMsg;
        } catch (e) {
            errorMsg = await response.text();
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Streaming chat completion
 */
export async function streamChatCompletion(messages, onToken, model = null, config = {}) {
    let apiConfig;
    if (config.providerId) {
        const settings = getProviderSettings();
        apiConfig = settings.providers[config.providerId] || getActiveConfig();
    } else {
        apiConfig = config.overrideConfig || getActiveConfig();
    }

    const modelToUse = model || apiConfig.model;
    const { apiKey, baseUrl, protocol } = apiConfig;

    if (!apiKey) {
        throw new Error("API Key is missing for provider " + (apiConfig.name || "default"));
    }

    console.log('[LLM] Stream Completion:', { model: modelToUse, baseUrl, protocol });

    if (protocol === 'gemini') {
        await nativeGeminiStreamingCompletion(messages, onToken, modelToUse, apiKey, baseUrl, config);
    } else {
        await openAIStreamingCompletion(messages, onToken, modelToUse, apiKey, baseUrl, config);
    }
}

/**
 * Native Gemini streaming with real ReadableStream
 */
async function nativeGeminiStreamingCompletion(messages, onToken, model, apiKey, baseUrl, config = {}) {
    let cleanModel = (baseUrl.indexOf('gmi') !== -1)
        ? model.replace('google/', '')
        : model;

    const authMethod = getAuthMethod(baseUrl);

    // Use streamGenerateContent endpoint for true streaming
    let endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:streamGenerateContent`;
    if (authMethod === 'query') {
        endpoint += `?key=${apiKey}`;
    }

    const resolvedMessages = await resolveRemoteImages(messages);
    const { contents, systemInstruction } = formatGeminiMessages(resolvedMessages);

    const requestBody = {
        contents: contents,
        tools: [{ google_search: {} }],
        generationConfig: {
            temperature: config.temperature !== undefined ? config.temperature : 0.7,
            maxOutputTokens: 8192
        }
    };

    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (authMethod === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        let errorMsg = 'Streaming API request failed';
        try {
            const err = await response.json();
            errorMsg = err.error?.message || JSON.stringify(err);
        } catch (e) {
            errorMsg = await response.text();
        }
        throw new Error(errorMsg);
    }

    // Parse the ReadableStream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    // Gemini streaming returns JSON objects, sometimes wrapped in arrays
                    const data = JSON.parse(line);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        onToken(text);
                    }
                } catch (parseError) {
                    // Sometimes responses are wrapped in arrays or have extra formatting
                    // Try to extract JSON from the line
                    const jsonMatch = line.match(/\{.*\}/);
                    if (jsonMatch) {
                        try {
                            const data = JSON.parse(jsonMatch[0]);
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                onToken(text);
                            }
                        } catch (e) {
                            console.warn('[Gemini Stream] Failed to parse chunk:', line.substring(0, 100));
                        }
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * OpenAI-compatible streaming
 */
async function openAIStreamingCompletion(messages, onToken, model, apiKey, baseUrl, config = {}) {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            messages: formatOpenAIMessages(messages),
            ...(config?.temperature !== undefined && { temperature: config.temperature }),
            stream: true,
            ...(config.tools && { tools: config.tools }),
            ...(config.tool_choice && { tool_choice: config.tool_choice })
        })
    });

    if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const json = JSON.parse(line.substring(6));
                    const content = json.choices[0]?.delta?.content;
                    if (content) {
                        onToken(content);
                    }
                } catch (e) { }
            }
        }
    }
}

/**
 * Generate title from text
 */
export async function generateTitle(text) {
    try {
        const userMessage = `Summarize the following text into a very short, catchy title (max 5 words). Do not use quotes.\n\nText: ${text.substring(0, 500)}`;
        const title = await chatCompletion([{ role: 'user', content: userMessage }]);
        return title.trim();
    } catch (e) {
        return "New Conversation";
    }
}

/**
 * Generate an image from a prompt (Generic OpenAI-compatible format)
 */
export async function imageGeneration(prompt, model = null, config = {}) {
    const { providers, activeId } = getProviderSettings();
    const providerId = config.providerId || activeId;
    const providerConfig = providers[providerId];

    if (!providerConfig || !providerConfig.apiKey) {
        throw new Error(`Provider ${providerId} is not configured or missing API Key.`);
    }

    const { apiKey, baseUrl } = providerConfig;
    const targetModel = model || providerConfig.model || 'gpt-4o'; // Fallback

    console.log(`[LLM] Generating image with ${targetModel} on ${providerId}...`);

    const response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: targetModel,
            prompt: prompt,
            n: 1,
            size: config.size || "1024x1024",
            response_format: "url"
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data[0].url;
}

// Expose to window for compatibility
if (typeof window !== 'undefined') {
    window.LLM = {
        getProviderSettings,
        saveProviderSettings,
        getActiveConfig,
        getApiConfig,
        chatCompletion,
        streamChatCompletion,
        generateTitle,
        imageGeneration
    };
}
