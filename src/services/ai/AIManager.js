
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
        this.concurrencyLimit = 2;    // Max concurrent AI requests
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
     * @returns {PromiseString} taskId
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
            resolve: null,
            reject: null,
        };

        // 3. Return Promise that resolves with result
        const promise = new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;
        });

        // Store promise on task so we can return it if needed, 
        // but mainly we return taskId so UI can subscribe if they want, 
        // or just await the task result if I change the signature.
        // For now, let's keep it simple: return the Task Object or ID?
        // The pattern proposed: "UI subscribes to changes".
        // But for integration ease, returning a Promise that resolves to the result is often easier for simple cases.
        // Let's attach the promise to the task and push to queue.

        task.promise = promise;

        this.queue.push(task);
        this.queue.sort((a, b) => b.priority - a.priority); // High priority first

        console.log(`[AIManager] Task enqueued: ${task.id} (${type}) Priority: ${priority}`);

        this._processQueue();

        return task; // Return task object containing .id and .promise
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
                this.activeTasks.delete(id);
                // The task promise should be rejected/resolved with cancel status in the execution block
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
        if (this.activeTasks.size >= this.concurrencyLimit) return;
        if (this.queue.length === 0) return;

        const task = this.queue.shift();
        const controller = new AbortController();

        this.activeTasks.set(task.id, { controller, task });

        try {
            console.log(`[AIManager] Starting task ${task.id}`);
            task.status = STATUS.RUNNING;

            // Execute the actual AI Logic based on type
            const result = await this._executeTask(task, controller.signal);

            task.status = STATUS.COMPLETED;
            this.results.set(task.id, result);
            task.resolve(result);

        } catch (error) {
            if (error.name === 'AbortError') {
                task.status = STATUS.CANCELLED;
                console.log(`[AIManager] Task ${task.id} cancelled`);
            } else {
                task.status = STATUS.FAILED;
                console.error(`[AIManager] Task ${task.id} failed`, error);
            }
            task.reject(error);
        } finally {
            this.activeTasks.delete(task.id);
            this._processQueue(); // Loop
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
