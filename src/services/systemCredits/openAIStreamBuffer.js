import { parseOpenAIStreamLine } from '../llm/providers/openai/streamProtocol.js';

export const drainOpenAIStreamBuffer = (buffer, onToken, options = {}) => {
    const { flushTail = false, onRawOutputDelta = null } = options;
    if (!buffer) {
        return {
            emittedText: '',
            remainingBuffer: '',
            sawTerminal: false
        };
    }

    const segments = buffer.split('\n');
    const trailingBuffer = flushTail ? '' : (segments.pop() || '');
    const emitted = [];
    let sawTerminal = false;

    for (const line of segments) {
        const parsed = parseOpenAIStreamLine(line);
        if (parsed.reasoningDelta && typeof onRawOutputDelta === 'function') {
            onRawOutputDelta(parsed.reasoningDelta, { isThinking: true });
        }
        if (parsed.delta) {
            if (typeof onRawOutputDelta === 'function') {
                onRawOutputDelta(parsed.delta, { isThinking: false });
            }
            onToken(parsed.delta);
            emitted.push(parsed.delta);
        }
        if (parsed.isTerminal) {
            sawTerminal = true;
            break;
        }
    }

    if (flushTail && !sawTerminal && trailingBuffer) {
        const parsed = parseOpenAIStreamLine(trailingBuffer);
        if (parsed.reasoningDelta && typeof onRawOutputDelta === 'function') {
            onRawOutputDelta(parsed.reasoningDelta, { isThinking: true });
        }
        if (parsed.delta) {
            if (typeof onRawOutputDelta === 'function') {
                onRawOutputDelta(parsed.delta, { isThinking: false });
            }
            onToken(parsed.delta);
            emitted.push(parsed.delta);
        }
        if (parsed.isTerminal) {
            sawTerminal = true;
        }
    }

    return {
        emittedText: emitted.join(''),
        remainingBuffer: sawTerminal ? '' : trailingBuffer,
        sawTerminal
    };
};
