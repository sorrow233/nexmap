import assert from 'node:assert/strict';
import { createPerformanceMonitor } from '../src/utils/performanceMonitor.js';
import { parseOpenAIStreamLine } from '../src/services/llm/providers/openai/streamProtocol.js';
import { parseGeminiStream } from '../src/services/llm/providers/gemini/streamParser.js';

let now = 1_000;
const monitor = createPerformanceMonitor({ model: 'thinking-model' }, {
    startedAt: now,
    now: () => now
});

monitor.onRawOutputDelta('隐藏思考', { isThinking: true });
now = 2_000;
monitor.onRawOutputDelta('最终回答', { isThinking: false });
monitor.onChunk('最终回答');
monitor.onProviderMetadata({
    usage: {
        candidatesTokenCount: 20,
        thoughtsTokenCount: 30
    }
});
now = 5_000;

const metrics = monitor.onComplete();
assert.equal(metrics.durationMs, 4_000);
assert.equal(metrics.outputTokenCount, 50);
assert.equal(metrics.tokensPerSecond, 12.5);
assert.equal(metrics.includesHiddenThinking, true);
assert.equal(metrics.tokenCountEstimated, false);
assert.equal(metrics.visibleCharCount, 4);
assert.equal(metrics.outputCharCount, 8);

let fallbackNow = 10_000;
const fallbackMonitor = createPerformanceMonitor({}, {
    startedAt: fallbackNow,
    now: () => fallbackNow
});
fallbackMonitor.onChunk('123456789012345');
fallbackNow = 13_000;
const fallbackMetrics = fallbackMonitor.onComplete();
assert.equal(fallbackMetrics.outputTokenCount, 10);
assert.equal(fallbackMetrics.tokenCountEstimated, true);
assert.equal(fallbackMetrics.includesHiddenThinking, false);

const parsedOpenAI = parseOpenAIStreamLine(
    'data: {"choices":[{"delta":{"reasoning_content":"hidden","content":"visible"}}],"usage":{"completion_tokens":42}}'
);
assert.equal(parsedOpenAI.reasoningDelta, 'hidden');
assert.equal(parsedOpenAI.delta, 'visible');
assert.equal(parsedOpenAI.usage.completion_tokens, 42);

const encoder = new TextEncoder();
const geminiLines = [
    `data: ${JSON.stringify({
        candidates: [{
            content: {
                parts: [
                    { text: '内部思考', thought: true },
                    { text: '公开回答' }
                ]
            }
        }],
        usageMetadata: {
            candidatesTokenCount: 8,
            thoughtsTokenCount: 12
        }
    })}\n`,
    'data: [DONE]\n'
];
let geminiCursor = 0;
const reader = {
    read: async () => (
        geminiCursor < geminiLines.length
            ? { done: false, value: encoder.encode(geminiLines[geminiCursor++]) }
            : { done: true, value: undefined }
    )
};
const visibleDeltas = [];
const rawDeltas = [];
const geminiMeta = await parseGeminiStream(
    reader,
    (delta) => visibleDeltas.push(delta),
    () => {},
    (delta, details) => rawDeltas.push({ delta, details })
);
assert.deepEqual(visibleDeltas, ['公开回答']);
assert.equal(rawDeltas[0].delta, '内部思考公开回答');
assert.equal(rawDeltas[0].details.thinkingCharCountDelta, 4);
assert.equal(geminiMeta.usage.thoughtsTokenCount, 12);

console.log('Answer performance metric tests passed.');
