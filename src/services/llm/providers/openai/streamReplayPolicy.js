import { createStreamReplayGuard } from '../../streamReplayGuard.js';

export const createOpenAIStreamReplayGuard = (onToken) => createStreamReplayGuard(onToken, {
    streamLabel: 'OpenAI-compatible stream'
});

export const buildOpenAIReplayBlockedError = (replayGuard, error) => (
    replayGuard?.buildReplayBlockedError?.(error, {
        phase: 'openai-stream-retry'
    }) || null
);
