(() => {
  const ns = window.__AIMAINMAP_FLOW_EXT__;
  if (!ns) return;

  const normalizeText = (raw) => {
    if (typeof raw !== 'string') return '';
    return raw.replace(/\u00A0/g, ' ').replace(/\r/g, '').trim();
  };

  const clipTextByLimit = (text) => {
    const normalized = normalizeText(text);
    if (!normalized) {
      return { text: '', truncated: false };
    }

    if (normalized.length <= ns.MAX_SELECTION_CHARS) {
      return { text: normalized, truncated: false };
    }

    return {
      text: normalized.slice(0, ns.MAX_SELECTION_CHARS),
      truncated: true
    };
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

    const { text, truncated } = clipTextByLimit(active.value.slice(active.selectionStart, active.selectionEnd));
    if (!text) return null;

    const rect = active.getBoundingClientRect();
    return {
      text,
      truncated,
      rect: {
        top: rect.top + 8,
        left: rect.left + Math.min(Math.max(rect.width * 0.3, 40), 180),
        width: 1,
        height: 1
      }
    };
  };

  const getTextFromDomSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const { text, truncated } = clipTextByLimit(selection.toString());
    if (!text) return null;

    const range = selection.getRangeAt(0).cloneRange();
    let rect = range.getBoundingClientRect();

    if ((!rect || (rect.width === 0 && rect.height === 0)) && range.getClientRects().length > 0) {
      const clientRects = range.getClientRects();
      rect = clientRects[clientRects.length - 1];
    }

    if (!rect) return null;

    return { text, truncated, rect };
  };

  ns.selection = {
    getSelectionPayload: () => getTextFromInput() || getTextFromDomSelection()
  };
})();
