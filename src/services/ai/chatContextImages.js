export const PRIOR_CONTEXT_IMAGE_PLACEHOLDER = '[Earlier image omitted from context]';

const isImageContentPart = (part = {}) => (
    part?.type === 'image' || part?.type === 'image_url'
);

const summarizeOmittedImageParts = (count) => ({
    type: 'text',
    text: count > 1
        ? `\n\n${PRIOR_CONTEXT_IMAGE_PLACEHOLDER} x${count}`
        : `\n\n${PRIOR_CONTEXT_IMAGE_PLACEHOLDER}`
});

const removeImagePartsFromPriorContext = (message = {}) => {
    if (!Array.isArray(message?.content)) {
        return message;
    }

    let omittedImageCount = 0;
    const nextContent = [];

    message.content.forEach((part) => {
        if (isImageContentPart(part)) {
            omittedImageCount += 1;
            return;
        }
        nextContent.push(part);
    });

    if (omittedImageCount === 0) {
        return message;
    }

    nextContent.push(summarizeOmittedImageParts(omittedImageCount));
    return {
        ...message,
        content: nextContent
    };
};

/**
 * Only images attached to the current user turn belong in an LLM request.
 * A previous image-bearing turn must not become "current" merely because the
 * newest user turn is text-only.
 */
export const keepOnlyCurrentUserMessageImages = (messages = []) => {
    const safeMessages = Array.isArray(messages) ? messages : [];
    let latestUserMessageIndex = -1;

    for (let index = safeMessages.length - 1; index >= 0; index -= 1) {
        if (safeMessages[index]?.role === 'user') {
            latestUserMessageIndex = index;
            break;
        }
    }

    return safeMessages.map((message, index) => (
        index === latestUserMessageIndex
            ? message
            : removeImagePartsFromPriorContext(message)
    ));
};
