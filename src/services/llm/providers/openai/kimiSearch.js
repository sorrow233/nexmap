export const KIMI_WEB_SEARCH_TOOL_NAME = '$web_search';
export const KIMI_WEB_SEARCH_MAX_TOOL_ROUNDS = 3;

export const KIMI_WEB_SEARCH_TOOL = {
    type: 'builtin_function',
    function: {
        name: KIMI_WEB_SEARCH_TOOL_NAME
    }
};

const isKimiModel = (model = '') => {
    const lower = String(model || '').toLowerCase();
    return lower.includes('kimi') || lower.includes('moonshotai/');
};

const isGmiServingBaseUrl = (baseUrl = '') => {
    const lower = String(baseUrl || '').toLowerCase();
    return lower.includes('api.gmi-serving.com');
};

const isMoonshotNativeSearchBaseUrl = (baseUrl = '') => {
    const lower = String(baseUrl || '').toLowerCase();
    return lower.includes('api.moonshot.ai');
};

export function shouldEnableKimiNativeWebSearch({ config = {}, model = '', options = {} } = {}) {
    if (options?.tools) return false;
    if (options?.tool_choice === 'none') return false;
    if (options?.useSearch === false) return false;
    if (!isKimiModel(model)) return false;

    // GMI's Kimi K3 endpoint supports standard OpenAI-compatible function tools,
    // but it does not advertise Moonshot's `$web_search` builtin. K3 also uses
    // always-on thinking, so the native-search payload's `thinking: disabled`
    // field makes GMI reject the entire request with HTTP 400.
    if (isGmiServingBaseUrl(config?.baseUrl)) return false;

    if (options?.useSearch === true) return true;
    return isMoonshotNativeSearchBaseUrl(config?.baseUrl);
}

export function getKimiNativeWebSearchBodyFields() {
    return {
        tools: [KIMI_WEB_SEARCH_TOOL],
        tool_choice: 'auto',
        thinking: { type: 'disabled' }
    };
}

export function getKimiWebSearchToolCalls(choice = {}) {
    const toolCalls = choice?.message?.tool_calls;
    if (!Array.isArray(toolCalls)) return [];

    return toolCalls.filter((toolCall) => (
        toolCall?.function?.name === KIMI_WEB_SEARCH_TOOL_NAME
    ));
}

export function hasKimiWebSearchToolCall(choice = {}) {
    return getKimiWebSearchToolCalls(choice).length > 0;
}

const parseToolArguments = (argumentsText = '') => {
    const text = String(argumentsText || '').trim();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const buildKimiToolResultContent = (toolCall = {}) => {
    const parsedArguments = parseToolArguments(toolCall?.function?.arguments);
    return typeof parsedArguments === 'string'
        ? parsedArguments
        : JSON.stringify(parsedArguments);
};

export function appendKimiWebSearchToolMessages(messages = [], choice = {}) {
    const message = choice?.message || {};
    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

    const assistantMessage = {
        role: 'assistant',
        content: typeof message.content === 'string' ? message.content : (message.content ?? null),
        tool_calls: toolCalls
    };

    if (typeof message.reasoning_content === 'string') {
        assistantMessage.reasoning_content = message.reasoning_content;
    }

    const toolMessages = toolCalls.map((toolCall) => {
        const toolCallName = toolCall?.function?.name || KIMI_WEB_SEARCH_TOOL_NAME;
        const isWebSearch = toolCallName === KIMI_WEB_SEARCH_TOOL_NAME;

        return {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCallName,
            content: isWebSearch
                ? buildKimiToolResultContent(toolCall)
                : JSON.stringify({ error: `Unsupported tool: ${toolCallName}` })
        };
    });

    return [...messages, assistantMessage, ...toolMessages];
}
