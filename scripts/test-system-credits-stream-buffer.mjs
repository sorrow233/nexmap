import assert from 'node:assert/strict';
import { drainOpenAIStreamBuffer } from '../src/services/systemCredits/openAIStreamBuffer.js';
import { createThinkingTagFilter, parseOpenAIStreamLine } from '../src/services/llm/providers/openai/streamProtocol.js';

const collectDeltas = (buffer, options = {}) => {
    const chunks = [];
    const result = drainOpenAIStreamBuffer(buffer, (delta) => {
        chunks.push(delta);
    }, options);

    return {
        chunks,
        ...result
    };
};

const partial = collectDeltas(
    'data: {"choices":[{"delta":{"content":"前半段"}}]}\n' +
    'data: {"choices":[{"delta":{"content":"最后一段"}}]}'
);

assert.deepEqual(partial.chunks, ['前半段']);
assert.equal(partial.emittedText, '前半段');
assert.equal(partial.sawTerminal, false);
assert.equal(
    partial.remainingBuffer,
    'data: {"choices":[{"delta":{"content":"最后一段"}}]}'
);

const flushed = collectDeltas(partial.remainingBuffer, { flushTail: true });

assert.deepEqual(flushed.chunks, ['最后一段']);
assert.equal(flushed.emittedText, '最后一段');
assert.equal(flushed.sawTerminal, false);
assert.equal(flushed.remainingBuffer, '');

const withDone = collectDeltas(
    'data: {"choices":[{"delta":{"content":"完整回答"}}]}\n' +
    'data: [DONE]',
    { flushTail: true }
);

assert.deepEqual(withDone.chunks, ['完整回答']);
assert.equal(withDone.emittedText, '完整回答');
assert.equal(withDone.sawTerminal, true);

const deltaText = parseOpenAIStreamLine('data: {"choices":[{"delta":{"text":"兼容字段"}}]}');
assert.equal(deltaText.delta, '兼容字段');
assert.equal(deltaText.isTerminal, false);

const messageContent = parseOpenAIStreamLine('{"choices":[{"message":{"content":"JSON 行内容"}}]}');
assert.equal(messageContent.delta, 'JSON 行内容');
assert.equal(messageContent.isSse, false);

const thinkingChunks = [];
const thinkingFilter = createThinkingTagFilter({
    enabled: true,
    onToken: (chunk) => thinkingChunks.push(chunk)
});
thinkingFilter.push('正常回答');
thinkingFilter.flush();
assert.deepEqual(thinkingChunks, ['正常回答']);

const taggedThinkingChunks = [];
const taggedThinkingFilter = createThinkingTagFilter({
    enabled: true,
    onToken: (chunk) => taggedThinkingChunks.push(chunk)
});
taggedThinkingFilter.push('<think>隐藏思考');
taggedThinkingFilter.push('</think>\n最终回答');
taggedThinkingFilter.flush();
assert.deepEqual(taggedThinkingChunks, ['最终回答']);

console.log('[test-system-credits-stream-buffer] PASS');
