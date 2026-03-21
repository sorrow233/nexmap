const countMessageTextChars = (messages = []) => messages.reduce((total, message) => {
    const content = message?.content;
    if (typeof content === 'string') {
        return total + content.length;
    }

    if (Array.isArray(content)) {
        return total + content.reduce((messageTotal, part) => (
            part?.type === 'text' && typeof part.text === 'string'
                ? messageTotal + part.text.length
                : messageTotal
        ), 0);
    }

    return total;
}, 0);

const shouldLogAIDebug = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        return true;
    }

    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage?.getItem('nexmap_debug_ai_queue') === '1';
    } catch {
        return false;
    }
};

const countMessageImages = (messages = []) => messages.reduce((total, message) => {
    const content = message?.content;
    if (!Array.isArray(content)) return total;
    return total + content.filter((part) => part?.type === 'image').length;
}, 0);

const buildTaskSummary = (task) => {
    if (!task) return {};

    if (task.type === 'chat') {
        const messages = Array.isArray(task.payload?.messages) ? task.payload.messages : [];
        const config = task.payload?.config || {};
        return {
            model: task.payload?.model || config.model || 'unknown',
            providerId: config.providerId || config.id || 'unknown',
            messageCount: messages.length,
            textChars: countMessageTextChars(messages),
            imageCount: countMessageImages(messages)
        };
    }

    if (task.type === 'image') {
        const prompt = task.payload?.prompt || '';
        const config = task.payload?.config || {};
        return {
            model: config.model || 'unknown',
            providerId: config.providerId || config.id || 'unknown',
            promptChars: typeof prompt === 'string' ? prompt.length : 0
        };
    }

    return {};
};

export const logAITaskQueued = ({ task, pendingCount, runningCount }) => {
    if (!shouldLogAIDebug()) return;
    const summary = buildTaskSummary(task);
    console.log('[AI Queue] queued', {
        taskId: task.id,
        type: task.type,
        cardId: task.cardId || null,
        priority: task.priority,
        pendingCount,
        runningCount,
        tags: task.tags,
        ...summary
    });
};

export const logAITaskStarted = ({ task, pendingCount, runningCount, queuedForMs }) => {
    if (!shouldLogAIDebug()) return;
    const summary = buildTaskSummary(task);
    console.log('[AI Queue] started', {
        taskId: task.id,
        type: task.type,
        cardId: task.cardId || null,
        queuedForMs,
        pendingCount,
        runningCount,
        tags: task.tags,
        ...summary
    });
};

export const logAITaskFinished = ({ task, outcome, durationMs, pendingCount, runningCount, error = null }) => {
    if (!shouldLogAIDebug()) return;
    const summary = buildTaskSummary(task);
    console.log('[AI Queue] finished', {
        taskId: task.id,
        type: task.type,
        cardId: task.cardId || null,
        outcome,
        durationMs,
        pendingCount,
        runningCount,
        error: error ? (error.message || String(error)) : null,
        ...summary
    });
};

export const logAIDispatch = (payload = {}) => {
    if (!shouldLogAIDebug()) return;
    console.log('[AI] Dispatching task', payload);
};
