const STORAGE_UID_KEY = 'flowstudio_user_id';

const uidInput = document.getElementById('uid');
const saveBtn = document.getElementById('save');
const clearBtn = document.getElementById('clear');
const flushBtn = document.getElementById('flush');
const queueStatus = document.getElementById('queue-status');
const toast = document.getElementById('toast');

const showToast = (text, isError = false) => {
  toast.textContent = text;
  toast.style.color = isError ? '#b91c1c' : '#0f766e';
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

const loadUid = async () => {
  const data = await chrome.storage.local.get(STORAGE_UID_KEY);
  uidInput.value = typeof data[STORAGE_UID_KEY] === 'string' ? data[STORAGE_UID_KEY] : '';
};

const loadQueueStats = async () => {
  const stats = await sendRuntimeMessage({ type: 'AIM_FLOW_QUEUE_STATS' });
  if (stats?.error) {
    queueStatus.textContent = `读取队列失败：${stats.error}`;
    return;
  }

  const count = Number(stats?.pending || 0);
  if (count <= 0) {
    queueStatus.textContent = '当前无待补发消息。';
    return;
  }

  const next = stats.nextRetryAt ? new Date(stats.nextRetryAt).toLocaleString() : '未知';
  queueStatus.textContent = `待补发 ${count} 条，下一次重试：${next}`;
};

saveBtn.addEventListener('click', async () => {
  const value = uidInput.value.trim();
  if (!value) {
    showToast('UID 不能为空', true);
    return;
  }
  await chrome.storage.local.set({ [STORAGE_UID_KEY]: value });
  showToast('UID 已保存');
});

clearBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(STORAGE_UID_KEY);
  uidInput.value = '';
  showToast('UID 已清除');
});

flushBtn.addEventListener('click', async () => {
  const stats = await sendRuntimeMessage({ type: 'AIM_FLOW_QUEUE_FLUSH' });
  if (stats?.error) {
    showToast(`补发失败：${stats.error}`, true);
    return;
  }
  showToast('已触发补发');
  await loadQueueStats();
});

(async () => {
  await loadUid();
  await loadQueueStats();
})();
