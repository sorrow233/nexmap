(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;

  const getFromStorage = async (key) => {
    const data = await chrome.storage.local.get(key);
    return data[key];
  };

  const setToStorage = async (key, value) => {
    await chrome.storage.local.set({ [key]: value });
  };

  const removeFromStorage = async (key) => {
    await chrome.storage.local.remove(key);
  };

  ns.storage = {
    getFlowUid: async () => {
      const value = await getFromStorage(ns.STORAGE_UID_KEY);
      return typeof value === 'string' ? value.trim() : '';
    },
    setFlowUid: async (uid) => {
      const normalized = (uid || '').trim();
      if (!normalized) {
        await removeFromStorage(ns.STORAGE_UID_KEY);
        return;
      }
      await setToStorage(ns.STORAGE_UID_KEY, normalized);
    }
  };
})();
