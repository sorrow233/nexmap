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

const STORAGE_KEY = 'mixboard_llm_key';
const STORAGE_BASE_URL = 'mixboard_llm_base_url';

export const getApiKey = () => localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY;
export const setApiKey = (key) => localStorage.setItem(STORAGE_KEY, key);

const STORAGE_MODEL = 'mixboard_llm_model';
const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp'; // Updated default



export const getBaseUrl = () => localStorage.getItem(STORAGE_BASE_URL) || DEFAULT_BASE_URL;
export const setBaseUrl = (url) => localStorage.setItem(STORAGE_BASE_URL, url);

export const getModel = () => localStorage.getItem(STORAGE_MODEL) || DEFAULT_MODEL;
export const setModel = (model) => localStorage.setItem(STORAGE_MODEL, model);



export async function chatCompletion(messages, model = null, config = {}) {
    const apiKey = config.apiKey || getApiKey();
    const baseUrl = config.baseUrl || getBaseUrl();
    const modelToUse = model || getModel();

    if (!apiKey) throw new Error("API Key is missing.");

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
                messages: messages,
                temperature: 0.7,
                thinking_level: "minimal"
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

export async function streamChatCompletion(messages, onToken, model = null) {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    const modelToUse = model || getModel();

    if (!apiKey) throw new Error("API Key is missing.");

    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: messages,
                temperature: 0.7,
                stream: true,
                thinking_level: "minimal"
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
                            // Aggressive filtering for "Thinking" artifacts
                            // 1. Remove <thinking> tags if model uses them
                            // 2. Remove common "Thinking..." prefixes if they appear at start (handled in App.jsx mostly, but safety here)
                            // Note: Streaming makes this tricky as we might split the tag. 
                            // Current simple approach: Pass raw, let UI/App.jsx handle accumulation and cleaning.
                            // BUT, we can inject a system instruction to the model to avoid it.
                            onToken(content);
                        }
                    } catch (e) {
                        console.warn("Error parsing stream chunk", e);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Streaming Error:", error);
        throw error;
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
