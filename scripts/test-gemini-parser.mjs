import { extractCandidateText } from '../src/services/llm/providers/gemini/partUtils.js';
import { parseGeminiStream } from '../src/services/llm/providers/gemini/streamParser.js';
import {
    createStreamReplayGuard,
    PARTIAL_STREAM_REPLAY_BLOCKED_CODE
} from '../src/services/llm/providers/gemini/streamReplayGuard.js';

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

const createFailingReader = (chunks, error) => {
    let index = 0;
    return {
        async read() {
            if (index >= chunks.length) throw error;
            const value = encode(chunks[index]);
            index += 1;
            return { done: false, value };
        },
        async cancel() { },
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

    const interruptedTokens = [];
    let interruptedError = null;
    try {
        await parseGeminiStream(
            createFailingReader([
                'data: {"candidates":[{"content":{"parts":[{"text":"开头"}]}}]}\n'
            ], new Error('socket closed')),
            (chunk) => interruptedTokens.push(chunk),
            () => { }
        );
    } catch (error) {
        interruptedError = error;
    }

    assert(interruptedTokens.join('') === '开头', 'interrupted stream should keep the partial visible text');
    assert(
        interruptedError?.code === PARTIAL_STREAM_REPLAY_BLOCKED_CODE,
        'interrupted stream after visible output should block automatic replay'
    );
    assert(
        interruptedError.originalErrorMessage === 'socket closed',
        'replay-blocked stream error should retain the original interruption message'
    );

    const replayedTokens = [];
    const replayGuard = createStreamReplayGuard((chunk) => replayedTokens.push(chunk));
    replayGuard.onToken('今天是');
    replayGuard.onToken('');
    const replayBlockedError = replayGuard.buildReplayBlockedError(new Error('socket closed'), {
        phase: 'retry',
        attempt: 1,
        maxAttempts: 4
    });

    assert(replayedTokens.join('') === '今天是', 'stream replay guard should forward original chunks');
    assert(replayGuard.hasVisibleText() === true, 'stream replay guard should record visible output');
    assert(replayGuard.getVisibleCharCount() === 3, 'stream replay guard should count emitted visible characters');
    assert(
        replayBlockedError?.code === PARTIAL_STREAM_REPLAY_BLOCKED_CODE,
        'stream replay guard should create a replay-blocked error after visible output'
    );
    assert(replayBlockedError.partialStreamChars === 3, 'replay-blocked error should include emitted char count');

    const quietReplayGuard = createStreamReplayGuard(() => { });
    assert(
        quietReplayGuard.buildReplayBlockedError(new Error('failed before output')) === null,
        'stream replay guard should allow retry/fallback before visible output'
    );
};

runUnitChecks()
    .then(() => {
        console.log('[test-gemini-parser] PASS');
    })
    .catch((error) => {
        console.error('[test-gemini-parser] FAIL:', error?.message || error);
        process.exitCode = 1;
    });
