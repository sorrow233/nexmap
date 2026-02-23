(() => {
  const STATUS_TEXT = {
    idle: 'Flow',
    sending: '发送中',
    success: '已添加',
    error: '失败',
    queued: '已排队'
  };

  const createMenu = () => {
    const menu = document.createElement('div');
    menu.id = 'aim-flow-menu';

    const flowButton = document.createElement('button');
    flowButton.type = 'button';
    flowButton.textContent = STATUS_TEXT.idle;
    flowButton.dataset.status = 'idle';

    menu.appendChild(flowButton);
    document.documentElement.appendChild(menu);

    return { menu, flowButton };
  };

  const createUidModal = () => {
    const modal = document.createElement('div');
    modal.id = 'aim-flow-modal';

    modal.innerHTML = `
      <div class="aim-flow-modal-card" role="dialog" aria-modal="true" aria-label="绑定 FlowStudio UID">
        <p class="aim-flow-modal-title">连接 FlowStudio</p>
        <p class="aim-flow-modal-desc">请输入你的 FlowStudio Firebase UID，绑定后将静默发送。</p>
        <input class="aim-flow-modal-input" type="text" placeholder="Firebase UID" />
        <div class="aim-flow-modal-actions">
          <button class="aim-flow-btn aim-flow-btn-cancel" type="button">取消</button>
          <button class="aim-flow-btn aim-flow-btn-confirm" type="button" disabled>确认</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(modal);

    const input = modal.querySelector('.aim-flow-modal-input');
    const cancelBtn = modal.querySelector('.aim-flow-btn-cancel');
    const confirmBtn = modal.querySelector('.aim-flow-btn-confirm');

    const show = (initial = '') => new Promise((resolve) => {
      input.value = initial || '';
      confirmBtn.disabled = !input.value.trim();
      modal.style.display = 'flex';
      input.focus();

      const cleanup = () => {
        modal.style.display = 'none';
        input.removeEventListener('input', handleInput);
        input.removeEventListener('keydown', handleKeydown);
        cancelBtn.removeEventListener('click', handleCancel);
        confirmBtn.removeEventListener('click', handleConfirm);
        modal.removeEventListener('click', handleBackdrop);
      };

      const handleInput = () => {
        confirmBtn.disabled = !input.value.trim();
      };

      const handleCancel = () => {
        cleanup();
        resolve('');
      };

      const handleConfirm = () => {
        const value = input.value.trim();
        if (!value) return;
        cleanup();
        resolve(value);
      };

      const handleBackdrop = (event) => {
        if (event.target === modal) {
          handleCancel();
        }
      };

      const handleKeydown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          handleCancel();
          return;
        }
        if (event.key === 'Enter' && !confirmBtn.disabled) {
          event.preventDefault();
          handleConfirm();
        }
      };

      input.addEventListener('input', handleInput);
      input.addEventListener('keydown', handleKeydown);
      cancelBtn.addEventListener('click', handleCancel);
      confirmBtn.addEventListener('click', handleConfirm);
      modal.addEventListener('click', handleBackdrop);
    });

    return { show };
  };

  window.__AIMAINMAP_FLOW_EXT__.createUi = () => {
    const { menu, flowButton } = createMenu();
    const uidModal = createUidModal();

    const api = {
      onFlowClick(handler) {
        flowButton.onclick = handler;
      },
      setFlowStatus(status) {
        flowButton.dataset.status = status;
        flowButton.textContent = STATUS_TEXT[status] || STATUS_TEXT.idle;
      },
      showMenuAt(rect) {
        const top = Math.max(10, rect.top - 46);
        const left = Math.max(10, rect.left + rect.width / 2 - menu.offsetWidth / 2);
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
        menu.style.display = 'flex';
      },
      hideMenu() {
        menu.style.display = 'none';
        api.setFlowStatus('idle');
      },
      isWithinUi(node) {
        return menu.contains(node) || (node && node.closest && node.closest('#aim-flow-modal'));
      },
      promptUid(initial) {
        return uidModal.show(initial);
      }
    };

    return api;
  };
})();
