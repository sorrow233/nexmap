import { uuid } from '../../utils/uuid.js';
import { getSystemPrompt } from './promptUtils.js';
import { streamChatCompletion, imageGeneration } from '../llm.js';
import { userStatsService } from '../stats/userStatsService.js';
import { resolveActiveInstructionsForCurrentBoard } from '../customInstructionsService.js';

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

const MAX_CONCURRENT_CARDS = 8;

class AIManager {
    constructor() {
        if (AIManager.instance) {
            return AIManager.instance;
        }

        this.activeTasks = new Map(); // taskId -> { controller, task }
        this.pendingTasks = [];       // FIFO by priority/timestamp (re-sorted on enqueue)
        this.runningCardIds = new Set();
        this.maxConcurrentCards = MAX_CONCURRENT_CARDS;
        this.results = new Map();     // taskId -> result

        AIManager.instance = this;
    }

    _getTagsKey(tags = []) {
        return [...tags].sort().join('|');
    }

    _getCardIdFromTags(tags = []) {
        const cardTag = tags.find(tag => typeof tag === 'string' && tag.startsWith('card:'));
        if (!cardTag) return null;
        return cardTag.slice('card:'.length) || null;
    }

    _findIdenticalTask(type, tagsKey) {
        const activeMatch = [...this.activeTasks.values()].find(({ task }) => (
            task.type === type && task.tagsKey === tagsKey
        ));
        if (activeMatch?.task) return activeMatch.task;

        return this.pendingTasks.find(task => task.type === type && task.tagsKey === tagsKey) || null;
    }

    _sortPendingTasks() {
        this.pendingTasks.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.timestamp - b.timestamp;
        });
    }

    _canRunTask(task) {
        if (!task.cardId) return true;
        if (this.runningCardIds.has(task.cardId)) return false;
        return this.runningCardIds.size < this.maxConcurrentCards;
    }

    _pickNextRunnableTask() {
        for (let i = 0; i < this.pendingTasks.length; i++) {
            const task = this.pendingTasks[i];
            if (this._canRunTask(task)) {
                this.pendingTasks.splice(i, 1);
                return task;
            }
        }
        return null;
    }

    _drainQueue() {
        while (true) {
            const task = this._pickNextRunnableTask();
            if (!task) break;

            const controller = new AbortController();
            this.activeTasks.set(task.id, { controller, task });
            if (task.cardId) {
                this.runningCardIds.add(task.cardId);
            }
            this._runTask(task, controller);
        }
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
        const normalizedTags = Array.isArray(tags) ? [...tags] : [];
        const tagsKey = this._getTagsKey(normalizedTags);
        if (type !== 'chat') {
            const identicalTask = this._findIdenticalTask(type, tagsKey);

            if (identicalTask) {
                if (identicalTask.promise) return identicalTask.promise;
                return Promise.resolve(null);
            }
        }

        // 2. Create Task
        const task = {
            id: uuid(),
            type,
            priority,
            payload,
            tags: normalizedTags,
            tagsKey,
            cardId: this._getCardIdFromTags(normalizedTags),
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

        // 4. Enqueue then schedule with global card-level concurrency
        this.pendingTasks.push(task);
        this._sortPendingTasks();
        this._drainQueue();

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

        // Cancel queued task
        const pendingIndex = this.pendingTasks.findIndex(task => task.id === taskId);
        if (pendingIndex !== -1) {
            const [task] = this.pendingTasks.splice(pendingIndex, 1);
            task.status = STATUS.CANCELLED;
            task.reject(new Error('Task cancelled'));
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
        const tagsSet = new Set(tags);

        // Cancel active tasks
        for (const [taskId, entry] of this.activeTasks) {
            const hasMatch = entry.task.tags.some(tag => tagsSet.has(tag));
            if (hasMatch) {
                entry.controller.abort();
            }
        }

        // Cancel queued tasks
        const survivors = [];
        for (const task of this.pendingTasks) {
            const hasMatch = task.tags.some(tag => tagsSet.has(tag));
            if (hasMatch) {
                task.status = STATUS.CANCELLED;
                task.reject(new Error('Task cancelled'));
            } else {
                survivors.push(task);
            }
        }
        this.pendingTasks = survivors;
    }

    /**
     * Cancel all active tasks
     */
    cancelAll() {
        // Abort all active tasks
        for (const [taskId, entry] of this.activeTasks) {
            entry.controller.abort();
        }

        // Reject all queued tasks
        for (const task of this.pendingTasks) {
            task.status = STATUS.CANCELLED;
            task.reject(new Error('Task cancelled'));
        }
        this.pendingTasks = [];
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
            if (task.cardId) {
                this.runningCardIds.delete(task.cardId);
            }
            this._drainQueue();
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

            // Resolve active instructions: global + current-board enabled optional instructions
            const activeInstructions = resolveActiveInstructionsForCurrentBoard();

            // Inject time awareness and custom instructions into ALL chat requests
            const timeSystemMsg = getSystemPrompt(activeInstructions);
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
