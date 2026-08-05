import { useEffect } from 'react';

const VIEWPORT_LOCK_CLASS = 'ios-app-viewport-lock';
const KEYBOARD_ACTIVE_CLASS = 'ios-keyboard-active';
const NON_TEXT_INPUT_TYPES = new Set([
    'button',
    'checkbox',
    'color',
    'file',
    'hidden',
    'image',
    'radio',
    'range',
    'reset',
    'submit'
]);

const isTextEntryElement = (element) => (
    element instanceof HTMLElement && (
        (element.tagName === 'INPUT' && !NON_TEXT_INPUT_TYPES.has(element.type)) ||
        element.tagName === 'TEXTAREA' ||
        element.isContentEditable
    )
);

export function useMobileViewportLock(enabled) {
    useEffect(() => {
        if (!enabled || typeof document === 'undefined') return undefined;

        const root = document.documentElement;
        const body = document.body;
        let focusOutTimer = null;

        const setKeyboardActive = (active) => {
            root.classList.toggle(KEYBOARD_ACTIVE_CLASS, active);
            body.classList.toggle(KEYBOARD_ACTIVE_CLASS, active);
        };

        const resetDocumentOffset = () => {
            window.requestAnimationFrame(() => {
                window.scrollTo(0, 0);
            });
        };

        const handleFocusIn = (event) => {
            if (!isTextEntryElement(event.target)) return;

            if (focusOutTimer !== null) {
                window.clearTimeout(focusOutTimer);
                focusOutTimer = null;
            }

            setKeyboardActive(true);
            resetDocumentOffset();
        };

        const handleFocusOut = () => {
            if (focusOutTimer !== null) {
                window.clearTimeout(focusOutTimer);
            }

            focusOutTimer = window.setTimeout(() => {
                focusOutTimer = null;
                const stillEditing = isTextEntryElement(document.activeElement);
                setKeyboardActive(stillEditing);
                if (!stillEditing) resetDocumentOffset();
            }, 80);
        };

        root.classList.add(VIEWPORT_LOCK_CLASS);
        body.classList.add(VIEWPORT_LOCK_CLASS);
        setKeyboardActive(isTextEntryElement(document.activeElement));
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);

        return () => {
            if (focusOutTimer !== null) {
                window.clearTimeout(focusOutTimer);
            }
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
            root.classList.remove(VIEWPORT_LOCK_CLASS, KEYBOARD_ACTIVE_CLASS);
            body.classList.remove(VIEWPORT_LOCK_CLASS, KEYBOARD_ACTIVE_CLASS);
        };
    }, [enabled]);
}
