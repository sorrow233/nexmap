import {
  MAX_CONCURRENCY,
  MAX_QUEUE_ATTEMPTS,
  MAX_QUEUE_SIZE,
  QUEUE_BACKOFF_BASE_MS
} from './constants.js';
import { sendToFlow } from './network.js';
import { loadQueue, saveQueue } from './queueStore.js';
import { calcBackoffMs, toErrorMessage } from './utils.js';

let draining = false;

export const enqueueForRetry = async (payload, reason = 'send_failed') => {
  const queue = await loadQueue();

  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
  }

  const item = {
    id: crypto.randomUUID(),
    text: payload.text,
    userId: payload.userId || '',
    createdAt: Date.now(),
    attempt: 0,
    lastError: reason,
    nextRetryAt: Date.now() + calcBackoffMs(0, QUEUE_BACKOFF_BASE_MS)
  };

  queue.push(item);
  await saveQueue(queue);
  return item;
};

const processOne = async (item) => {
  try {
    await sendToFlow(item);
    return { id: item.id, remove: true };
  } catch (error) {
    const nextAttempt = item.attempt + 1;
    if (nextAttempt >= MAX_QUEUE_ATTEMPTS) {
      return { id: item.id, remove: true };
    }

    return {
      id: item.id,
      remove: false,
      patch: {
        attempt: nextAttempt,
        lastError: toErrorMessage(error),
        nextRetryAt: Date.now() + calcBackoffMs(nextAttempt, QUEUE_BACKOFF_BASE_MS)
      }
    };
  }
};

export const drainRetryQueue = async () => {
  if (draining) return;
  draining = true;

  try {
    const now = Date.now();
    const queue = await loadQueue();

    if (queue.length === 0) return;

    const ready = queue.filter((item) => (item.nextRetryAt || 0) <= now);
    if (ready.length === 0) return;

    const picked = ready.slice(0, MAX_CONCURRENCY);
    const outcomes = await Promise.all(picked.map(processOne));

    const nextMap = new Map(queue.map((item) => [item.id, item]));

    for (const outcome of outcomes) {
      if (!nextMap.has(outcome.id)) continue;
      if (outcome.remove) {
        nextMap.delete(outcome.id);
      } else {
        nextMap.set(outcome.id, {
          ...nextMap.get(outcome.id),
          ...outcome.patch
        });
      }
    }

    await saveQueue(Array.from(nextMap.values()));
  } finally {
    draining = false;
  }
};

export const getQueueStats = async () => {
  const queue = await loadQueue();
  const pending = queue.length;
  const nextRetryAt = queue.reduce((min, item) => {
    const value = item?.nextRetryAt || Number.POSITIVE_INFINITY;
    return Math.min(min, value);
  }, Number.POSITIVE_INFINITY);

  return {
    pending,
    nextRetryAt: Number.isFinite(nextRetryAt) ? nextRetryAt : null
  };
};
