(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns) return;

  const sendRuntimeMessage = (payload) => new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message || 'runtime_error' });
        return;
      }
      resolve(response || { success: false, error: 'empty_response' });
    });
  });

  ns.transport = {
    sendFlow: ({ text, userId, requestId }) => sendRuntimeMessage({
      type: ns.MESSAGE_SEND,
      payload: { text, userId, requestId }
    }),
    getQueueStats: () => sendRuntimeMessage({ type: ns.MESSAGE_QUEUE_STATS }),
    flushQueue: (drainAll = false) => sendRuntimeMessage({
      type: ns.MESSAGE_QUEUE_FLUSH,
      payload: { drainAll }
    })
  };
})();
