(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns || !ns.storage || !ns.createUi || !ns.selection || !ns.transport) return;

  const ui = ns.createUi();

  let currentSelection = null;
  let isSending = false;
  let resetTimer = null;
  let lastAutoSend = { fingerprint: '', at: 0 };

  const isValidUid = (uid) => {
    const normalized = (uid || '').trim();
    if (!normalized) return false;
    if (/\s/.test(normalized)) return false;
    return normalized.length >= ns.FLOW_UID_MIN_LENGTH;
  };

  const fingerprintText = (text) => {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    return `${normalized.length}:${normalized.slice(0, 260)}`;
  };

  const setStatusWithReset = (status = 'idle') => {
    ui.setFlowStatus(status);

    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    if (status === 'idle') return;

    resetTimer = setTimeout(() => {
      ui.setFlowStatus('idle');
    }, ns.STATUS_RESET_MS);
  };

  const clearSelectionButton = () => {
    currentSelection = null;
    ui.hideButton();
  };

  const ensureUid = async () => {
    const existingUid = await ns.storage.getFlowUid();
    if (isValidUid(existingUid)) {
      return existingUid.trim();
    }

    const entered = await ui.promptUid(existingUid || '');
    if (!entered) return '';

    await ns.storage.setFlowUid(entered);
    return entered;
  };

  const sendSelection = async (selection, trigger = 'button') => {
    if (!selection?.text || isSending) return;

    isSending = true;
    setStatusWithReset('sending');

    try {
      const uid = await ensureUid();
      if (!uid) {
        setStatusWithReset('idle');
        return;
      }

      const requestId = crypto.randomUUID();
      const result = await ns.transport.sendFlow({
        text: selection.text,
        userId: uid,
        requestId
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
      if (trigger === 'copy') {
        setTimeout(() => {
          if (!currentSelection) {
            ui.hideButton();
          }
        }, ns.STATUS_RESET_MS + 120);
      }
    }
  };

  const tryOpenButtonFromSelection = () => {
    const selected = ns.selection.getSelectionPayload();
    if (!selected || !selected.text) {
      clearSelectionButton();
      return;
    }

    currentSelection = selected;
    ui.showButtonAt(selected.rect);
  };

  const handleFlowClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentSelection?.text) return;
    await sendSelection(currentSelection, 'button');
  };

  const handleCopyTrigger = () => {
    setTimeout(async () => {
      const selected = ns.selection.getSelectionPayload();
      if (!selected?.text) return;

      const now = Date.now();
      const fp = fingerprintText(selected.text);
      if (fp && fp === lastAutoSend.fingerprint && now - lastAutoSend.at < 1600) {
        return;
      }

      lastAutoSend = { fingerprint: fp, at: now };
      currentSelection = selected;
      ui.showButtonAt(selected.rect);
      await sendSelection(selected, 'copy');
    }, 0);
  };

  ui.onFlowClick(handleFlowClick);

  document.addEventListener('mouseup', () => {
    setTimeout(tryOpenButtonFromSelection, 0);
  });

  document.addEventListener('keyup', (event) => {
    if (event.key.startsWith('Arrow') || event.key === 'Shift' || event.key === 'Meta') {
      setTimeout(tryOpenButtonFromSelection, 0);
    }
  });

  document.addEventListener('copy', handleCopyTrigger, true);

  document.addEventListener('mousedown', (event) => {
    if (ui.isWithinUi(event.target)) return;
    clearSelectionButton();
  }, true);

  window.addEventListener('scroll', () => {
    clearSelectionButton();
  }, true);

  window.addEventListener('resize', () => {
    clearSelectionButton();
  });
})();
