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
            console.log(`%c🚀 [AI-Perf] First Token`, 'color: #00ff00; font-weight: bold', {
                requestId: this.requestId,
                ttft: `${ttft.toFixed(2)}ms`,
                model: this.params.model,
                provider: this.params.providerId || 'default'
            });
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
            const elapsed = now - this.startTime;
            const tokensPerSec = (this.tokenCount / (elapsed / 1000)).toFixed(2);
            console.log(`%c📊 [AI-Perf] Streaming`, 'color: #ffaa00', {
                requestId: this.requestId,
                chunks: this.chunkCount,
                estimatedTokens: this.tokenCount,
                tokensPerSec: `${tokensPerSec} tok/s`,
                elapsed: `${elapsed.toFixed(0)}ms`
            });
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

        console.log(`%c✅ [AI-Perf] Complete`, 'color: #00ffff; font-weight: bold; font-size: 12px', {
            requestId: this.requestId,
            '━━━ Timing ━━━': '',
            totalTime: `${totalTime.toFixed(2)}ms`,
            ttft: ttft ? `${ttft.toFixed(2)}ms` : 'N/A',
            avgChunkInterval: `${avgChunkTime.toFixed(2)}ms`,
            '━━━ Throughput ━━━': '',
            totalChunks: this.chunkCount,
            estimatedTokens: this.tokenCount,
            tokensPerSec: `${tokensPerSec.toFixed(2)} tok/s`,
            '━━━ Model Config ━━━': '',
            model: this.params.model,
            provider: this.params.providerId || 'default',
            temperature: this.params.temperature,
            maxTokens: this.params.max_tokens || 'default',
            '━━━ Message Stats ━━━': '',
            messageCount: this.params.messages?.length || 0,
            hasImages: this.params.messages?.some(m =>
                Array.isArray(m.content) && m.content.some(p => p.type === 'image')
            ) || false
        });
    }

    onError(error) {
        const elapsed = performance.now() - this.startTime;
        console.error(`%c❌ [AI-Perf] Failed`, 'color: #ff0000; font-weight: bold', {
            requestId: this.requestId,
            elapsed: `${elapsed.toFixed(2)}ms`,
            error: error.message,
            model: this.params.model,
            provider: this.params.providerId
        });
    }
}

// Global performance tracking
let requestCounter = 0;

export function createPerformanceMonitor(params) {
    requestCounter++;
    const requestId = `req_${Date.now()}_${requestCounter}`;

    console.log(`%c🎯 [AI-Perf] Start Request`, 'color: #4a9eff; font-weight: bold', {
        requestId,
        model: params.model,
        provider: params.providerId || 'default',
        messageCount: params.messages?.length || 0,
        temperature: params.temperature,
        stream: params.stream !== false
    });

    return new PerformanceMonitor(requestId, params);
}
