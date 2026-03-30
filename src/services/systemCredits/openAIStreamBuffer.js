import { parseOpenAIStreamLine } from '../llm/providers/openai/streamProtocol.js';

export const drainOpenAIStreamBuffer = (buffer, onToken, options = {}) => {
    const { flushTail = false } = options;
    if (!buffer) {
        return {
            emittedText: '',
            remainingBuffer: '',
            sawDone: false
        };
    }

    const segments = buffer.split('\n');
    const trailingBuffer = flushTail ? '' : (segments.pop() || '');
    const emitted = [];
    let sawDone = false;

    for (const line of segments) {
        const parsed = parseOpenAIStreamLine(line);
        if (parsed.delta) {
            onToken(parsed.delta);
            emitted.push(parsed.delta);
        }
        if (parsed.isDone) {
            sawDone = true;
            break;
        }
    }

    if (flushTail && !sawDone && trailingBuffer) {
        const parsed = parseOpenAIStreamLine(trailingBuffer);
        if (parsed.delta) {
            onToken(parsed.delta);
            emitted.push(parsed.delta);
        }
        if (parsed.isDone) {
            sawDone = true;
        }
    }

    return {
        emittedText: emitted.join(''),
        remainingBuffer: sawDone ? '' : trailingBuffer,
        sawDone
    };
};
