const STORAGE_KEY = 'mixboard_llm_key';
const STORAGE_BASE_URL = 'mixboard_llm_base_url';


// User provided default key
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEwOTQzMmQyLWI5OWEtNDQxOC05OGRjLThhZjcyMWU1NzYzMyIsInNjb3BlIjoiaWVfbW9kZWwiLCJjbGllbnRJZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.mbOmWTCQKseHX7Nzi3Se27xPx_ATycNbQx2lZh_d5V4";

export const getApiKey = () => localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY;
export const setApiKey = (key) => localStorage.setItem(STORAGE_KEY, key);

export const getBaseUrl = () => localStorage.getItem(STORAGE_BASE_URL) || 'https://api.gmi-serving.com/v1';
export const setBaseUrl = (url) => localStorage.setItem(STORAGE_BASE_URL, url);

export async function chatCompletion(messages, model = 'google/gemini-3-flash-preview') {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();

    if (!apiKey) {
        throw new Error("API Key is missing. Please set it in settings.");
    }

    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to fetch from LLM');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("LLM Error:", error);
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
        getApiKey, setApiKey, getBaseUrl, setBaseUrl, chatCompletion, generateTitle
    };
}
