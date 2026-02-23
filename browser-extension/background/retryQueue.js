import {
  MAX_CONCURRENCY,
  MAX_DEAD_LETTERS,
  MAX_DRAIN_BATCHES,
  MAX_QUEUE_ATTEMPTS,
  MAX_QUEUE_SIZE,
  QUEUE_BACKOFF_BASE_MS
} from './constants.js';
import { sendToFlow } from './network.js';
import { loadDeadLetters, loadQueue, saveDeadLetters, saveQueue } from './queueStore.js';
import { calcBackoffMs, toErrorMessage } from './utils.js';

let draining = false;

const buildRetryItem = (payload, reason, attempt = 0) => ({
  id: payload.id || crypto.randomUUID(),
  requestId: payload.requestId || crypto.randomUUID(),
  text: payload.text,
  userId: payload.userId || '',
  createdAt: payload.createdAt || Date.now(),
  attempt,
  lastError: reason,
  nextRetryAt: Date.now() + calcBackoffMs(attempt, QUEUE_BACKOFF_BASE_MS)
});

const appendDeadLetters = async (items) => {
  if (!items.length) return;

  const current = await loadDeadLetters();
  const merged = [...current, ...items].slice(-MAX_DEAD_LETTERS);
  await saveDeadLetters(merged);
};

export const enqueueForRetry = async (payload, reason = 'send_failed') => {
  const queue = await loadQueue();

  if (queue.length >= MAX_QUEUE_SIZE) {
    const overflow = queue.shift();
    if (overflow) {
      await appendDeadLetters([{
        ...overflow,
        droppedAt: Date.now(),
        dropReason: 'queue_overflow'
      }]);
    }
  }

  const item = buildRetryItem(payload, reason, payload.attempt || 0);
  queue.push(item);
  await saveQueue(queue);
  return item;
};

const processOne = async (item) => {
  try {
    await sendToFlow(item);
    return { id: item.id, action: 'sent' };
  } catch (error) {
    const nextAttempt = item.attempt + 1;
    const safeError = toErrorMessage(error);

    if (nextAttempt >= MAX_QUEUE_ATTEMPTS) {
      return { id: item.id, action: 'drop', error: safeError };
    }

    return {
      id: item.id,
      action: 'retry',
      patch: {
        attempt: nextAttempt,
        lastError: safeError,
        nextRetryAt: Date.now() + calcBackoffMs(nextAttempt, QUEUE_BACKOFF_BASE_MS)
      }
    };
  }
};

const runSingleBatch = async () => {
  const now = Date.now();
  const queue = await loadQueue();

  if (!queue.length) {
    return { processed: 0, sent: 0, retried: 0, dropped: 0 };
  }

  const ready = queue
    .filter((item) => (item.nextRetryAt || 0) <= now)
    .sort((a, b) => {
      const aTime = a.nextRetryAt || 0;
      const bTime = b.nextRetryAt || 0;
      if (aTime !== bTime) return aTime - bTime;
      return (a.createdAt || 0) - (b.createdAt || 0);
    })
    .slice(0, MAX_CONCURRENCY);

  if (!ready.length) {
    return { processed: 0, sent: 0, retried: 0, dropped: 0 };
  }

  const outcomes = await Promise.all(ready.map(processOne));
  const nextMap = new Map(queue.map((item) => [item.id, item]));
  const deadLetters = [];

  let sent = 0;
  let retried = 0;
  let dropped = 0;

  for (const outcome of outcomes) {
    const currentItem = nextMap.get(outcome.id);
    if (!currentItem) continue;

    if (outcome.action === 'sent') {
      nextMap.delete(outcome.id);
      sent += 1;
      continue;
    }

    if (outcome.action === 'drop') {
      nextMap.delete(outcome.id);
      dropped += 1;
      deadLetters.push({
        ...currentItem,
        droppedAt: Date.now(),
        dropReason: 'max_attempts',
        lastError: outcome.error || currentItem.lastError || 'send_failed'
      });
      continue;
    }

    if (outcome.action === 'retry') {
      nextMap.set(outcome.id, {
        ...currentItem,
        ...outcome.patch
      });
      retried += 1;
    }
  }

  await saveQueue(Array.from(nextMap.values()));
  await appendDeadLetters(deadLetters);

  return {
    processed: outcomes.length,
    sent,
    retried,
    dropped
  };
};

export const drainRetryQueue = async ({ drainAll = false } = {}) => {
  if (draining) {
    return {
      processed: 0,
      sent: 0,
      retried: 0,
      dropped: 0,
      skipped: 'already_draining',
      queue: await getQueueStats()
    };
  }

  draining = true;

  try {
    const maxRounds = drainAll ? MAX_DRAIN_BATCHES : 1;

    let processed = 0;
    let sent = 0;
    let retried = 0;
    let dropped = 0;

    for (let i = 0; i < maxRounds; i += 1) {
      const batch = await runSingleBatch();
      if (batch.processed === 0) break;

      processed += batch.processed;
      sent += batch.sent;
      retried += batch.retried;
      dropped += batch.dropped;
    }

    return {
      processed,
      sent,
      retried,
      dropped,
      queue: await getQueueStats()
    };
  } finally {
    draining = false;
  }
};

export const getQueueStats = async () => {
  const now = Date.now();
  const [queue, deadLetters] = await Promise.all([loadQueue(), loadDeadLetters()]);

  const pending = queue.length;
  const dueCount = queue.filter((item) => (item.nextRetryAt || 0) <= now).length;
  const nextRetryAt = queue.reduce((min, item) => {
    const value = item?.nextRetryAt || Number.POSITIVE_INFINITY;
    return Math.min(min, value);
  }, Number.POSITIVE_INFINITY);

  const latestDeadLetter = deadLetters.length ? deadLetters[deadLetters.length - 1] : null;

  return {
    pending,
    dueCount,
    nextRetryAt: Number.isFinite(nextRetryAt) ? nextRetryAt : null,
    deadLetterCount: deadLetters.length,
    latestDeadLetter: latestDeadLetter
      ? {
          droppedAt: latestDeadLetter.droppedAt || null,
          lastError: latestDeadLetter.lastError || 'unknown_error',
          dropReason: latestDeadLetter.dropReason || 'unknown_reason'
        }
      : null
  };
};
