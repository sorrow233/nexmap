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



export async function chatCompletion(messages, model = null, config = {}) {
    const apiKey = config.apiKey || getApiKey();
    const baseUrl = config.baseUrl || getBaseUrl();
    const modelToUse = model || getModel();

    if (!apiKey) throw new Error("API Key is missing.");

    // Detect if we should use Native Gemini API
    // Logic: If provider is GMI Cloud (gmicloud) OR model name starts with 'google/' but NOT using openai endpoint
    // To be safe, let's look for 'gmi-serving' in baseUrl as a strong signal
    const isNativeGemini = baseUrl.includes('gmi-serving.com') || (baseUrl.includes('googleapis.com') && !baseUrl.includes('openai'));

    // Inject Current Date/Time to System Prompt or User Message
    // This is critical for the model to know it's 2025, not 2024.
    const now = new Date();
    const dateContext = `Current Date and Time: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}.`;

    if (isNativeGemini) {
        // --- NATIVE GEMINI API MODE ---
        // Endpoint: /v1/models/{model}:generateContent

        // Refactor: Strip 'google/' prefix to match working Python script
        let cleanModel = modelToUse;
        if (cleanModel.startsWith('google/')) {
            cleanModel = cleanModel.replace('google/', '');
        }
        const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:generateContent`;

        // 1. Inject date context and FILTER out empty messages
        const filteredMessages = messages.filter(m => m.content && m.content.trim() !== '');

        // Convert Messages to Native Format
        const contentsRaw = filteredMessages.map(msg => ({
            role: msg.role === 'user' || msg.role === 'system' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Merge consecutive roles
        const contents = [];
        for (const msg of contentsRaw) {
            if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
                contents[contents.length - 1].parts[0].text += "\n\n" + msg.parts[0].text;
            } else {
                contents.push(msg);
            }
        }



        const requestBody = {
            contents: contents,
            tools: [
                {
                    google_search: {} // Force Google Search Grounding
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
                    // Native Error Format
                    errorMsg = err.error?.message || JSON.stringify(err);
                } catch (e) {
                    errorMsg = await response.text();
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            // Native Response Parsing
            // data.candidates[0].content.parts[0].text
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                return data.candidates[0].content.parts[0].text;
            } else {
                return ""; // No content generated
            }

        } catch (error) {
            console.error("LLM Native Error:", error);
            throw error;
        }

    } else {
        // --- OPENAI COMPATIBLE MODE (Legacy/Other Providers) ---
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
                    messages: messages, // OpenAI format
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
    // Current Streaming Implementation needs major refactor for Native API
    // Native API streaming endpoint: ...:streamGenerateContent
    // Response format: stream of JSON objects, each containing a candidate chunk

    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    const modelToUse = model || getModel();

    if (!apiKey) throw new Error("API Key is missing.");

    const isNativeGemini = baseUrl.includes('gmi-serving.com') || (baseUrl.includes('googleapis.com') && !baseUrl.includes('openai'));

    // Inject Date Context
    const now = new Date();
    const dateContext = `Current Date and Time: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}.`;

    if (isNativeGemini) {
        // --- NATIVE GEMINI PSEUDO-STREAMING ---
        // The :streamGenerateContent endpoint is unstable on GMI Cloud.
        // Solution: Use the working :generateContent endpoint (with Search Grounding)
        // then simulate streaming by chunking the response.

        // Refactor: Match Python script logic for URL construction
        // Remove 'google/' prefix if present, as Native API expects just the model ID
        let cleanModel = modelToUse;
        if (cleanModel.startsWith('google/')) {
            cleanModel = cleanModel.replace('google/', '');
        }

        const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${cleanModel}:generateContent`;

        // 1. Inject date context and FILTER out empty messages
        const filteredMessages = messages.filter(m => m.content && m.content.trim() !== '');

        const messagesWithDate = [...filteredMessages];
        if (messagesWithDate.length > 0) {
            const firstUserMsgIndex = messagesWithDate.findIndex(m => m.role === 'user');
            if (firstUserMsgIndex !== -1) {
                messagesWithDate[firstUserMsgIndex] = {
                    ...messagesWithDate[firstUserMsgIndex],
                    content: `${dateContext}\n\n${messagesWithDate[firstUserMsgIndex].content}`
                };
            }
        }

        // 2. Map messages to Native format
        let rawContents = messagesWithDate.map(msg => ({
            role: msg.role === 'user' || msg.role === 'system' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // 3. Merge consecutive messages with the same role (Critical for Gemini API)
        const contents = [];
        for (const msg of rawContents) {
            if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
                // Merge into previous message
                const prev = contents[contents.length - 1];
                prev.parts[0].text += "\n\n" + msg.parts[0].text;
            } else {
                contents.push(msg);
            }
        }

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
                // Extract useful error message if JSON
                try {
                    const jsonErr = JSON.parse(errorMsg);
                    if (jsonErr.error && jsonErr.error.message) {
                        errorMsg = jsonErr.error.message;
                    }
                } catch (e) { }
                console.error('[Native API Debug]', { endpoint, status: response.status, messagesCount: messages.length });
                throw new Error(`Native API Error: ${errorMsg}. Check API key, model name, and message format.`);
            }

            const data = await response.json();

            // Extract full content
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                const fullText = data.candidates[0].content.parts[0].text || "";

                // Simulate Streaming by chunking
                const chunkSize = 15; // chars per chunk
                for (let i = 0; i < fullText.length; i += chunkSize) {
                    const chunk = fullText.slice(i, i + chunkSize);
                    onToken(chunk);
                    // Small delay for typing effect
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
                messages: messages,
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
