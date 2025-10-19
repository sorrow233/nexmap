import { uuid } from '../../utils/uuid.js';
import { getSystemPrompt } from './promptUtils.js';
import { streamChatCompletion, imageGeneration } from '../llm.js';
import { userStatsService } from '../stats/userStatsService.js';

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

        this.activeTasks = new Map(); // taskId -> { controller, task }
        this.results = new Map();     // taskId -> result

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
            const identicalTask = [...this.activeTasks.values()].find(item => {
                const t = item.task || item;
                if (t.type !== type) return false;
                const existingTagsKey = (t.tags || []).sort().join('|');
                const newTagsKey = tags.sort().join('|');
                return existingTagsKey === newTagsKey;
            });

            if (identicalTask) {
                const t = identicalTask.task || identicalTask;
                if (t.promise) {
                    return t.promise;
                }
                return Promise.resolve(null);
            }
        }

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

        // Attach promise and ID to task/promise for access
        task.promise = promise;
        promise.taskId = task.id;

        // 4. Run Immediately (No Queue)
        const controller = new AbortController();
        this.activeTasks.set(task.id, { controller, task });
        this._runTask(task, controller);

        return promise;
    }

    /**
     * Cancel a specific task by ID
     * @param {string} taskId - The task ID to cancel
     */
    cancelTask(taskId) {
        // Cancel active task
        const activeEntry = this.activeTasks.get(taskId);
        if (activeEntry) {
            activeEntry.controller.abort();
            return true;
        }
        return false;
    }

    /**
     * Cancel all tasks matching the given tags (active)
     * @param {string[]} tags - Tags to match
     */
    cancelByTags(tags) {
        if (!tags || tags.length === 0) return;

        // Cancel active tasks
        for (const [taskId, entry] of this.activeTasks) {
            const hasMatch = entry.task.tags.some(tag => tags.includes(tag));
            if (hasMatch) {
                entry.controller.abort();
            }
        }
    }

    /**
     * Cancel all active tasks
     */
    cancelAll() {
        // Abort all active tasks
        for (const [taskId, entry] of this.activeTasks) {
            entry.controller.abort();
        }
    }

    async _runTask(task, controller) {
        try {
            task.status = STATUS.RUNNING;

            const result = await this._executeTask(task, controller.signal);

            task.status = STATUS.COMPLETED;
            this.results.set(task.id, result);
            task.resolve(result);

        } catch (error) {
            if (error.name === 'AbortError' || controller.signal.aborted) {
                task.status = STATUS.CANCELLED;
                task.reject(new Error('Task cancelled'));
            } else {
                task.status = STATUS.FAILED;
                console.error(`[AIManager] Task ${task.id} failed:`, error);
                task.reject(error);
            }
        } finally {
            this.activeTasks.delete(task.id);
        }
    }

    async _executeTask(task, signal) {
        // Static imports used instead of dynamic to avoid production chunk load errors
        // REMOVED: import { getActiveConfig } ... 

        // Config should be passed in payload
        const config = task.payload.config;
        if (!config) {
            throw new Error("Task execution failed: No LLM config provided in payload");
        }

        if (task.type === 'chat') {
            const { messages, model, temperature } = task.payload;
            let fullText = '';

            // Get user's custom instructions from localStorage
            const customInstructions = localStorage.getItem('mixboard_custom_instructions') || '';

            // Inject time awareness and custom instructions into ALL chat requests
            const timeSystemMsg = getSystemPrompt(customInstructions);
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

            // Track usage stats (characters generated)
            if (fullText && fullText.length > 0) {
                userStatsService.incrementCharCount(fullText.length);
            }

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
