const STORAGE_UID_KEY = 'flowstudio_user_id';
const MESSAGE_TYPES = {
  QUEUE_STATS: 'AIM_FLOW_QUEUE_STATS',
  QUEUE_FLUSH: 'AIM_FLOW_QUEUE_FLUSH'
};
const UID_MIN_LENGTH = 16;

const uidInput = document.getElementById('uid');
const uidHelp = document.getElementById('uid-help');
const saveBtn = document.getElementById('save');
const clearBtn = document.getElementById('clear');
const refreshBtn = document.getElementById('refresh');
const flushOnceBtn = document.getElementById('flush-once');
const flushAllBtn = document.getElementById('flush-all');

const statPending = document.getElementById('stat-pending');
const statDue = document.getElementById('stat-due');
const statDead = document.getElementById('stat-dead');
const queueStatus = document.getElementById('queue-status');
const lastEvent = document.getElementById('last-event');
const queueError = document.getElementById('queue-error');
const toast = document.getElementById('toast');

const showToast = (text, isError = false) => {
  toast.textContent = text;
  toast.style.color = isError ? '#b91c1c' : '#0f766e';
};

const showQueueError = (text = '') => {
  queueError.textContent = text;
};

const showLastEvent = (eventPayload) => {
  if (!eventPayload) {
    lastEvent.textContent = '';
    return;
  }

  const at = eventPayload.at ? new Date(eventPayload.at).toLocaleTimeString() : '';
  const message = eventPayload.message || eventPayload.type || '未知事件';
  lastEvent.textContent = at ? `最近操作：${message}（${at}）` : `最近操作：${message}`;
};

const validateUid = (value) => {
  const normalized = (value || '').trim();
  if (!normalized) {
    return { ok: false, reason: 'UID 不能为空' };
  }
  if (/\s/.test(normalized)) {
    return { ok: false, reason: 'UID 不能包含空格' };
  }
  if (normalized.length < UID_MIN_LENGTH) {
    return { ok: false, reason: `UID 长度至少 ${UID_MIN_LENGTH} 位` };
  }
  return { ok: true, value: normalized };
};

const sendRuntimeMessage = (payload) => new Promise((resolve) => {
  chrome.runtime.sendMessage(payload, (response) => {
    if (chrome.runtime.lastError) {
      resolve({ error: chrome.runtime.lastError.message || 'runtime_error' });
      return;
    }
    resolve(response || {});
  });
});

const setQueueStats = (stats) => {
  const pending = Number(stats?.pending || 0);
  const due = Number(stats?.dueCount || 0);
  const dead = Number(stats?.deadLetterCount || 0);

  statPending.textContent = String(pending);
  statDue.textContent = String(due);
  statDead.textContent = String(dead);

  if (pending <= 0) {
    queueStatus.textContent = '当前无待补发消息。';
  } else {
    const next = stats.nextRetryAt ? new Date(stats.nextRetryAt).toLocaleString() : '未知';
    queueStatus.textContent = `待补发 ${pending} 条，下一次重试：${next}`;
  }

  const latestDeadLetter = stats?.latestDeadLetter;
  if (latestDeadLetter?.lastError) {
    const droppedAt = latestDeadLetter.droppedAt ? new Date(latestDeadLetter.droppedAt).toLocaleString() : '未知时间';
    showQueueError(`最近死信：${latestDeadLetter.lastError}（${droppedAt}）`);
  } else {
    showQueueError('');
  }

  showLastEvent(stats?.lastEvent || null);
};

const loadUid = async () => {
  const data = await chrome.storage.local.get(STORAGE_UID_KEY);
  uidInput.value = typeof data[STORAGE_UID_KEY] === 'string' ? data[STORAGE_UID_KEY] : '';
};

const loadQueueStats = async () => {
  const stats = await sendRuntimeMessage({ type: MESSAGE_TYPES.QUEUE_STATS });
  if (stats?.error) {
    queueStatus.textContent = `读取队列失败：${stats.error}`;
    showQueueError('');
    showLastEvent(null);
    return;
  }

  setQueueStats(stats);
};

const runQueueFlush = async (drainAll) => {
  const result = await sendRuntimeMessage({
    type: MESSAGE_TYPES.QUEUE_FLUSH,
    payload: { drainAll }
  });

  if (result?.error) {
    showToast(`补发失败：${result.error}`, true);
    return;
  }

  const processed = Number(result?.processed || 0);
  const sent = Number(result?.sent || 0);
  const dropped = Number(result?.dropped || 0);

  showToast(`补发完成：处理 ${processed} 条，成功 ${sent} 条，死信 ${dropped} 条`);

  if (result?.queue) {
    setQueueStats(result.queue);
  } else {
    await loadQueueStats();
  }
};

uidInput.addEventListener('input', () => {
  const checked = validateUid(uidInput.value);
  uidHelp.textContent = checked.ok ? 'UID 格式通过，保存后即可使用。' : checked.reason;
  uidHelp.style.color = checked.ok ? '#0f766e' : '#b91c1c';
});

saveBtn.addEventListener('click', async () => {
  const checked = validateUid(uidInput.value);
  if (!checked.ok) {
    showToast(checked.reason, true);
    uidHelp.textContent = checked.reason;
    uidHelp.style.color = '#b91c1c';
    return;
  }

  await chrome.storage.local.set({ [STORAGE_UID_KEY]: checked.value });
  showToast('UID 已保存');
});

clearBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(STORAGE_UID_KEY);
  uidInput.value = '';
  uidHelp.textContent = 'UID 已清空。';
  uidHelp.style.color = '#64748b';
  showToast('UID 已清除');
});

refreshBtn.addEventListener('click', async () => {
  await loadQueueStats();
  showToast('队列状态已刷新');
});

flushOnceBtn.addEventListener('click', async () => {
  await runQueueFlush(false);
});

flushAllBtn.addEventListener('click', async () => {
  await runQueueFlush(true);
});

(async () => {
  await loadUid();
  await loadQueueStats();
})();
