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
        const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${modelToUse}:generateContent`;

        // Convert Messages to Native Format
        // OpenAI: [{role: 'user', content: '...'}, ...]
        // Gemini: contents: [{role: 'user', parts: [{text: '...'}]}, ...]
        // Note: System prompts in Gemini are properly handled via 'system_instruction' but GMI might behave differently.
        // Safer approach: Prepend system prompt to first user message or use 'user' role for system instructions if strictly following chat history.
        // GMI's native endpoint expects 'user' and 'model' roles.

        const contents = messages.map(msg => ({
            role: msg.role === 'user' || msg.role === 'system' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Inject Date Context into the last user message to ensure it's picked up
        // Or append as a new user part
        if (contents.length > 0) {
            const lastMsg = contents[contents.length - 1];
            if (lastMsg.role === 'user') {
                lastMsg.parts[0].text = `[System: ${dateContext}]\n\n${lastMsg.parts[0].text}`;
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
        // The :streamGenerateContent endpoint is unstable. Use :generateContent instead and simulate streaming.
        const endpoint = `${baseUrl.replace(/\/$/, '')}/models/${modelToUse}:generateContent`;
        // Note: GMI Cloud specifically supports SSE via ?alt=sse or similar standard. 
        // Official Google API uses a different streaming protocol (REST stream of JSONs). 
        // GMI Cloud documentation usually implies OpenAI compatibility for streaming, OR Native streaming.
        // Let's assume Native REST Streaming (Chunked Transfer Encoding) of JSON objects if NOT using /chat/completions.
        // BUT wait, standard browser fetch stream handling works for line-delimited JSON or concat JSON.

        // Let's TRY using the standard OpenAI-compatible endpoint for Streaming FIRST if possible?
        // NO, User explicitly wants "Native + Searching". 
        // Native Streaming URL: /models/{model}:streamGenerateContent

        const contents = messages.map(msg => ({
            role: msg.role === 'user' || msg.role === 'system' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        if (contents.length > 0) {
            const lastMsg = contents[contents.length - 1];
            if (lastMsg.role === 'user') {
                lastMsg.parts[0].text = `[System: ${dateContext}]\n\n${lastMsg.parts[0].text}`;
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

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Native Stream Failed: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Native API returns a JSON array of objects, but streamed.
            // Typically it comes as independent JSON objects like:
            // [{...}]\n[{...}] OR [ \n { ... }, \n { ... } ]
            // We need to parse valid JSON objects from the buffer.

            // Heuristic parsers for "JSON Stream"
            let bracketOpenIndex = buffer.indexOf('{');
            while (bracketOpenIndex !== -1) {
                let bracketCloseIndex = -1;
                let openCount = 0;
                // Find matching closing brace
                for (let i = bracketOpenIndex; i < buffer.length; i++) {
                    if (buffer[i] === '{') openCount++;
                    if (buffer[i] === '}') openCount--;
                    if (openCount === 0) {
                        bracketCloseIndex = i;
                        break;
                    }
                }

                if (bracketCloseIndex !== -1) {
                    const jsonStr = buffer.substring(bracketOpenIndex, bracketCloseIndex + 1);
                    buffer = buffer.substring(bracketCloseIndex + 1); // Advance buffer

                    try {
                        const json = JSON.parse(jsonStr);
                        // Extract content
                        // candidates[0].content.parts[0].text
                        if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts) {
                            const text = json.candidates[0].content.parts[0].text;
                            if (text) onToken(text);
                        }
                    } catch (e) {
                        console.warn("Stream JSON Parse Error", e);
                    }

                    bracketOpenIndex = buffer.indexOf('{');
                } else {
                    break; // Wait for more data
                }
            }
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
