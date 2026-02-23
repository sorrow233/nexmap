(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns) return;

  const STATUS_TEXT = {
    idle: 'Flow',
    sending: '发送中',
    success: '已添加',
    error: '失败',
    queued: '已排队'
  };

  const STATUS_META = {
    idle: '发送到 FlowStudio 队列',
    sending: '正在提交内容…',
    success: '内容已进入 FlowStudio 队列',
    error: '发送失败，请稍后再试',
    queued: '网络波动，已自动进入重试队列'
  };

  const shorten = (text, maxLen = 26) => {
    if (!text) return '';
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  };

  const createMenu = () => {
    const menu = document.createElement('div');
    menu.id = 'aim-flow-menu';

    menu.innerHTML = `
      <span class="aim-flow-mark" aria-hidden="true">Flow</span>
      <div class="aim-flow-copy">
        <p class="aim-flow-title">发送到 FlowStudio</p>
        <p class="aim-flow-meta">${STATUS_META.idle}</p>
      </div>
      <button class="aim-flow-action" type="button" data-status="idle">${STATUS_TEXT.idle}</button>
    `;

    document.documentElement.appendChild(menu);

    return {
      menu,
      actionButton: menu.querySelector('.aim-flow-action'),
      titleNode: menu.querySelector('.aim-flow-title'),
      metaNode: menu.querySelector('.aim-flow-meta')
    };
  };

  const createUidModal = () => {
    const modal = document.createElement('div');
    modal.id = 'aim-flow-modal';

    modal.innerHTML = `
      <div class="aim-flow-modal-card" role="dialog" aria-modal="true" aria-label="绑定 FlowStudio UID">
        <p class="aim-flow-modal-title">连接 FlowStudio</p>
        <p class="aim-flow-modal-desc">输入你的 FlowStudio Firebase UID。保存后，网页划词可直接静默发送。</p>
        <input class="aim-flow-modal-input" type="text" placeholder="Firebase UID" />
        <p class="aim-flow-modal-error" aria-live="polite"></p>
        <div class="aim-flow-modal-actions">
          <button class="aim-flow-btn aim-flow-btn-cancel" type="button">取消</button>
          <button class="aim-flow-btn aim-flow-btn-confirm" type="button" disabled>确认绑定</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modal);

    const input = modal.querySelector('.aim-flow-modal-input');
    const errorNode = modal.querySelector('.aim-flow-modal-error');
    const cancelBtn = modal.querySelector('.aim-flow-btn-cancel');
    const confirmBtn = modal.querySelector('.aim-flow-btn-confirm');

    let activeResolve = null;

    const validateUid = (value) => {
      const normalized = (value || '').trim();
      if (!normalized) {
        return { ok: false, reason: '请输入 UID' };
      }
      if (/\s/.test(normalized)) {
        return { ok: false, reason: 'UID 不能包含空格' };
      }
      if (normalized.length < ns.FLOW_UID_MIN_LENGTH) {
        return { ok: false, reason: `UID 长度至少 ${ns.FLOW_UID_MIN_LENGTH} 位` };
      }
      return { ok: true, value: normalized };
    };

    const setError = (text) => {
      errorNode.textContent = text || '';
    };

    const cleanupListeners = (handlers) => {
      input.removeEventListener('input', handlers.onInput);
      input.removeEventListener('keydown', handlers.onKeydown);
      cancelBtn.removeEventListener('click', handlers.onCancel);
      confirmBtn.removeEventListener('click', handlers.onConfirm);
      modal.removeEventListener('click', handlers.onBackdrop);
    };

    const closeModal = (handlers, result) => {
      modal.style.display = 'none';
      cleanupListeners(handlers);
      const resolver = activeResolve;
      activeResolve = null;
      if (resolver) resolver(result);
    };

    const show = (initial = '') => {
      if (activeResolve) {
        return Promise.resolve('');
      }

      input.value = initial || '';
      setError('');
      modal.style.display = 'flex';

      return new Promise((resolve) => {
        activeResolve = resolve;

        const refreshValidation = () => {
          const checked = validateUid(input.value);
          confirmBtn.disabled = !checked.ok;
          setError(checked.ok ? '' : checked.reason);
        };

        const handlers = {
          onInput: () => {
            refreshValidation();
          },
          onCancel: () => {
            closeModal(handlers, '');
          },
          onConfirm: () => {
            const checked = validateUid(input.value);
            if (!checked.ok) {
              setError(checked.reason);
              return;
            }
            closeModal(handlers, checked.value);
          },
          onBackdrop: (event) => {
            if (event.target === modal) {
              closeModal(handlers, '');
            }
          },
          onKeydown: (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeModal(handlers, '');
              return;
            }
            if (event.key === 'Enter' && !confirmBtn.disabled) {
              event.preventDefault();
              handlers.onConfirm();
            }
          }
        };

        refreshValidation();
        input.addEventListener('input', handlers.onInput);
        input.addEventListener('keydown', handlers.onKeydown);
        cancelBtn.addEventListener('click', handlers.onCancel);
        confirmBtn.addEventListener('click', handlers.onConfirm);
        modal.addEventListener('click', handlers.onBackdrop);

        requestAnimationFrame(() => input.focus());
      });
    };

    return { show };
  };

  ns.createUi = () => {
    const { menu, actionButton, titleNode, metaNode } = createMenu();
    const uidModal = createUidModal();

    let idleMeta = STATUS_META.idle;

    const api = {
      onFlowClick(handler) {
        actionButton.onclick = handler;
      },
      setSelectionContext(text, truncated = false) {
        const preview = shorten((text || '').replace(/\s+/g, ' '));
        titleNode.textContent = preview ? `Flow: ${preview}` : '发送到 FlowStudio';
        idleMeta = truncated
          ? `内容超长，已自动截断到 ${ns.MAX_SELECTION_CHARS} 字`
          : STATUS_META.idle;
        if (actionButton.dataset.status === 'idle') {
          metaNode.textContent = idleMeta;
        }
      },
      setFlowStatus(status, detail = '') {
        const safeStatus = STATUS_TEXT[status] ? status : 'idle';
        actionButton.dataset.status = safeStatus;
        actionButton.textContent = STATUS_TEXT[safeStatus];

        if (safeStatus === 'idle') {
          metaNode.textContent = idleMeta;
          return;
        }

        metaNode.textContent = detail || STATUS_META[safeStatus] || STATUS_META.idle;
      },
      showMenuAt(rect) {
        menu.style.display = 'flex';

        const margin = 12;
        const anchorX = rect.left + rect.width / 2;
        const anchorY = Math.max(rect.top, menu.offsetHeight + margin + 4);

        const half = menu.offsetWidth / 2;
        const clampedX = Math.min(
          window.innerWidth - margin - half,
          Math.max(margin + half, anchorX)
        );

        menu.style.left = `${clampedX}px`;
        menu.style.top = `${anchorY}px`;
      },
      hideMenu() {
        menu.style.display = 'none';
        titleNode.textContent = '发送到 FlowStudio';
        idleMeta = STATUS_META.idle;
        api.setFlowStatus('idle');
      },
      isWithinUi(node) {
        if (!node) return false;
        const asElement = node instanceof Element ? node : null;
        return menu.contains(node) || !!(asElement && asElement.closest('#aim-flow-modal'));
      },
      promptUid(initial) {
        return uidModal.show(initial);
      }
    };

    return api;
  };
})();
