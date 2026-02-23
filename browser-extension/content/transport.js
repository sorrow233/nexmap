(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns) return;

  const sendRuntimeMessage = (payload) => new Promise((resolve) => {
    const runtime = globalThis.chrome?.runtime;
    if (!runtime?.sendMessage) {
      resolve({ success: false, error: 'runtime_unavailable' });
      return;
    }

    try {
      runtime.sendMessage(payload, (response) => {
        const lastError = globalThis.chrome?.runtime?.lastError;
        if (lastError) {
          resolve({ success: false, error: lastError.message || 'runtime_error' });
          return;
        }
        resolve(response || { success: false, error: 'empty_response' });
      });
    } catch (error) {
      resolve({ success: false, error: error?.message || String(error) });
    }
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
