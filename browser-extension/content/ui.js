(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns) return;

  const createMiniButton = () => {
    const button = document.createElement('button');
    button.id = 'aim-flow-mini';
    button.type = 'button';
    button.dataset.status = 'idle';
    button.innerHTML = '<span class="aim-flow-icon" aria-hidden="true">✦</span><span class="aim-flow-text">Flow</span>';
    document.documentElement.appendChild(button);
    return button;
  };

  const createUidModal = () => {
    const modal = document.createElement('div');
    modal.id = 'aim-flow-modal';

    modal.innerHTML = `
      <div class="aim-flow-modal-card" role="dialog" aria-modal="true" aria-label="绑定 FlowStudio UID">
        <p class="aim-flow-modal-title">绑定 FlowStudio UID</p>
        <input class="aim-flow-modal-input" type="text" placeholder="Firebase UID" />
        <p class="aim-flow-modal-error" aria-live="polite"></p>
        <div class="aim-flow-modal-actions">
          <button class="aim-flow-btn aim-flow-btn-cancel" type="button">取消</button>
          <button class="aim-flow-btn aim-flow-btn-confirm" type="button" disabled>确认</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modal);

    const input = modal.querySelector('.aim-flow-modal-input');
    const errorNode = modal.querySelector('.aim-flow-modal-error');
    const cancelBtn = modal.querySelector('.aim-flow-btn-cancel');
    const confirmBtn = modal.querySelector('.aim-flow-btn-confirm');

    let activeResolve = null;

    const validate = (raw) => {
      const value = (raw || '').trim();
      if (!value) return { ok: false, reason: '请输入 UID' };
      if (/\s/.test(value)) return { ok: false, reason: 'UID 不能包含空格' };
      if (value.length < ns.FLOW_UID_MIN_LENGTH) {
        return { ok: false, reason: `UID 至少 ${ns.FLOW_UID_MIN_LENGTH} 位` };
      }
      return { ok: true, value };
    };

    const setError = (text = '') => {
      errorNode.textContent = text;
    };

    const show = (initial = '') => {
      if (activeResolve) return Promise.resolve('');

      input.value = initial || '';
      setError('');
      modal.style.display = 'flex';

      return new Promise((resolve) => {
        activeResolve = resolve;

        const cleanup = () => {
          modal.style.display = 'none';
          input.removeEventListener('input', onInput);
          input.removeEventListener('keydown', onKeydown);
          cancelBtn.removeEventListener('click', onCancel);
          confirmBtn.removeEventListener('click', onConfirm);
          modal.removeEventListener('click', onBackdrop);
          activeResolve = null;
        };

        const settle = (result) => {
          cleanup();
          resolve(result);
        };

        const refresh = () => {
          const checked = validate(input.value);
          confirmBtn.disabled = !checked.ok;
          setError(checked.ok ? '' : checked.reason);
        };

        const onInput = () => refresh();
        const onCancel = () => settle('');
        const onConfirm = () => {
          const checked = validate(input.value);
          if (!checked.ok) {
            setError(checked.reason);
            return;
          }
          settle(checked.value);
        };
        const onBackdrop = (event) => {
          if (event.target === modal) settle('');
        };
        const onKeydown = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            settle('');
            return;
          }
          if (event.key === 'Enter' && !confirmBtn.disabled) {
            event.preventDefault();
            onConfirm();
          }
        };

        refresh();
        input.addEventListener('input', onInput);
        input.addEventListener('keydown', onKeydown);
        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
        modal.addEventListener('click', onBackdrop);
        requestAnimationFrame(() => input.focus());
      });
    };

    return { show };
  };

  ns.createUi = () => {
    const miniButton = createMiniButton();
    const uidModal = createUidModal();

    const api = {
      onFlowClick(handler) {
        miniButton.onclick = handler;
      },
      setFlowStatus(status = 'idle') {
        miniButton.dataset.status = status;
      },
      showButtonAt(rect) {
        miniButton.style.display = 'inline-flex';

        const margin = 10;
        const top = Math.max(rect.top, miniButton.offsetHeight + margin + 4);
        const anchorX = rect.left + rect.width / 2;
        const half = miniButton.offsetWidth / 2;
        const clampedX = Math.min(
          window.innerWidth - margin - half,
          Math.max(margin + half, anchorX)
        );

        miniButton.style.top = `${top}px`;
        miniButton.style.left = `${clampedX}px`;
      },
      hideButton() {
        miniButton.style.display = 'none';
        api.setFlowStatus('idle');
      },
      isWithinUi(node) {
        if (!node) return false;
        const asElement = node instanceof Element ? node : null;
        return miniButton.contains(node) || !!(asElement && asElement.closest('#aim-flow-modal'));
      },
      promptUid(initial) {
        return uidModal.show(initial);
      }
    };

    return api;
  };
})();
