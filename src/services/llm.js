// Simplified API Configuration System
// Version 2.0 - Single source of truth, no multi-provider complexity

import { loadSettings } from './storage';

// Configuration Storage Keys
const CONFIG_VERSION = 'v2';
const API_CONFIG_KEY = `mixboard_api_config_${CONFIG_VERSION}`;

// Default configuration
const DEFAULT_CONFIG = {
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash-exp'
};

/**
 * Get current API configuration
 * Returns a validated config object
 */
export const getApiConfig = () => {
    try {
        const stored = localStorage.getItem(API_CONFIG_KEY);
        if (stored) {
            const config = JSON.parse(stored);
            // Validate required fields
            if (config.apiKey && config.baseUrl && config.model) {
                console.log('[API Config] Loaded:', { baseUrl: config.baseUrl, model: config.model });
                return config;
            }
        }
    } catch (e) {
        console.error('[API Config] Failed to load:', e);
    }

    console.log('[API Config] Using defaults');
    return { ...DEFAULT_CONFIG };
};

/**
 * Save API configuration
 * Forces cache clear by using versioned key
 */
export const setApiConfig = (config) => {
    const validated = {
        apiKey: config.apiKey || '',
        baseUrl: config.baseUrl || DEFAULT_CONFIG.baseUrl,
        model: config.model || DEFAULT_CONFIG.model
    };

    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(validated));
    console.log('[API Config] Saved:', { baseUrl: validated.baseUrl, model: validated.model });

    return validated;
};

/**
 * Clear all API configuration
 * Useful for debugging and forcing re-authentication
 */
export const clearApiConfig = () => {
    // Clear all versions
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('mixboard_api_config_')) {
            localStorage.removeItem(key);
        }
    });
    console.log('[API Config] Cleared all configurations');
};

/**
 * Detect authentication method based on base URL
 */
const getAuthMethod = (baseUrl) => {
    if (baseUrl.includes('googleapis.com')) {
        return 'query'; // Google official API uses ?key=
    }
    return 'bearer'; // Most others use Bearer token
};

/**
 * Helper to format messages for Native Gemini API
 */
const formatGeminiMessages = (messages) => {
    const now = new Date();
    const dateContext = `Current Date and Time: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}.`;

    let processedMessages = messages.filter(m => {
        if (!m.content) return false;
        if (typeof m.content === 'string') return m.content.trim() !== '';
        if (Array.isArray(m.content)) return m.content.length > 0;
        return false;
    }).map(m => JSON.parse(JSON.stringify(m)));

    if (processedMessages.length > 0) {
        const firstUserMsgIndex = processedMessages.findIndex(m => m.role === 'user');
        if (firstUserMsgIndex !== -1) {
            const msg = processedMessages[firstUserMsgIndex];
            if (typeof msg.content === 'string') {
                msg.content = `${dateContext}\n\n${msg.content}`;
            } else if (Array.isArray(msg.content)) {
                const textPart = msg.content.find(p => p.type === 'text');
                if (textPart) {
                    textPart.text = `${dateContext}\n\n${textPart.text}`;
                } else {
                    msg.content.unshift({ type: 'text', text: dateContext });
                }
            }
        }
    }

    const rawContents = processedMessages.map(msg => {
        const role = msg.role === 'user' || msg.role === 'system' ? 'user' : 'model';
        let parts = [];

        if (typeof msg.content === 'string') {
            parts = [{ text: msg.content }];
        } else if (Array.isArray(msg.content)) {
            parts = msg.content.map(part => {
                if (part.type === 'text') {
                    return { text: part.text };
                } else if (part.type === 'image') {
                    return {
                        inline_data: {
                            mime_type: part.source.media_type,
                            data: part.source.data
                        }
                    };
                }
                return null;
            }).filter(p => p);
        }

        return { role, parts };
    });

    const contents = [];
    for (const msg of rawContents) {
        if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
            contents[contents.length - 1].parts.push(...msg.parts);
        } else {
            contents.push(msg);
        }
    }

    return contents;
};

/**
 * Helper to download image from URL and convert to Base64
 */
const fetchImageBase64 = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            resolve({
                data: base64data,
                mimeType: blob.type
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Helper to resolve remote images to Base64
 */
const resolveRemoteImages = async (messages) => {
    const resolvedMessages = JSON.parse(JSON.stringify(messages));

    for (const msg of resolvedMessages) {
        if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'image' && part.source && part.source.type === 'url') {
                    try {
                        const { data, mimeType } = await fetchImageBase64(part.source.url);
                        part.source = {
                            type: 'base64',
                            media_type: mimeType,
                            data: data
                        };
                    } catch (e) {
                        console.error("Failed to resolve remote image", e);
                    }
                }
            }
        }
    }
    return resolvedMessages;
};

/**
 * Helper to format messages for OpenAI API
 */
const formatOpenAIMessages = (messages) => {
    return messages.map(msg => {
        if (Array.isArray(msg.content)) {
            return {
                role: msg.role,
                content: msg.content.map(part => {
                    if (part.type === 'text') {
                        return { type: 'text', text: part.text };
                    } else if (part.type === 'image') {
                        if (part.source.type === 'base64') {
                            return {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${part.source.media_type};base64,${part.source.data}`
                                }
                            };
                        }
                        if (part.source.type === 'url') {
                            return {
                                type: 'image_url',
                                image_url: {
                                    url: part.source.url
                                }
                            };
                        }
                    }
                    return null;
                }).filter(p => p)
            };
        }
        return msg;
    });
};

/**
 * Main chat completion function
 */
export async function chatCompletion(messages, model = null, config = {}) {
    const apiConfig = config.overrideConfig || getApiConfig();
    const modelToUse = model || apiConfig.model;
    const { apiKey, baseUrl } = apiConfig;

    if (!apiKey) {
        throw new Error("API Key is missing. Please configure in Settings.");
    }

    console.log('[LLM] Chat Completion:', { model: modelToUse, baseUrl });

    const isNativeGemini = baseUrl.includes('googleapis.com');

    if (isNativeGemini) {
        return await nativeGeminiCompletion(messages, modelToUse, apiKey, baseUrl, config);
    } else {
        return await openAICompatibleCompletion(messages, modelToUse, apiKey, baseUrl, config);
    }
}

/**
 * Native Gemini API completion
 */
async function nativeGeminiCompletion(messages, model, apiKey, baseUrl, config = {}) {
    let cleanModel = model.startsWith('google/') ? model.replace('google/', '') : model;
    const authMethod = getAuthMethod(baseUrl);

    let endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:generateContent`;
    if (authMethod === 'query') {
        endpoint += `?key=${apiKey}`;
    }

    const resolvedMessages = await resolveRemoteImages(messages);
    const contents = formatGeminiMessages(resolvedMessages);

    const requestBody = {
        contents: contents,
        tools: [{ google_search: {} }],
        generationConfig: {
            temperature: config.temperature !== undefined ? config.temperature : 0.7,
            maxOutputTokens: 8192
        }
    };

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
            if ([500, 502, 503, 504].includes(response.status) && retries > 0) {
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
    const apiConfig = config.overrideConfig || getApiConfig();
    const modelToUse = model || apiConfig.model;
    const { apiKey, baseUrl } = apiConfig;

    if (!apiKey) {
        throw new Error("API Key is missing. Please configure in Settings.");
    }

    console.log('[LLM] Stream Completion:', { model: modelToUse, baseUrl });

    const isNativeGemini = baseUrl.includes('googleapis.com');

    if (isNativeGemini) {
        // Pseudo-streaming for Gemini
        const fullText = await nativeGeminiCompletion(messages, modelToUse, apiKey, baseUrl, config);
        const chunkSize = 15;
        for (let i = 0; i < fullText.length; i += chunkSize) {
            const chunk = fullText.slice(i, i + chunkSize);
            onToken(chunk);
            await new Promise(resolve => setTimeout(resolve, 8));
        }
    } else {
        await openAIStreamingCompletion(messages, onToken, modelToUse, apiKey, baseUrl, config);
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
 * Generate an image from a prompt
 */
export async function imageGeneration(prompt, model = null, config = {}) {
    const settings = await loadSettings();
    const provider = config.provider || settings.activeProvider || 'gmi';
    const providerConfig = settings.providers[provider];

    if (!providerConfig || !providerConfig.apiKey) {
        throw new Error(`Provider ${provider} is not configured.`);
    }

    const targetModel = model || providerConfig.defaultImageModel || 'black-forest-labs/FLUX.1-schnell';
    const baseUrl = providerConfig.baseUrl || 'https://api.gmi.cloud/v1';

    console.log(`[LLM] Generating image with ${targetModel} on ${provider}...`);

    const response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${providerConfig.apiKey}`
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
        getApiConfig,
        setApiConfig,
        clearApiConfig,
        chatCompletion,
        streamChatCompletion,
        generateTitle,
        imageGeneration
    };
}
