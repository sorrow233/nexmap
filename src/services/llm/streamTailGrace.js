export const DEFAULT_STREAM_TAIL_GRACE_MS = 1200;

const createTimeoutResult = () => ({ __tailGraceTimeout: true });

export async function settleStreamReader(reader, options = {}) {
    if (!reader || typeof reader.read !== 'function') {
        return {
            closed: true,
            timedOut: false
        };
    }

    const graceMs = Number.isFinite(Number(options.graceMs))
        ? Math.max(0, Number(options.graceMs))
        : DEFAULT_STREAM_TAIL_GRACE_MS;

    const timeoutResult = createTimeoutResult();

    let readResult;
    try {
        readResult = await Promise.race([
            reader.read(),
            new Promise((resolve) => {
                setTimeout(() => resolve(timeoutResult), graceMs);
            })
        ]);
    } catch {
        return {
            closed: true,
            timedOut: false
        };
    }

    if (readResult === timeoutResult || readResult?.done !== true) {
        if (typeof reader.cancel === 'function') {
            await reader.cancel().catch(() => { });
        }

        return {
            closed: false,
            timedOut: readResult === timeoutResult
        };
    }

    return {
        closed: true,
        timedOut: false
    };
}
