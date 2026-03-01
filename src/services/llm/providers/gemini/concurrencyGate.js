const gateState = new Map();

function createAbortError() {
    if (typeof DOMException === 'function') {
        return new DOMException('The operation was aborted.', 'AbortError');
    }

    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return error;
}

function buildGateKey({ providerId = 'default', baseUrl = '', model = '', stream = false }) {
    return `${providerId}::${baseUrl}::${model}::${stream ? 'stream' : 'chat'}`;
}

function resolveConcurrencyLimit(model = '', stream = false) {
    const lower = String(model || '').toLowerCase();

    if (lower.includes('gemini-3.1-pro-preview')) {
        return stream ? 1 : 2;
    }

    if (lower.includes('gemini-3-pro-preview') || lower.includes('gemini-2.5-pro')) {
        return stream ? 2 : 3;
    }

    if (lower.includes('flash')) {
        return stream ? 4 : 6;
    }

    return stream ? 2 : 4;
}

function getGateEntry(key) {
    let entry = gateState.get(key);
    if (!entry) {
        entry = { active: 0, queue: [] };
        gateState.set(key, entry);
    }
    return entry;
}

export async function acquireGeminiConcurrencySlot({ providerId = 'default', baseUrl = '', model = '', stream = false, signal } = {}) {
    const limit = resolveConcurrencyLimit(model, stream);
    if (!Number.isFinite(limit) || limit <= 0) {
        return () => { };
    }

    const key = buildGateKey({ providerId, baseUrl, model, stream });
    const entry = getGateEntry(key);

    if (signal?.aborted) {
        throw createAbortError();
    }

    if (entry.active >= limit) {
        await new Promise((resolve, reject) => {
            const queuedEntry = {
                grant: () => {
                    cleanup();
                    entry.active += 1;
                    resolve();
                }
            };

            const cleanup = () => {
                if (signal && abortHandler) {
                    signal.removeEventListener('abort', abortHandler);
                }
            };

            let abortHandler = null;
            if (signal) {
                abortHandler = () => {
                    const queueIndex = entry.queue.indexOf(queuedEntry);
                    if (queueIndex !== -1) {
                        entry.queue.splice(queueIndex, 1);
                    }
                    cleanup();
                    if (entry.active === 0 && entry.queue.length === 0) {
                        gateState.delete(key);
                    }
                    reject(createAbortError());
                };
                signal.addEventListener('abort', abortHandler, { once: true });
            }

            entry.queue.push(queuedEntry);
        });
    } else {
        entry.active += 1;
    }
    let released = false;

    return () => {
        if (released) return;
        released = true;

        entry.active = Math.max(0, entry.active - 1);
        const next = entry.queue.shift();
        if (next) {
            next.grant();
        }

        if (entry.active === 0 && entry.queue.length === 0) {
            gateState.delete(key);
        }
    };
}
