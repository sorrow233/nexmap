import assert from 'node:assert/strict';
import {
    buildOpenAIReplayBlockedError,
    createOpenAIStreamReplayGuard
} from '../src/services/llm/providers/openai/streamReplayPolicy.js';
import { PARTIAL_STREAM_REPLAY_BLOCKED_CODE } from '../src/services/llm/streamReplayGuard.js';

const emitted = [];
const replayGuard = createOpenAIStreamReplayGuard((chunk) => emitted.push(chunk));
replayGuard.onToken('第一段：「結');

const replayBlockedError = buildOpenAIReplayBlockedError(
    replayGuard,
    new Error('socket closed after output')
);

assert.deepEqual(emitted, ['第一段：「結']);
assert.equal(replayBlockedError?.code, PARTIAL_STREAM_REPLAY_BLOCKED_CODE);
assert.equal(replayBlockedError.partialStreamChars, '第一段：「結'.length);
assert.equal(replayBlockedError.originalErrorMessage, 'socket closed after output');
assert.equal(replayBlockedError.replayPhase, 'openai-stream-retry');
assert.equal(replayBlockedError.streamLabel, 'OpenAI-compatible stream');

const quietReplayGuard = createOpenAIStreamReplayGuard(() => { });
const quietError = buildOpenAIReplayBlockedError(
    quietReplayGuard,
    new Error('socket closed before output')
);

assert.equal(quietError, null);
assert.equal(quietReplayGuard.hasVisibleText(), false);

console.log('[test-openai-stream-replay] PASS');
