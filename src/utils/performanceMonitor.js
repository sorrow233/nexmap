/**
 * AI Performance Monitoring Utility
 * Tracks LLM response performance metrics including TTFT, tokens/sec, and all parameters
 */

class PerformanceMonitor {
    constructor(requestId, params) {
        this.requestId = requestId;
        this.params = params; // Store all LLM parameters
        this.startTime = performance.now();
        this.firstTokenTime = null;
        this.tokenCount = 0;
        this.chunkCount = 0;
        this.lastChunkTime = this.startTime;
        this.finished = false;
    }

    onFirstToken() {
        if (this.firstTokenTime === null) {
            this.firstTokenTime = performance.now();
            const ttft = this.firstTokenTime - this.startTime;
        }
    }

    onChunk(chunk) {
        this.chunkCount++;
        // Rough token estimation (actual tokens would need tokenizer)
        // For Chinese/English mixed text, ~1.5 chars per token on average
        const estimatedTokens = Math.ceil(chunk.length / 1.5);
        this.tokenCount += estimatedTokens;

        const now = performance.now();
        const timeSinceLastChunk = now - this.lastChunkTime;
        this.lastChunkTime = now;

        // Only log every 10 chunks to avoid spam
        if (this.chunkCount % 10 === 0) {
            const now = performance.now();
            const elapsed = now - this.startTime;
            const tokensPerSec = (this.tokenCount / (elapsed / 1000)).toFixed(2);
        }
    }

    onComplete() {
        if (this.finished) return;
        this.finished = true;

        const endTime = performance.now();
        const totalTime = endTime - this.startTime;
        const ttft = this.firstTokenTime ? this.firstTokenTime - this.startTime : null;
        const tokensPerSec = this.tokenCount / (totalTime / 1000);
        const avgChunkTime = totalTime / this.chunkCount;
    }

    onError(error) {
        const elapsed = performance.now() - this.startTime;
    }
}

// Global performance tracking
let requestCounter = 0;

export function createPerformanceMonitor(params) {
    requestCounter++;
    const requestId = `req_${Date.now()}_${requestCounter}`;

    return new PerformanceMonitor(requestId, params);
}
