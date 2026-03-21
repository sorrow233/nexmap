const DIALOG_SCOPE_SELECTOR = '.chat-modal, [role="dialog"], [aria-modal="true"]';

function isElementNode(node) {
    return typeof Element !== 'undefined' && node instanceof Element;
}

export function isNodeInsideDialog(node) {
    if (!isElementNode(node)) return false;
    return Boolean(node.closest(DIALOG_SCOPE_SELECTOR));
}

export function isEventInsideDialog(event) {
    if (!event) return false;

    if (isNodeInsideDialog(event.target)) {
        return true;
    }

    if (typeof event.composedPath === 'function') {
        return event.composedPath().some((node) => isNodeInsideDialog(node));
    }

    return false;
}

export function isDialogActive(activeElement) {
    if (typeof document === 'undefined') return false;
    return isNodeInsideDialog(activeElement || document.activeElement);
}
