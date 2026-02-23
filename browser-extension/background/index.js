import {
  ALARM_NAME,
  DIRECT_BACKOFF_BASE_MS,
  MAX_DIRECT_RETRIES,
  MESSAGE_TYPES
} from './constants.js';
import { sendToFlow } from './network.js';
import { drainRetryQueue, enqueueForRetry, getQueueStats } from './retryQueue.js';
import { calcBackoffMs, sleep, toErrorMessage } from './utils.js';

const sendWithRetry = async (payload) => {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_DIRECT_RETRIES; attempt += 1) {
    try {
      return await sendToFlow(payload);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_DIRECT_RETRIES - 1) {
        await sleep(calcBackoffMs(attempt, DIRECT_BACKOFF_BASE_MS));
      }
    }
  }

  throw lastError || new Error('send_failed');
};

const normalizeSendPayload = (payload) => {
  const text = payload?.text?.trim?.() || '';
  const userId = payload?.userId?.trim?.() || '';
  const requestId = payload?.requestId?.trim?.() || crypto.randomUUID();
  return { text, userId, requestId };
};

const handleSend = async (payload) => {
  const normalized = normalizeSendPayload(payload);

  if (!normalized.text) {
    return { success: false, error: 'empty_text' };
  }
  if (!normalized.userId) {
    return { success: false, error: 'empty_user_id' };
  }

  try {
    const result = await sendWithRetry(normalized);
    return { success: true, ...result };
  } catch (error) {
    await enqueueForRetry(normalized, toErrorMessage(error));
    const queue = await getQueueStats();

    return {
      success: false,
      queued: true,
      error: toErrorMessage(error),
      queue
    };
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = message?.type;

  if (type === MESSAGE_TYPES.SEND) {
    handleSend(message.payload)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({ success: false, error: toErrorMessage(error) });
      });
    return true;
  }

  if (type === MESSAGE_TYPES.QUEUE_STATS) {
    getQueueStats()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({ pending: -1, error: toErrorMessage(error) });
      });
    return true;
  }

  if (type === MESSAGE_TYPES.QUEUE_FLUSH) {
    const drainAll = !!message?.payload?.drainAll;
    drainRetryQueue({ drainAll })
      .then(sendResponse)
      .catch((error) => {
        sendResponse({ pending: -1, error: toErrorMessage(error) });
      });
    return true;
  }

  return false;
});

const ensureAlarm = () => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
};

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  drainRetryQueue({ drainAll: true });
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  drainRetryQueue({ drainAll: true });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  drainRetryQueue({ drainAll: true });
});
