// Config management:
// 1. Local Preview uses global 'window.API_CONFIG' loaded from config.js
// 2. Vite Build uses 'import.meta.env'
// 3. We removed 'import { API_CONFIG } from ./config' to avoid build errors on Vercel where file is ignored.

const getEnvVar = (key) => {
    // Check global API_CONFIG (Local Preview)
    // In local preview, API_CONFIG is a global const, not on window.
    try {
        // @ts-ignore
        if (typeof API_CONFIG !== 'undefined' && API_CONFIG[key]) {
            return API_CONFIG[key];
        }
    } catch (e) { }

    if (typeof window !== 'undefined' && window.API_CONFIG && window.API_CONFIG[key]) {
        return window.API_CONFIG[key];
    }

    // Check Vite Env (Production/Dev)
    try {
        // Check for import.meta.env shim or real thing
        // We use string access to avoid syntax errors if parser is strict about import.meta
        // But since weshimmed it in local_preview, this code is what remains.
        if (import.meta && import.meta.env) {
            return import.meta.env[`VITE_${key}`] || import.meta.env[key];
        }
    } catch (e) {
        // import.meta might not exist in some environments
    }
    return "";
};

const DEFAULT_KEY = getEnvVar('apiKey');
const DEFAULT_BASE_URL = getEnvVar('baseUrl') || 'https://api.gmi-serving.com/v1';

const STORAGE_KEY_PREFIX = 'mixboard_llm_key_';
const STORAGE_BASE_URL = 'mixboard_llm_base_url';
const STORAGE_MODEL = 'mixboard_llm_model';
const DEFAULT_MODEL = 'google/gemini-3-flash-preview';

// Helper to get provider ID from base URL
const getProviderIdFromUrl = (url) => {
    if (!url) return 'custom';
    if (url.includes('gmi-serving.com')) return 'gmicloud';
    if (url.includes('siliconflow.cn')) return 'siliconflow';
    if (url.includes('deepseek.com')) return 'deepseek';
    if (url.includes('openai.com')) return 'openai';
    if (url.includes('generativelanguage.googleapis.com')) return 'gemini';
    if (url.includes('openrouter.ai')) return 'openrouter';
    return 'custom';
};

// Get API Key for a specific provider
export const getApiKeyForProvider = (providerId) => {
    return localStorage.getItem(STORAGE_KEY_PREFIX + providerId) || DEFAULT_KEY;
};

// Set API Key for a specific provider  
export const setApiKeyForProvider = (providerId, key) => {
    localStorage.setItem(STORAGE_KEY_PREFIX + providerId, key);
};

// Get current provider's API Key based on current base URL
export const getApiKey = () => {
    const currentUrl = getBaseUrl();
    const providerId = getProviderIdFromUrl(currentUrl);
    return getApiKeyForProvider(providerId);
};

// Set API Key (backwards compatible - sets for current provider)
export const setApiKey = (key) => {
    const currentUrl = getBaseUrl();
    const providerId = getProviderIdFromUrl(currentUrl);
    setApiKeyForProvider(providerId, key);
};

export const getBaseUrl = () => localStorage.getItem(STORAGE_BASE_URL) || DEFAULT_BASE_URL;
export const setBaseUrl = (url) => localStorage.setItem(STORAGE_BASE_URL, url);

export const getModel = () => localStorage.getItem(STORAGE_MODEL) || DEFAULT_MODEL;
export const setModel = (model) => localStorage.setItem(STORAGE_MODEL, model);



// Helper to format messages for Native Gemini API
const formatGeminiMessages = (messages) => {
    // 1. Inject date context into the first user message
    const now = new Date();
    const dateContext = `Current Date and Time: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}.`;

    // Filter and Deep Copy
    let processedMessages = messages.filter(m => {
        if (!m.content) return false;
        if (typeof m.content === 'string') return m.content.trim() !== '';
        if (Array.isArray(m.content)) return m.content.length > 0;
        return false;
    }).map(m => JSON.parse(JSON.stringify(m))); // Deep copy for safety

    if (processedMessages.length > 0) {
        const firstUserMsgIndex = processedMessages.findIndex(m => m.role === 'user');
        if (firstUserMsgIndex !== -1) {
            const msg = processedMessages[firstUserMsgIndex];
            if (typeof msg.content === 'string') {
                msg.content = `${dateContext}\n\n${msg.content}`;
            } else if (Array.isArray(msg.content)) {
                // If array, prepend text part
                const textPart = msg.content.find(p => p.type === 'text');
                if (textPart) {
                    textPart.text = `${dateContext}\n\n${textPart.text}`;
                } else {
                    msg.content.unshift({ type: 'text', text: dateContext });
                }
            }
        }
    }

    // 2. Map to Native Format
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

    // 3. Merge consecutive messages with the same role
    const contents = [];
    for (const msg of rawContents) {
        if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
            const prev = contents[contents.length - 1];
            // Merge parts
            prev.parts.push(...msg.parts);
        } else {
            contents.push(msg);
        }
    }

    return contents;
};

// Helper to download image from URL and convert to Base64
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

// Helper to resolve remote images to Base64 for providers that don't support URLs (like Native Gemini)
const resolveRemoteImages = async (messages) => {
    const resolvedMessages = JSON.parse(JSON.stringify(messages)); // Deep clone

    for (const msg of resolvedMessages) {
        if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'image' && part.source && part.source.type === 'url') {
                    try {
                        // Fetch and convert to base64
                        const { data, mimeType } = await fetchImageBase64(part.source.url);
                        part.source = {
                            type: 'base64',
                            media_type: mimeType, // Use fetched mimeType or fallback to part.source.media_type
                            data: data
                        };
                    } catch (e) {
                        console.error("Failed to resolve remote image", e);
                        // Fallback or keep as URL (which might fail later)
                    }
                }
            }
        }
    }
    return resolvedMessages;
};

// Helper to format messages for OpenAI API
const formatOpenAIMessages = (messages) => {
    return messages.map(msg => {
        if (Array.isArray(msg.content)) {
            return {
                role: msg.role,
                content: msg.content.map(part => {
                    if (part.type === 'text') {
                        return { type: 'text', text: part.text };
                    } else if (part.type === 'image') {
                        // Handle Base64
                        if (part.source.type === 'base64') {
                            return {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${part.source.media_type};base64,${part.source.data}`
                                }
                            };
                        }
                        // Handle URL
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

export async function chatCompletion(messages, model = null, config = {}) {
    const apiKey = config.apiKey || getApiKey();
    const baseUrl = config.baseUrl || getBaseUrl();
    let modelToUse = model || getModel();
    // If the model name is a comma-separated list, use the first one
    if (modelToUse && modelToUse.includes(',')) {
        modelToUse = modelToUse.split(',')[0].trim();
    }

    if (!apiKey) throw new Error("API Key is missing.");

    const isNativeGemini = baseUrl.includes('gmi-serving.com') || (baseUrl.includes('googleapis.com') && !baseUrl.includes('openai'));

    if (isNativeGemini) {
        // --- NATIVE GEMINI API MODE ---
        let cleanModel = modelToUse;
        if (cleanModel.startsWith('google/')) {
            cleanModel = cleanModel.replace('google/', '');
        }
        const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:generateContent`;

        // Resolve generic image URLs to Base64 for Native Gemini
        const resolvedMessages = await resolveRemoteImages(messages);
        const contents = formatGeminiMessages(resolvedMessages);

        const requestBody = {
            contents: contents,
            tools: [
                {
                    google_search: {}
                }
            ],
            generationConfig: {
                temperature: config.temperature !== undefined ? config.temperature : 0.7,
                maxOutputTokens: 2000
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorMsg = 'Failed to fetch from LLM';
                try {
                    const err = await response.json();
                    errorMsg = err.error?.message || JSON.stringify(err);
                } catch (e) {
                    errorMsg = await response.text();
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return "";
            }

        } catch (error) {
            console.error("LLM Native Error:", error);
            throw error;
        }

    } else {
        // --- OPENAI COMPATIBLE MODE ---
        const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelToUse,
                    messages: formatOpenAIMessages(messages),
                    ...(config.temperature && { temperature: config.temperature }),
                    ...(config.tools && { tools: config.tools }),
                    ...(config.tool_choice && { tool_choice: config.tool_choice })
                })
            });

            if (!response.ok) {
                let errorMsg = 'Failed to fetch from LLM';
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
        } catch (error) {
            console.error("LLM Error:", error);
            throw error;
        }
    }
}

export async function streamChatCompletion(messages, onToken, model = null, config = {}) {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    let modelToUse = model || getModel();
    if (modelToUse && modelToUse.includes(',')) {
        modelToUse = modelToUse.split(',')[0].trim();
    }

    if (!apiKey) throw new Error("API Key is missing.");

    const isNativeGemini = baseUrl.includes('gmi-serving.com') || (baseUrl.includes('googleapis.com') && !baseUrl.includes('openai'));

    if (isNativeGemini) {
        // --- NATIVE GEMINI PSEUDO-STREAMING ---
        let cleanModel = modelToUse;
        if (cleanModel.startsWith('google/')) {
            cleanModel = cleanModel.replace('google/', '');
        }

        const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:generateContent`;

        // Resolve generic image URLs to Base64 for Native Gemini
        const resolvedMessages = await resolveRemoteImages(messages);
        const contents = formatGeminiMessages(resolvedMessages);

        const requestBody = {
            contents: contents,
            tools: [
                {
                    google_search: {}
                }
            ],
            generationConfig: {
                temperature: config?.temperature !== undefined ? config.temperature : 0.7,
                maxOutputTokens: 2000
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorMsg = await response.text();
                try {
                    const jsonErr = JSON.parse(errorMsg);
                    if (jsonErr.error && jsonErr.error.message) {
                        errorMsg = jsonErr.error.message;
                    }
                } catch (e) { }
                console.error('[Native API Debug]', { endpoint, status: response.status });
                throw new Error(`Native API Error: ${errorMsg}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                const fullText = data.candidates[0].content.parts[0].text || "";

                // Simulate Streaming
                const chunkSize = 15;
                for (let i = 0; i < fullText.length; i += chunkSize) {
                    const chunk = fullText.slice(i, i + chunkSize);
                    onToken(chunk);
                    await new Promise(resolve => setTimeout(resolve, 8));
                }
            }

        } catch (error) {
            console.error("Native Search Pseudo-Stream Error:", error);
            throw error;
        }

    } else {
        // --- OPENAI COMPATIBLE STREAMING ---
        const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

        try {
            const requestBody = {
                model: modelToUse,
                messages: formatOpenAIMessages(messages),
                ...(config?.temperature !== undefined && { temperature: config.temperature }),
                stream: true,
                ...(config.tools && { tools: config.tools }),
                ...(config.tool_choice && { tool_choice: config.tool_choice })
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorMsg = await response.text();
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
                            let content = json.choices[0]?.delta?.content;
                            if (content) {
                                onToken(content);
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (error) {
            console.error("Streaming Error:", error);
            throw error;
        }
    }
}

export async function generateTitle(text) {
    try {
        const userMessage = `Summarize the following text into a very short, catchy title (max 5 words). Do not use quotes.\n\nText: ${text.substring(0, 500)}`;
        const title = await chatCompletion([{ role: 'user', content: userMessage }]);
        return title.trim();
    } catch (e) {
        return "New Conversation";
    }
}

// For Local Preview Loader compatibility
if (typeof window !== 'undefined') {
    window.LLM = {
        getApiKey, setApiKey, getBaseUrl, setBaseUrl, getModel, setModel, chatCompletion, generateTitle, streamChatCompletion
    };
}
