const OPENAI_SSE_PREFIX = 'data: ';
const OPENAI_SSE_DONE = '[DONE]';
const TERMINAL_FINISH_REASONS = new Set(['stop', 'length', 'content_filter']);
const THINK_OPEN_TAG = '<think>';
const THINK_CLOSE_TAG = '</think>';

const extractTextPart = (part) => {
    if (typeof part === 'string') return part;
    if (!part || typeof part !== 'object') return '';
    if (typeof part.text === 'string') return part.text;
    if (typeof part.content === 'string') return part.content;
    return '';
};

const extractContentText = (content) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(extractTextPart).join('');
    return '';
};

const extractChoiceDeltaText = (choice = {}) => {
    const delta = choice.delta || {};

    return [
        extractContentText(delta.content),
        extractContentText(delta.text),
        extractContentText(choice.message?.content),
        extractContentText(choice.text)
    ].find((text) => text.length > 0) || '';
};

const isPossibleThinkOpeningPrefix = (text = '') => {
    const probe = String(text || '').trimStart();
    return probe.length > 0 && THINK_OPEN_TAG.startsWith(probe);
};

export function parseOpenAIStreamLine(line = '') {
    const trimmedLine = String(line || '').trim();
    if (!trimmedLine || trimmedLine.startsWith(':')) {
        return {
            isSse: false,
            isTerminal: false,
            delta: ''
        };
    }

    const isSse = trimmedLine.startsWith(OPENAI_SSE_PREFIX);
    const isJsonLine = trimmedLine.startsWith('{') && trimmedLine.endsWith('}');
    if (!isSse && !isJsonLine) {
        return {
            isSse: false,
            isTerminal: false,
            delta: ''
        };
    }

    const dataStr = isSse
        ? trimmedLine.slice(OPENAI_SSE_PREFIX.length).trim()
        : trimmedLine;
    if (!dataStr) {
        return {
            isSse,
            isTerminal: false,
            delta: ''
        };
    }

    if (dataStr === OPENAI_SSE_DONE) {
        return {
            isSse,
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
        isSse,
        isTerminal: TERMINAL_FINISH_REASONS.has(finishReason),
        delta: extractChoiceDeltaText(choice)
    };
}

export function createThinkingTagFilter({ enabled = false, onToken }) {
    let mode = enabled ? 'detect' : 'pass';
    let buffer = '';

    const emit = (text) => {
        if (text && typeof onToken === 'function') {
            onToken(text);
        }
    };

    const flushAsAnswer = () => {
        if (buffer) {
            emit(buffer);
            buffer = '';
        }
        mode = 'pass';
    };

    const skipThinkingUntilClose = () => {
        const closeIndex = buffer.indexOf(THINK_CLOSE_TAG);
        if (closeIndex === -1) return;

        const afterThink = buffer.slice(closeIndex + THINK_CLOSE_TAG.length).replace(/^\s+/, '');
        buffer = '';
        mode = 'pass';
        emit(afterThink);
    };

    return {
        push(content = '') {
            if (!content) return;

            if (mode === 'pass') {
                emit(content);
                return;
            }

            buffer += content;

            if (mode === 'skip') {
                skipThinkingUntilClose();
                return;
            }

            const probe = buffer.trimStart();
            if (!probe) return;

            if (probe.startsWith(THINK_OPEN_TAG)) {
                const openIndex = buffer.indexOf(THINK_OPEN_TAG);
                buffer = buffer.slice(openIndex + THINK_OPEN_TAG.length);
                mode = 'skip';
                skipThinkingUntilClose();
                return;
            }

            if (isPossibleThinkOpeningPrefix(buffer)) {
                return;
            }

            flushAsAnswer();
        },

        flush() {
            if (mode === 'detect' || mode === 'skip') {
                flushAsAnswer();
            }
        }
    };
}
