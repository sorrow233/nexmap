export const getMessageSelectionKey = (message, messageIndex) => (
    message?.id
        ? `id:${message.id}`
        : `index:${messageIndex}`
);

export const buildBatchDeleteMessageConfirmText = (count, template) => {
    const safeCount = Math.max(0, Number(count) || 0);
    const fallback = `确认删除选中的 ${safeCount} 条消息吗？\n\n删除后它们会立即从当前会话移除，后续上下文也不会再包含这些消息。`;

    if (typeof template !== 'string' || !template.trim()) {
        return fallback;
    }

    return template.replace('{count}', String(safeCount));
};

export const removeMessagesFromCardData = (currentData, selectedMessageKeys) => {
    if (!currentData || !Array.isArray(currentData.messages)) {
        return currentData;
    }

    const selectedKeys = selectedMessageKeys instanceof Set
        ? selectedMessageKeys
        : new Set(selectedMessageKeys || []);
    if (selectedKeys.size === 0) {
        return currentData;
    }

    const nextMessages = currentData.messages.filter((message, index) => (
        !selectedKeys.has(getMessageSelectionKey(message, index))
    ));

    if (nextMessages.length === currentData.messages.length) {
        return currentData;
    }

    return {
        ...currentData,
        messages: nextMessages
    };
};
