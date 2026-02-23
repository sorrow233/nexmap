(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns || !ns.storage || !ns.createUi || !ns.selection || !ns.transport) return;

  const ui = ns.createUi();

  let currentSelection = null;
  let isSending = false;
  let resetTimer = null;

  const isValidUid = (uid) => {
    const normalized = (uid || '').trim();
    if (!normalized) return false;
    if (/\s/.test(normalized)) return false;
    return normalized.length >= ns.FLOW_UID_MIN_LENGTH;
  };

  const toHumanError = (errorCode) => {
    if (!errorCode) return '发送失败，请稍后重试';
    if (errorCode === 'runtime_error') return '插件后台未就绪，请刷新页面后重试';
    if (errorCode === 'request_timeout') return '请求超时，已自动重试';
    if (errorCode === 'empty_text') return '选中文本为空';
    if (errorCode.startsWith('http_')) {
      return `接口返回 ${errorCode.replace('http_', '')}`;
    }
    return `发送失败：${errorCode}`;
  };

  const setStatusWithReset = (status, detail = '') => {
    ui.setFlowStatus(status, detail);
    if (resetTimer) clearTimeout(resetTimer);
    if (status === 'idle') return;

    resetTimer = setTimeout(() => {
      ui.setFlowStatus('idle');
    }, ns.STATUS_RESET_MS);
  };

  const clearSelectionMenu = () => {
    currentSelection = null;
    ui.hideMenu();
  };

  const tryOpenMenuFromSelection = () => {
    const selected = ns.selection.getSelectionPayload();
    if (!selected || !selected.text) {
      clearSelectionMenu();
      return;
    }

    currentSelection = selected;
    ui.setSelectionContext(selected.text, selected.truncated);
    ui.showMenuAt(selected.rect);
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

  const handleFlowClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentSelection?.text || isSending) return;

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
        text: currentSelection.text,
        userId: uid,
        requestId
      });

      if (result?.success) {
        setStatusWithReset('success', '已同步到 FlowStudio 队列');
        return;
      }

      if (result?.queued) {
        const pending = Number(result?.queue?.pending || 0);
        const queuedDetail = pending > 0
          ? `网络波动，已排队（当前待补发 ${pending} 条）`
          : '网络波动，已排队等待补发';
        setStatusWithReset('queued', queuedDetail);
        return;
      }

      setStatusWithReset('error', toHumanError(result?.error));
    } finally {
      isSending = false;
    }
  };

  ui.onFlowClick(handleFlowClick);

  document.addEventListener('mouseup', () => {
    setTimeout(tryOpenMenuFromSelection, 0);
  });

  document.addEventListener('keyup', (event) => {
    if (event.key.startsWith('Arrow') || event.key === 'Shift' || event.key === 'Meta') {
      setTimeout(tryOpenMenuFromSelection, 0);
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (ui.isWithinUi(event.target)) return;
    clearSelectionMenu();
  }, true);

  window.addEventListener('scroll', () => {
    clearSelectionMenu();
  }, true);

  window.addEventListener('resize', () => {
    clearSelectionMenu();
  });
})();
