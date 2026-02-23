import {
  ALARM_NAME,
  DIRECT_BACKOFF_BASE_MS,
  MAX_DIRECT_RETRIES
} from './constants.js';
import { sendToFlow } from './network.js';
import { drainRetryQueue, enqueueForRetry, getQueueStats } from './retryQueue.js';
import { calcBackoffMs, sleep, toErrorMessage } from './utils.js';

const MESSAGE_TYPES = {
  SEND: 'AIM_FLOW_SEND',
  QUEUE_STATS: 'AIM_FLOW_QUEUE_STATS',
  QUEUE_FLUSH: 'AIM_FLOW_QUEUE_FLUSH'
};

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

const handleSend = async (payload) => {
  const text = payload?.text?.trim?.() || '';
  const userId = payload?.userId?.trim?.() || '';

  if (!text) {
    return { success: false, error: 'empty_text' };
  }

  try {
    const result = await sendWithRetry({ text, userId });
    return { success: true, ...result };
  } catch (error) {
    await enqueueForRetry({ text, userId }, toErrorMessage(error));
    return {
      success: false,
      queued: true,
      error: toErrorMessage(error)
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
    drainRetryQueue()
      .then(getQueueStats)
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
  drainRetryQueue();
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  drainRetryQueue();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  drainRetryQueue();
});
