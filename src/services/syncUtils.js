/**
 * Removes undefined values from an object recursively.
 * Used before saving to Firebase which doesn't support undefined.
 */
export const removeUndefined = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined).filter(item => item !== undefined);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = removeUndefined(value);
            }
            return acc;
        }, {});
    }
    return obj;
};

/**
 * Reconciles cloud cards with local cards using soft delete (deletedAt) for precise sync.
 * 
 * Strategy: 
 * - Cards with deletedAt are soft-deleted, not removed from the array
 * - We never guess deletion intent - only trust explicit deletedAt timestamps
 * - "Keep both" approach: cards from either source are preserved unless explicitly deleted
 * 
 * @param {Array} cloudCards - Cards from the cloud snapshot
 * @param {Array} localCards - Cards from local storage
 * @param {number} localSyncVersion - Local syncVersion (logical clock), 0 if not available
 * @param {number} cloudSyncVersion - Cloud syncVersion (logical clock), 0 if not available
 * @param {number} localUpdatedAt - Timestamp of the last local update (fallback)
 * @param {number} boardUpdatedAt - Timestamp of the cloud update (fallback)
 * @returns {Array} - The final list of merged cards
 */
export const reconcileCards = (cloudCards = [], localCards = [], localSyncVersion = 0, cloudSyncVersion = 0, localUpdatedAt = 0, boardUpdatedAt = 0) => {
    const cloudCardMap = new Map(cloudCards.map(c => [c.id, c]));
    const localCardIds = new Set(localCards.map((card) => card.id));
    const mergedLocalCards = localCards.map((localCard) => {
        const cloudCard = cloudCardMap.get(localCard.id);
        if (!cloudCard) {
            return localCard;
        }
        return mergeCardContent(cloudCard, localCard);
    });

    const cloudOnlyCards = cloudCards.filter((cloudCard) => !localCardIds.has(cloudCard.id));
    return [...mergedLocalCards, ...cloudOnlyCards];
};

/**
 * Merge card content from cloud and local, preserving the best of both.
 * Handles image base64 preservation and note content merging.
 */
const mergeCardContent = (cloudCard, localCard) => {
    const cloudMessages = Array.isArray(cloudCard.data?.messages) ? cloudCard.data.messages : [];
    const localMessages = Array.isArray(localCard.data?.messages) ? localCard.data.messages : [];
    const mergedMessages = localMessages.length > 0
        ? localMessages.map((localMsg, msgIdx) => {
            const cloudMsg = cloudMessages[msgIdx];
            if (!cloudMsg || !Array.isArray(localMsg.content) || !Array.isArray(cloudMsg.content)) {
                return localMsg;
            }

            const mergedContent = localMsg.content.map((localPart, partIdx) => {
                const cloudPart = cloudMsg.content[partIdx];
                if (localPart?.type === 'image' && cloudPart?.type === 'image') {
                    return {
                        ...cloudPart,
                        ...localPart,
                        source: {
                            ...(cloudPart.source || {}),
                            ...(localPart.source || {}),
                            ...(cloudPart.source?.url ? { s3Url: cloudPart.source.url } : {})
                        }
                    };
                }
                return localPart;
            });

            return {
                ...cloudMsg,
                ...localMsg,
                content: mergedContent
            };
        })
        : cloudMessages;

    const localNoteContent = localCard.data?.content;
    const cloudNoteContent = cloudCard.data?.content;
    const mergedNoteContent = localCard.type === 'note'
        ? (localNoteContent || cloudNoteContent)
        : (localNoteContent ?? cloudNoteContent);

    return {
        ...cloudCard,
        ...localCard,
        data: {
            ...cloudCard.data,
            ...localCard.data,
            messages: mergedMessages.length > 0 ? mergedMessages : localMessages,
            content: mergedNoteContent
        },
        createdAt: localCard.createdAt || cloudCard.createdAt,
        updatedAt: Math.max(
            localCard.updatedAt || 0,
            cloudCard.updatedAt || 0,
            localCard.deletedAt || 0,
            cloudCard.deletedAt || 0
        ) || Date.now(),
        deletedAt: localCard.deletedAt ?? cloudCard.deletedAt
    };
};
