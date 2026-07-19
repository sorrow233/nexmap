export const PARTIAL_STREAM_REPLAY_BLOCKED_CODE = 'PARTIAL_STREAM_REPLAY_BLOCKED';

const getErrorMessage = (error) => {
    if (!error) return 'Unknown stream interruption';
    return error?.message || String(error);
};

export function createPartialStreamReplayBlockedError(error, metadata = {}) {
    const visibleCharCount = Number(metadata.visibleCharCount) || 0;
    const streamLabel = metadata.streamLabel || 'AI stream';
    const message = `${streamLabel} interrupted after ${visibleCharCount} visible characters; automatic replay was stopped to avoid duplicate output.`;
    const wrappedError = new Error(message);

    wrappedError.name = 'PartialStreamReplayBlockedError';
    wrappedError.code = PARTIAL_STREAM_REPLAY_BLOCKED_CODE;
    wrappedError.cause = error;
    wrappedError.originalErrorMessage = getErrorMessage(error);
    wrappedError.partialStreamChars = visibleCharCount;
    wrappedError.streamAttempt = metadata.attempt || null;
    wrappedError.maxStreamAttempts = metadata.maxAttempts || null;
    wrappedError.replayPhase = metadata.phase || 'stream';
    wrappedError.streamLabel = streamLabel;

    return wrappedError;
}

export function createStreamReplayGuard(onToken, options = {}) {
    let visibleCharCount = 0;
    const streamLabel = options.streamLabel || 'AI stream';

    const trackedOnToken = (chunk) => {
        if (chunk) {
            visibleCharCount += String(chunk).length;
        }

        if (typeof onToken === 'function') {
            onToken(chunk);
        }
    };

    return {
        onToken: trackedOnToken,
        hasVisibleText: () => visibleCharCount > 0,
        getVisibleCharCount: () => visibleCharCount,
        buildReplayBlockedError: (error, metadata = {}) => {
            if (visibleCharCount <= 0) return null;
            return createPartialStreamReplayBlockedError(error, {
                streamLabel,
                ...metadata,
                visibleCharCount
            });
        }
    };
}
