const OPENAI_SSE_PREFIX = 'data: ';
const OPENAI_SSE_DONE = '[DONE]';
const TERMINAL_FINISH_REASONS = new Set(['stop', 'length', 'content_filter']);

export function parseOpenAIStreamLine(line = '') {
    const trimmedLine = String(line || '').trim();
    if (!trimmedLine.startsWith(OPENAI_SSE_PREFIX)) {
        return {
            isSse: false,
            isTerminal: false,
            delta: ''
        };
    }

    const dataStr = trimmedLine.slice(OPENAI_SSE_PREFIX.length).trim();
    if (!dataStr) {
        return {
            isSse: true,
            isTerminal: false,
            delta: ''
        };
    }

    if (dataStr === OPENAI_SSE_DONE) {
        return {
            isSse: true,
            isTerminal: true,
            delta: ''
        };
    }

    const data = JSON.parse(dataStr);
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const choice = data.choices?.[0] || {};
    const finishReason = typeof choice.finish_reason === 'string' ? choice.finish_reason : '';

    return {
        isSse: true,
        isTerminal: TERMINAL_FINISH_REASONS.has(finishReason),
        delta: typeof choice.delta?.content === 'string' ? choice.delta.content : ''
    };
}
