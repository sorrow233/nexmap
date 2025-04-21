
import { uuid } from '../../utils/uuid.js';

/**
 * Task Priorities
 */
export const PRIORITY = {
    CRITICAL: 3, // User waiting directly (e.g., Modal Chat)
    HIGH: 2,     // Visible UI updates (e.g., Card Generation)
    LOW: 1,      // Background tasks
};

/**
 * Task Status
 */
export const STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
};

class AIManager {
    constructor() {
        if (AIManager.instance) {
            return AIManager.instance;
        }

        this.queue = [];
        this.activeTasks = new Map(); // taskId -> { controller, task }
        this.results = new Map();     // taskId -> result
        this.concurrencyLimit = 1; // STRICT LIMIT: 1 concurrent request for stability
        this.processing = false;

        AIManager.instance = this;
    }

    /**
     * Request a new AI task
     * @param {Object} params
     * @param {string} params.type - 'chat' | 'image'
     * @param {number} params.priority - Use PRIORITY constants
     * @param {Object} params.payload - Data needed for the task
     * @param {string[]} params.tags - For cancellation/deduplication (e.g. ['card:123'])
     * @param {Function} params.onProgress - Callback for streaming
     * @returns {PromiseString} A promise that resolves with the full generated text/result
     */
    requestTask({ type, priority = PRIORITY.LOW, payload, tags = [], onProgress }) {
        // 1. Check for Conflicts (Cancellation)
        this._cancelConflictingTasks(tags);

        // 2. Create Task
        const task = {
            id: uuid(),
            type,
            priority,
            payload,
            tags,
            onProgress,
            status: STATUS.PENDING,
            timestamp: Date.now(),
        };

        // 3. Create Promise
        const promise = new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;
        });

        // Attach taskId to promise for consumers who need the ID immediately
        promise.taskId = task.id;

        // 4. Enqueue
        this.queue.push(task);
        this.queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

        console.log(`[AIManager] Task enqueued: ${task.id} (${type}) Priority: ${priority}. Queue size: ${this.queue.length}`);

        this._processQueue();

        return promise;
    }

    /**
     * Cancel tasks that match the given tags
     */
    _cancelConflictingTasks(tags) {
        if (!tags || tags.length === 0) return;

        // check active tasks
        for (const [id, active] of this.activeTasks) {
            const hasConflict = active.task.tags.some(tag => tags.includes(tag));
            if (hasConflict) {
                console.log(`[AIManager] Cancelling active task ${id} due to conflict tags: ${tags}`);
                active.controller.abort();
                // Note: The task will be cleaned up in the finally block of _processQueue
            }
        }

        // check queued tasks
        this.queue = this.queue.filter(t => {
            const hasConflict = t.tags.some(tag => tags.includes(tag));
            if (hasConflict) {
                console.log(`[AIManager] Removing queued task ${t.id} due to conflict`);
                t.reject(new Error('Cancelled by newer task'));
                return false;
            }
            return true;
        });
    }

    async _processQueue() {
        if (this.processing) return;
        if (this.activeTasks.size >= this.concurrencyLimit) return;
        if (this.queue.length === 0) return;

        this.processing = true;

        try {
            while (this.activeTasks.size < this.concurrencyLimit && this.queue.length > 0) {
                const task = this.queue.shift();
                const controller = new AbortController();

                this.activeTasks.set(task.id, { controller, task });

                // Non-blocking execution of the task
                this._runTask(task, controller);
            }
        } finally {
            this.processing = false;
        }
    }

    async _runTask(task, controller) {
        try {
            console.log(`[AIManager] Starting task ${task.id} (${task.type})`);
            task.status = STATUS.RUNNING;

            const result = await this._executeTask(task, controller.signal);

            task.status = STATUS.COMPLETED;
            this.results.set(task.id, result);
            task.resolve(result);
            console.log(`[AIManager] Task completed: ${task.id}`);

        } catch (error) {
            if (error.name === 'AbortError' || controller.signal.aborted) {
                task.status = STATUS.CANCELLED;
                console.log(`[AIManager] Task ${task.id} cancelled`);
                task.reject(new Error('Task cancelled'));
            } else {
                task.status = STATUS.FAILED;
                console.error(`[AIManager] Task ${task.id} failed:`, error);
                task.reject(error);
            }
        } finally {
            this.activeTasks.delete(task.id);
            this._processQueue(); // Check for next task
        }
    }

    async _executeTask(task, signal) {
        // Dynamic import to avoid circular dependencies if any
        // In real impl, we'd import these at top level
        const { streamChatCompletion, imageGeneration } = await import('../llm.js');
        // REMOVED: import { getActiveConfig } ... 

        // Config should be passed in payload
        const config = task.payload.config;
        if (!config) {
            throw new Error("Task execution failed: No LLM config provided in payload");
        }

        if (task.type === 'chat') {
            const { messages, model, temperature } = task.payload;
            let fullText = '';

            // Wrapped streamChatCompletion that respects AbortSignal
            await streamChatCompletion(
                messages,
                config, // Pass config explicitly
                (chunk) => {
                    if (signal.aborted) return;
                    fullText += chunk;
                    if (task.onProgress) task.onProgress(chunk);
                },
                model || config.model,
                {
                    providerId: config.id,
                    signal, // Need to pass signal to lower layer!
                    temperature
                }
            );
            return fullText;
        }

        if (task.type === 'image') {
            // Placeholder for image gen
            return null;
        }

        throw new Error(`Unknown task type: ${task.type}`);
    }
}

export const aiManager = new AIManager();
