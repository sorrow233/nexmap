(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns || !ns.storage || !ns.createUi) return;

  const ui = ns.createUi();

  let currentText = '';
  let isSending = false;
  let resetTimer = null;

  const sendRuntimeMessage = (payload) => new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message || 'runtime_error' });
        return;
      }
      resolve(response || { success: false, error: 'empty_response' });
    });
  });

  const setStatusWithReset = (status) => {
    ui.setFlowStatus(status);
    if (resetTimer) clearTimeout(resetTimer);
    if (status === 'idle') return;
    resetTimer = setTimeout(() => {
      ui.setFlowStatus('idle');
    }, 2000);
  };

  const getTextFromInput = () => {
    const active = document.activeElement;
    if (!active) return null;

    const tag = active.tagName;
    const isTextInput = tag === 'TEXTAREA' || (tag === 'INPUT' && /^(?:text|search|url|tel|password)$/i.test(active.type));

    if (!isTextInput || typeof active.selectionStart !== 'number' || typeof active.selectionEnd !== 'number') {
      return null;
    }

    if (active.selectionStart === active.selectionEnd) {
      return null;
    }

    const text = active.value.slice(active.selectionStart, active.selectionEnd).trim();
    if (!text) return null;

    const rect = active.getBoundingClientRect();
    return {
      text,
      rect: {
        top: rect.top + 8,
        left: rect.left + Math.min(rect.width - 40, 120),
        width: 1,
        height: 1
      }
    };
  };

  const getSelectionData = () => {
    const inputResult = getTextFromInput();
    if (inputResult) return inputResult;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const text = selection.toString().trim();
    if (!text) return null;

    const range = selection.getRangeAt(0).cloneRange();
    let rect = range.getBoundingClientRect();

    if ((!rect || (rect.width === 0 && rect.height === 0)) && range.getClientRects().length > 0) {
      const clientRects = range.getClientRects();
      rect = clientRects[clientRects.length - 1];
    }

    if (!rect) return null;

    return { text, rect };
  };

  const tryOpenMenuFromSelection = () => {
    const selected = getSelectionData();
    if (!selected) {
      currentText = '';
      ui.hideMenu();
      return;
    }

    currentText = selected.text;
    ui.showMenuAt(selected.rect);
  };

  const ensureUid = async () => {
    const existing = await ns.storage.getFlowUid();
    if (existing) return existing;

    const uidInput = await ui.promptUid('');
    if (!uidInput) return '';

    await ns.storage.setFlowUid(uidInput);
    return uidInput;
  };

  const handleFlowClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentText || isSending) return;

    isSending = true;
    setStatusWithReset('sending');

    try {
      const uid = await ensureUid();
      if (!uid) {
        setStatusWithReset('idle');
        return;
      }

      const result = await sendRuntimeMessage({
        type: ns.MESSAGE_SEND,
        payload: {
          text: currentText,
          userId: uid
        }
      });

      if (result?.success) {
        setStatusWithReset('success');
        return;
      }

      if (result?.queued) {
        setStatusWithReset('queued');
        return;
      }

      setStatusWithReset('error');
    } finally {
      isSending = false;
    }
  };

  ui.onFlowClick(handleFlowClick);

  document.addEventListener('mouseup', () => {
    setTimeout(tryOpenMenuFromSelection, 0);
  });

  document.addEventListener('keyup', (event) => {
    if (event.key.startsWith('Arrow') || event.key === 'Shift') {
      setTimeout(tryOpenMenuFromSelection, 0);
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (ui.isWithinUi(event.target)) return;
    ui.hideMenu();
  }, true);

  window.addEventListener('scroll', () => {
    ui.hideMenu();
  }, true);

  window.addEventListener('resize', () => {
    ui.hideMenu();
  });
})();
