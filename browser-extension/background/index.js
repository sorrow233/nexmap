import {
  ALARM_NAME,
  CONTEXT_MENU_ID,
  DIRECT_BACKOFF_BASE_MS,
  FLOW_UID_MIN_LENGTH,
  MAX_DIRECT_RETRIES,
  MAX_SELECTION_CHARS,
  MESSAGE_TYPES,
  STORAGE_FLOW_UID_KEY,
  STORAGE_LAST_EVENT_KEY
} from './constants.js';
import { sendToFlow } from './network.js';
import { drainRetryQueue, enqueueForRetry, getQueueStats } from './retryQueue.js';
import { calcBackoffMs, sleep, toErrorMessage } from './utils.js';

const setBadge = async (type, pending = 0) => {
  if (type === 'clear') {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  if (type === 'success') {
    await chrome.action.setBadgeText({ text: 'OK' });
    await chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 2200);
    return;
  }

  if (type === 'queued') {
    const text = pending > 0 ? `Q${Math.min(pending, 99)}` : 'Q';
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: '#ca8a04' });
    return;
  }

  if (type === 'uid_missing') {
    await chrome.action.setBadgeText({ text: 'UID' });
    await chrome.action.setBadgeBackgroundColor({ color: '#0369a1' });
    return;
  }

  await chrome.action.setBadgeText({ text: 'ERR' });
  await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
};

const saveLastEvent = async (payload) => {
  await chrome.storage.local.set({
    [STORAGE_LAST_EVENT_KEY]: {
      ...payload,
      at: Date.now()
    }
  });
};

const validateUid = (uid) => {
  const normalized = (uid || '').trim();
  if (!normalized) return { ok: false, reason: 'empty_user_id' };
  if (/\s/.test(normalized)) return { ok: false, reason: 'uid_contains_space' };
  if (normalized.length < FLOW_UID_MIN_LENGTH) {
    return { ok: false, reason: 'uid_too_short' };
  }
  return { ok: true, value: normalized };
};

const normalizeSelectionText = (value) => {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\u00A0/g, ' ').replace(/\r/g, '').trim();
  if (!normalized) return '';
  if (normalized.length <= MAX_SELECTION_CHARS) return normalized;
  return normalized.slice(0, MAX_SELECTION_CHARS);
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

const loadBoundUid = async () => {
  const data = await chrome.storage.local.get(STORAGE_FLOW_UID_KEY);
  const rawUid = typeof data[STORAGE_FLOW_UID_KEY] === 'string' ? data[STORAGE_FLOW_UID_KEY] : '';
  const checked = validateUid(rawUid);
  return checked.ok ? checked.value : '';
};

const handleContextMenuSend = async (selectionText, sourceTab) => {
  const text = normalizeSelectionText(selectionText);
  if (!text) {
    await setBadge('error');
    await saveLastEvent({
      type: 'error',
      reason: 'empty_selection',
      message: '未获取到选中文本'
    });
    return;
  }

  const uid = await loadBoundUid();
  if (!uid) {
    await setBadge('uid_missing');
    await saveLastEvent({
      type: 'uid_missing',
      message: '未绑定 UID，已打开设置页',
      preview: text.slice(0, 80),
      pageUrl: sourceTab?.url || ''
    });
    await chrome.runtime.openOptionsPage();
    return;
  }

  const requestId = crypto.randomUUID();
  const result = await handleSend({ text, userId: uid, requestId });

  if (result?.success) {
    await setBadge('success');
    await saveLastEvent({
      type: 'success',
      message: '右键发送成功',
      requestId,
      preview: text.slice(0, 80),
      pageUrl: sourceTab?.url || ''
    });
    return;
  }

  if (result?.queued) {
    const pending = Number(result?.queue?.pending || 0);
    await setBadge('queued', pending);
    await saveLastEvent({
      type: 'queued',
      message: '发送失败，已进入重试队列',
      requestId,
      queuePending: pending,
      error: result?.error || 'send_failed',
      preview: text.slice(0, 80),
      pageUrl: sourceTab?.url || ''
    });
    return;
  }

  await setBadge('error');
  await saveLastEvent({
    type: 'error',
    message: '发送失败',
    requestId,
    error: result?.error || 'send_failed',
    preview: text.slice(0, 80),
    pageUrl: sourceTab?.url || ''
  });
};

const ensureContextMenu = async () => {
  await new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });

  await new Promise((resolve) => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: '发送到 FlowStudio',
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    }, () => resolve());
  });
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  handleContextMenuSend(info.selectionText || '', tab).catch(async (error) => {
    await setBadge('error');
    await saveLastEvent({
      type: 'error',
      message: '右键发送异常',
      error: toErrorMessage(error)
    });
  });
});

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
    Promise.all([
      getQueueStats(),
      chrome.storage.local.get(STORAGE_LAST_EVENT_KEY)
    ])
      .then(([queue, extra]) => {
        sendResponse({
          ...queue,
          lastEvent: extra?.[STORAGE_LAST_EVENT_KEY] || null
        });
      })
      .catch((error) => {
        sendResponse({ pending: -1, error: toErrorMessage(error) });
      });
    return true;
  }

  if (type === MESSAGE_TYPES.QUEUE_FLUSH) {
    const drainAll = !!message?.payload?.drainAll;
    drainRetryQueue({ drainAll })
      .then(async (result) => {
        if (result?.queue?.pending > 0) {
          await setBadge('queued', result.queue.pending);
        } else {
          await setBadge('clear');
        }
        sendResponse(result);
      })
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

chrome.runtime.onInstalled.addListener(async () => {
  ensureAlarm();
  await ensureContextMenu();
  await drainRetryQueue({ drainAll: true });
});

chrome.runtime.onStartup.addListener(async () => {
  ensureAlarm();
  await ensureContextMenu();
  await drainRetryQueue({ drainAll: true });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  drainRetryQueue({ drainAll: true }).then(async (result) => {
    const pending = Number(result?.queue?.pending || 0);
    if (pending > 0) {
      await setBadge('queued', pending);
    } else {
      await setBadge('clear');
    }
  }).catch(() => {});
});
