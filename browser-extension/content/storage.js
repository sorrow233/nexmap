(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns) return;

  const runtime = globalThis.chrome?.runtime;
  const storageArea = globalThis.chrome?.storage?.local;

  const toErrorText = (error) => {
    if (!error) return 'unknown_error';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return String(error);
  };

  const sendRuntimeMessage = (payload) => new Promise((resolve) => {
    if (!runtime?.sendMessage) {
      resolve({ ok: false, error: 'runtime_unavailable' });
      return;
    }

    try {
      runtime.sendMessage(payload, (response) => {
        const lastError = globalThis.chrome?.runtime?.lastError;
        if (lastError) {
          resolve({ ok: false, error: lastError.message || 'runtime_error' });
          return;
        }
        resolve(response || { ok: false, error: 'empty_response' });
      });
    } catch (error) {
      resolve({ ok: false, error: toErrorText(error) });
    }
  });

  const createChromeStorageDriver = () => {
    if (!storageArea?.get || !storageArea?.set || !storageArea?.remove) {
      return null;
    }

    const get = (key) => new Promise((resolve, reject) => {
      try {
        storageArea.get(key, (result) => {
          const lastError = globalThis.chrome?.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message || 'storage_get_failed'));
            return;
          }
          resolve(result?.[key]);
        });
      } catch (error) {
        reject(error);
      }
    });

    const set = (key, value) => new Promise((resolve, reject) => {
      try {
        storageArea.set({ [key]: value }, () => {
          const lastError = globalThis.chrome?.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message || 'storage_set_failed'));
            return;
          }
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });

    const remove = (key) => new Promise((resolve, reject) => {
      try {
        storageArea.remove(key, () => {
          const lastError = globalThis.chrome?.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message || 'storage_remove_failed'));
            return;
          }
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });

    return { get, set, remove };
  };

  const createRuntimeProxyDriver = () => {
    if (!runtime?.sendMessage) return null;

    const call = async (op, key, value) => {
      const result = await sendRuntimeMessage({
        type: ns.MESSAGE_STORAGE_PROXY,
        payload: { op, key, value }
      });

      if (!result?.ok) {
        throw new Error(result?.error || 'storage_proxy_failed');
      }

      return result?.value;
    };

    return {
      get: (key) => call('get', key),
      set: (key, value) => call('set', key, value),
      remove: (key) => call('remove', key)
    };
  };

  const createLocalFallbackDriver = () => {
    const keyOf = (key) => `${ns.STORAGE_FALLBACK_PREFIX}${key}`;

    return {
      get: async (key) => {
        try {
          return globalThis.localStorage?.getItem?.(keyOf(key)) || '';
        } catch {
          return '';
        }
      },
      set: async (key, value) => {
        try {
          globalThis.localStorage?.setItem?.(keyOf(key), value);
        } catch {
          // ignore local fallback write failures
        }
      },
      remove: async (key) => {
        try {
          globalThis.localStorage?.removeItem?.(keyOf(key));
        } catch {
          // ignore local fallback remove failures
        }
      }
    };
  };

  const storageDriver =
    createChromeStorageDriver() ||
    createRuntimeProxyDriver() ||
    createLocalFallbackDriver();

  ns.storage = {
    getFlowUid: async () => {
      const value = await storageDriver.get(ns.STORAGE_UID_KEY);
      return typeof value === 'string' ? value.trim() : '';
    },
    setFlowUid: async (uid) => {
      const normalized = (uid || '').trim();
      if (!normalized) {
        await storageDriver.remove(ns.STORAGE_UID_KEY);
        return;
      }
      await storageDriver.set(ns.STORAGE_UID_KEY, normalized);
    }
  };
})();
