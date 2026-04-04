import { extractCandidateText } from '../src/services/llm/providers/gemini/partUtils.js';
import { parseGeminiStream } from '../src/services/llm/providers/gemini/streamParser.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const encode = (text) => new TextEncoder().encode(text);

const createReader = (chunks, tracker = null) => {
    let index = 0;
    return {
        async read() {
            if (tracker) tracker.reads += 1;
            if (index >= chunks.length) return { done: true, value: undefined };
            const value = encode(chunks[index]);
            index += 1;
            return { done: false, value };
        },
        async cancel() {
            if (tracker) tracker.cancelled = true;
        },
        releaseLock() { }
    };
};

const runUnitChecks = async () => {
    const mixedCandidate = {
        content: {
            parts: [
                { thought: true, text: 'THINK' },
                { text: 'FINAL_ANSWER' }
            ]
        }
    };

    assert(
        extractCandidateText(mixedCandidate, { includeThoughtFallback: false }) === 'FINAL_ANSWER',
        'extractCandidateText should ignore thought parts when visible answer exists'
    );

    assert(
        extractCandidateText(mixedCandidate, { includeThoughtFallback: true }) === 'FINAL_ANSWER',
        'extractCandidateText fallback should still prioritize visible answer'
    );

    const onlyThoughtCandidate = {
        content: {
            parts: [{ thought: true, text: 'THINK_ONLY' }]
        }
    };

    assert(
        extractCandidateText(onlyThoughtCandidate, { includeThoughtFallback: false }) === '',
        'extractCandidateText should return empty when only thought exists and fallback disabled'
    );

    assert(
        extractCandidateText(onlyThoughtCandidate, { includeThoughtFallback: true }) === 'THINK_ONLY',
        'extractCandidateText should return thought text when fallback enabled'
    );

    const streamChunks = [
        'data: {"candidates":[{"content":{"parts":[{"thought":true,"text":"THINK"},{"text":"答"}]}}]}\n',
        'data: {"candidates":[{"content":{"parts":[{"thought":true,"text":"THINK_MORE"},{"text":"答案"}]}}]}\n',
        'data: [DONE]\n'
    ];

    const tokens = [];
    await parseGeminiStream(createReader(streamChunks), (chunk) => tokens.push(chunk), () => { });
    assert(tokens.join('') === '答案', `parseGeminiStream expected "答案", got "${tokens.join('')}"`);

    const doneTracker = { reads: 0, cancelled: false };
    const doneThenNoiseChunks = [
        'data: {"candidates":[{"content":{"parts":[{"text":"已完成"}]}}]}\n',
        'data: [DONE]\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"不该继续读取"}]}}]}\n'
    ];
    const doneTokens = [];
    await parseGeminiStream(createReader(doneThenNoiseChunks, doneTracker), (chunk) => doneTokens.push(chunk), () => { });
    assert(doneTokens.join('') === '已完成', `parseGeminiStream should stop at DONE, got "${doneTokens.join('')}"`);
    assert(doneTracker.cancelled === true, 'parseGeminiStream should cancel reader after grace timeout or extra tail data');
    assert(doneTracker.reads < 4, `parseGeminiStream should stop reading early, got ${doneTracker.reads} reads`);

    const onlyThoughtChunks = [
        'data: {"candidates":[{"content":{"parts":[{"thought":true,"text":"JUST_THINK"}]}}]}\n',
        'data: [DONE]\n'
    ];

    let caught = null;
    try {
        await parseGeminiStream(createReader(onlyThoughtChunks), () => { }, () => { });
    } catch (error) {
        caught = error;
    }

    assert(caught?.code === 'EMPTY_VISIBLE_STREAM', 'only-thought stream should throw EMPTY_VISIBLE_STREAM');
};

runUnitChecks()
    .then(() => {
        console.log('[test-gemini-parser] PASS');
    })
    .catch((error) => {
        console.error('[test-gemini-parser] FAIL:', error?.message || error);
        process.exitCode = 1;
    });
