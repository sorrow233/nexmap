import { uuid } from '../../utils/uuid.js';
import { getSystemPrompt } from './promptUtils.js';

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
        this.concurrencyLimit = Infinity; // UNLIMITED: No artificial restriction
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
        // 1. Deduplication: SKIP for 'chat' type
        // Chat messages should NEVER be deduplicated - each message is a unique continuation
        // Only deduplicate for non-chat types (e.g., image generation)
        if (type !== 'chat') {
            const tagsKey = tags.sort().join('|');
            const identicalTask = [...this.activeTasks.values(), ...this.queue].find(item => {
                const t = item.task || item;
                if (t.type !== type) return false;
                const existingTagsKey = (t.tags || []).sort().join('|');
                return existingTagsKey === tagsKey;
            });

            if (identicalTask) {
                console.log(`[AIManager] Deduplicated task request (Tags: ${tags})`);
                const t = identicalTask.task || identicalTask;
                if (t.promise) {
                    return t.promise;
                }
                return Promise.resolve(null);
            }
        }

        // 2. Conflict Handling (Replace Obsolete)
        // For chat tasks, we want to ensure only the LATEST request for a specific card is running.
        // We cancel both queued and ACTIVE tasks that match the tags.
        if (type === 'chat' && tags.length > 0) {
            this.cancelByTags(tags);
        } else {
            this._cancelConflictingQueuedTasks(tags);
        }

        // 3. Create Task
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

        // 4. Create Promise
        const promise = new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;
        });

        // Attach promise and ID to task/promise for access
        task.promise = promise;
        promise.taskId = task.id;

        this.queue.push(task);
        this.queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);

        console.log(`[AIManager] Task enqueued: ${task.id} (${type}) Priority: ${priority}. Queue size: ${this.queue.length}`);

        this._processQueue();

        return promise;
    }

    /**
     * Cancel ONLY QUEUED tasks that match the tags (Strategy: Replace Obsolete)
     * Active tasks are allowed to finish.
     */
    _cancelConflictingQueuedTasks(tags) {
        if (!tags || tags.length === 0) return;

        this.queue = this.queue.filter(t => {
            const hasConflict = t.tags.some(tag => tags.includes(tag));
            if (hasConflict) {
                console.log(`[AIManager] Replacing queued task ${t.id} with newer request (Tags: ${tags})`);
                t.reject(new Error('Cancelled by newer task'));
                return false;
            }
            return true;
        });
    }

    /**
     * Cancel a specific task by ID
     * @param {string} taskId - The task ID to cancel
     */
    cancelTask(taskId) {
        // Cancel queued task
        const queuedIndex = this.queue.findIndex(t => t.id === taskId);
        if (queuedIndex !== -1) {
            const task = this.queue[queuedIndex];
            this.queue.splice(queuedIndex, 1);
            task.reject(new Error('Cancelled by user'));
            console.log(`[AIManager] Cancelled queued task: ${taskId}`);
            return true;
        }

        // Cancel active task
        const activeEntry = this.activeTasks.get(taskId);
        if (activeEntry) {
            activeEntry.controller.abort();
            console.log(`[AIManager] Aborted active task: ${taskId}`);
            return true;
        }

        return false;
    }

    /**
     * Cancel all tasks matching the given tags (both queued and active)
     * @param {string[]} tags - Tags to match
     */
    cancelByTags(tags) {
        if (!tags || tags.length === 0) return;

        // Cancel queued tasks
        this.queue = this.queue.filter(t => {
            const hasMatch = t.tags.some(tag => tags.includes(tag));
            if (hasMatch) {
                t.reject(new Error('Cancelled by user'));
                console.log(`[AIManager] Cancelled queued task by tags: ${t.id}`);
                return false;
            }
            return true;
        });

        // Cancel active tasks
        for (const [taskId, entry] of this.activeTasks) {
            const hasMatch = entry.task.tags.some(tag => tags.includes(tag));
            if (hasMatch) {
                entry.controller.abort();
                console.log(`[AIManager] Aborted active task by tags: ${taskId}`);
            }
        }
    }

    /**
     * Cancel all active and queued tasks
     */
    cancelAll() {
        // Cancel all queued tasks
        this.queue.forEach(t => t.reject(new Error('Cancelled by user')));
        this.queue = [];

        // Abort all active tasks
        for (const [taskId, entry] of this.activeTasks) {
            entry.controller.abort();
            console.log(`[AIManager] Aborted all - task: ${taskId}`);
        }
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

            // Original: Inject time awareness and search mandate into ALL chat requests (REMOVED)
            const timeSystemMsg = getSystemPrompt();
            const enhancedMessages = [timeSystemMsg, ...messages];

            // Wrapped streamChatCompletion that respects AbortSignal
            await streamChatCompletion(
                enhancedMessages,
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
                    temperature,
                    ...task.payload.options // Pass other options
                }
            );
            return fullText;
        }

        if (task.type === 'image') {
            const { prompt } = task.payload;

            // Check if we need to pass a signal? 
            // imageGeneration signature: (prompt, config, model, options)
            // options can take a signal if the underlying provider supports it.

            const result = await imageGeneration(
                prompt,
                config,
                config.model || 'dall-e-3', // Default or from config
                { signal }
            );
            return result;
        }

        throw new Error(`Unknown task type: ${task.type}`);
    }
}

export const aiManager = new AIManager();
