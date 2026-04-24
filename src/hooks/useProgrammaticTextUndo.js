import { useCallback, useRef } from 'react';

const MAX_UNDO_ENTRIES = 16;
const MAX_UNDO_TOTAL_CHARS = 120000;

const getTextSelection = (textarea, text = '') => {
    const fallbackPosition = String(text || '').length;
    if (!textarea || typeof textarea.selectionStart !== 'number') {
        return {
            selectionStart: fallbackPosition,
            selectionEnd: fallbackPosition
        };
    }

    return {
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd
    };
};

const trimUndoStack = (stack, totalCharsRef) => {
    while (
        stack.length > MAX_UNDO_ENTRIES ||
        totalCharsRef.current > MAX_UNDO_TOTAL_CHARS
    ) {
        const removed = stack.shift();
        totalCharsRef.current -= removed?.text?.length || 0;
    }
};

export function useProgrammaticTextUndo({
    setValue,
    textareaRef,
    disabled = false,
    maxHeight = 120
} = {}) {
    const undoStackRef = useRef([]);
    const totalCharsRef = useRef(0);

    const rememberTextUndoSnapshot = useCallback((text = '', selection = null) => {
        if (disabled || typeof setValue !== 'function') return;

        const normalizedText = String(text || '');
        if (!normalizedText) return;

        const stack = undoStackRef.current;
        const latest = stack[stack.length - 1];
        if (latest?.text === normalizedText) return;

        const snapshot = {
            text: normalizedText,
            ...(selection || getTextSelection(textareaRef?.current, normalizedText))
        };

        stack.push(snapshot);
        totalCharsRef.current += normalizedText.length;
        trimUndoStack(stack, totalCharsRef);
    }, [disabled, setValue, textareaRef]);

    const restoreLastTextUndoSnapshot = useCallback((event) => {
        if (disabled || typeof setValue !== 'function') return false;

        const snapshot = undoStackRef.current.pop();
        if (!snapshot) return false;

        totalCharsRef.current = Math.max(0, totalCharsRef.current - snapshot.text.length);
        event?.preventDefault?.();
        setValue(snapshot.text);

        requestAnimationFrame(() => {
            const textarea = textareaRef?.current;
            if (!textarea) return;

            textarea.focus();
            if (typeof textarea.setSelectionRange === 'function') {
                const fallbackPosition = snapshot.text.length;
                textarea.setSelectionRange(
                    Number.isFinite(snapshot.selectionStart) ? snapshot.selectionStart : fallbackPosition,
                    Number.isFinite(snapshot.selectionEnd) ? snapshot.selectionEnd : fallbackPosition
                );
            }
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        });

        return true;
    }, [disabled, maxHeight, setValue, textareaRef]);

    const handleTextUndoKeyDown = useCallback((event) => {
        if (disabled || !event) return false;
        const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
        const isUndoShortcut = (
            key === 'z' &&
            (event.metaKey || event.ctrlKey) &&
            !event.altKey &&
            !event.shiftKey
        );

        if (!isUndoShortcut) return false;
        return restoreLastTextUndoSnapshot(event);
    }, [disabled, restoreLastTextUndoSnapshot]);

    return {
        rememberTextUndoSnapshot,
        handleTextUndoKeyDown
    };
}
