const OPENAI_SSE_PREFIX = 'data: ';
const OPENAI_SSE_DONE = '[DONE]';

const parseOpenAIStreamLine = (line, onToken) => {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith(OPENAI_SSE_PREFIX)) {
        return '';
    }

    const dataStr = trimmedLine.slice(OPENAI_SSE_PREFIX.length);
    if (!dataStr || dataStr === OPENAI_SSE_DONE) {
        return '';
    }

    const data = JSON.parse(dataStr);
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const delta = data.choices?.[0]?.delta?.content;
    if (typeof delta === 'string' && delta.length > 0) {
        onToken(delta);
        return delta;
    }

    return '';
};

export const drainOpenAIStreamBuffer = (buffer, onToken, options = {}) => {
    const { flushTail = false } = options;
    if (!buffer) {
        return {
            emittedText: '',
            remainingBuffer: ''
        };
    }

    const segments = buffer.split('\n');
    const remainingBuffer = flushTail ? '' : (segments.pop() || '');
    const emitted = [];

    segments.forEach((line) => {
        const delta = parseOpenAIStreamLine(line, onToken);
        if (delta) {
            emitted.push(delta);
        }
    });

    if (flushTail && remainingBuffer) {
        const delta = parseOpenAIStreamLine(remainingBuffer, onToken);
        if (delta) {
            emitted.push(delta);
        }
    }

    return {
        emittedText: emitted.join(''),
        remainingBuffer
    };
};
