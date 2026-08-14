const ESTIMATED_CHARS_PER_TOKEN = 1.5;

const toNonNegativeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
};

const resolveProviderUsage = (metadata = {}) => {
    const usage = metadata?.usage || metadata?.usageMetadata || metadata || {};
    const completionTokens = toNonNegativeNumber(usage.completion_tokens);
    const outputTokens = toNonNegativeNumber(usage.output_tokens);
    const candidateTokens = toNonNegativeNumber(usage.candidatesTokenCount);
    const thoughtTokens = toNonNegativeNumber(
        usage.thoughtsTokenCount
        ?? usage.completion_tokens_details?.reasoning_tokens
        ?? usage.output_tokens_details?.reasoning_tokens
    );

    if (completionTokens !== null) {
        return {
            outputTokenCount: completionTokens,
            thinkingTokenCount: thoughtTokens,
            isEstimated: false
        };
    }
    if (outputTokens !== null) {
        return {
            outputTokenCount: outputTokens,
            thinkingTokenCount: thoughtTokens,
            isEstimated: false
        };
    }
    if (candidateTokens !== null || (thoughtTokens !== null && thoughtTokens > 0)) {
        return {
            outputTokenCount: (candidateTokens || 0) + (thoughtTokens || 0),
            thinkingTokenCount: thoughtTokens,
            isEstimated: false
        };
    }

    return null;
};

class PerformanceMonitor {
    constructor(requestId, params = {}, options = {}) {
        this.requestId = requestId;
        this.params = params;
        this.now = typeof options.now === 'function' ? options.now : Date.now;
        this.startedAt = Number(options.startedAt) || this.now();
        this.firstVisibleChunkAt = null;
        this.visibleCharCount = 0;
        this.rawOutputCharCount = 0;
        this.hiddenThinkingCharCount = 0;
        this.hasRawOutputTelemetry = false;
        this.providerUsage = null;
        this.chunkCount = 0;
        this.finishedMetrics = null;
    }

    onFirstToken() {
        if (this.firstVisibleChunkAt === null) {
            this.firstVisibleChunkAt = this.now();
        }
    }

    onChunk(chunk) {
        const text = typeof chunk === 'string' ? chunk : '';
        if (!text) return;
        this.onFirstToken();
        this.visibleCharCount += text.length;
        this.chunkCount += 1;
    }

    onRawOutputDelta(chunk, details = {}) {
        const text = typeof chunk === 'string' ? chunk : '';
        if (!text) return;

        this.hasRawOutputTelemetry = true;
        this.rawOutputCharCount += text.length;
        const explicitThinkingChars = toNonNegativeNumber(details.thinkingCharCountDelta);
        if (explicitThinkingChars !== null) {
            this.hiddenThinkingCharCount += Math.min(text.length, explicitThinkingChars);
        } else if (details.isThinking === true) {
            this.hiddenThinkingCharCount += text.length;
        }
    }

    onProviderMetadata(metadata = {}) {
        const usage = resolveProviderUsage(metadata);
        if (usage) this.providerUsage = usage;
    }

    onComplete(status = 'completed') {
        if (this.finishedMetrics) return this.finishedMetrics;

        const completedAt = this.now();
        const durationMs = Math.max(1, completedAt - this.startedAt);
        const outputCharCount = this.hasRawOutputTelemetry
            ? this.rawOutputCharCount
            : this.visibleCharCount;
        const estimatedOutputTokens = Math.ceil(outputCharCount / ESTIMATED_CHARS_PER_TOKEN);
        const outputTokenCount = this.providerUsage?.outputTokenCount ?? estimatedOutputTokens;
        const providerThinkingTokenCount = this.providerUsage?.thinkingTokenCount;
        const hasExactThinkingTokenCount = providerThinkingTokenCount !== null
            && providerThinkingTokenCount !== undefined;
        const estimatedThinkingTokenCount = this.hiddenThinkingCharCount > 0
            ? Math.ceil(
                outputTokenCount * (
                    this.rawOutputCharCount > 0
                        ? this.hiddenThinkingCharCount / this.rawOutputCharCount
                        : 0
                )
            )
            : 0;
        const thinkingTokenCount = Math.min(
            outputTokenCount,
            hasExactThinkingTokenCount
                ? providerThinkingTokenCount
                : estimatedThinkingTokenCount
        );
        const includesHiddenThinking = this.hiddenThinkingCharCount > 0 || thinkingTokenCount > 0;
        const thinkingPercentage = outputTokenCount > 0 && thinkingTokenCount > 0
            ? Math.max(1, Math.min(100, Math.round((thinkingTokenCount / outputTokenCount) * 100)))
            : 0;

        this.finishedMetrics = {
            status,
            startedAt: this.startedAt,
            completedAt,
            durationMs,
            firstVisibleChunkMs: this.firstVisibleChunkAt === null
                ? null
                : Math.max(0, this.firstVisibleChunkAt - this.startedAt),
            outputTokenCount,
            thinkingTokenCount,
            thinkingPercentage,
            thinkingTokenCountEstimated: includesHiddenThinking && !hasExactThinkingTokenCount,
            tokensPerSecond: Number((outputTokenCount / (durationMs / 1000)).toFixed(2)),
            outputCharCount,
            visibleCharCount: this.visibleCharCount,
            hiddenThinkingCharCount: this.hiddenThinkingCharCount,
            includesHiddenThinking,
            tokenCountEstimated: this.providerUsage?.isEstimated ?? true
        };
        return this.finishedMetrics;
    }

    onError() {
        return this.onComplete('failed');
    }
}

let requestCounter = 0;

export function createPerformanceMonitor(params, options = {}) {
    requestCounter += 1;
    const requestId = `req_${Date.now()}_${requestCounter}`;
    return new PerformanceMonitor(requestId, params, options);
}

export { resolveProviderUsage };
