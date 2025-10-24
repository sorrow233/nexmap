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
    // Create lookup maps for efficient access
    const cloudCardMap = new Map(cloudCards.map(c => [c.id, c]));
    const localCardMap = new Map(localCards.map(c => [c.id, c]));

    const result = [];
    const processedIds = new Set();

    // 1. Process all cloud cards
    for (const cloudCard of cloudCards) {
        processedIds.add(cloudCard.id);
        const localCard = localCardMap.get(cloudCard.id);

        if (!localCard) {
            // Card exists in cloud but not in local
            // ALWAYS keep it - it's either new from another device, or we haven't synced it yet
            result.push(cloudCard);
            continue;
        }

        // Card exists in both - reconcile soft delete status
        const cloudDeleted = !!cloudCard.deletedAt;
        const localDeleted = !!localCard.deletedAt;

        if (cloudDeleted && localDeleted) {
            // Both deleted - use the later deletion time
            const mergedCard = {
                ...mergeCardContent(cloudCard, localCard),
                deletedAt: Math.max(cloudCard.deletedAt, localCard.deletedAt)
            };
            result.push(mergedCard);
        } else if (cloudDeleted && !localDeleted) {
            // Cloud deleted, local not - check if local was modified after cloud deletion
            const localModifiedAt = localCard.updatedAt || localCard.createdAt || 0;
            if (localModifiedAt > cloudCard.deletedAt) {
                // Local was modified after cloud deletion - keep local (user restored/re-edited)
                result.push(mergeCardContent(cloudCard, localCard));
            } else {
                // Cloud deletion is newer - apply deletion
                result.push({
                    ...mergeCardContent(cloudCard, localCard),
                    deletedAt: cloudCard.deletedAt
                });
            }
        } else if (!cloudDeleted && localDeleted) {
            // Local deleted, cloud not - check if cloud was modified after local deletion
            const cloudModifiedAt = cloudCard.updatedAt || cloudCard.createdAt || 0;
            if (cloudModifiedAt > localCard.deletedAt) {
                // Cloud was modified after local deletion - keep cloud (another device restored/re-edited)
                result.push(mergeCardContent(cloudCard, localCard));
            } else {
                // Local deletion is newer - apply deletion
                result.push({
                    ...mergeCardContent(cloudCard, localCard),
                    deletedAt: localCard.deletedAt
                });
            }
        } else {
            // Neither deleted - merge content normally
            result.push(mergeCardContent(cloudCard, localCard));
        }
    }

    // 2. Process local-only cards (not in cloud)
    for (const localCard of localCards) {
        if (processedIds.has(localCard.id)) continue;

        // Card exists in local but not in cloud
        // ALWAYS keep it - it's either new locally, or cloud hasn't synced yet
        // This prevents data loss even if cloud is behind
        result.push(localCard);
    }

    return result;
};

/**
 * Merge card content from cloud and local, preserving the best of both.
 * Handles image base64 preservation and note content merging.
 */
const mergeCardContent = (cloudCard, localCard) => {
    // Robust content merging for 'note' type cards
    let mergedNoteContent = cloudCard.data?.content || localCard.data?.content;
    if (cloudCard.type === 'note' && localCard.type === 'note') {
        const cloudContent = cloudCard.data?.content || '';
        const localContent = localCard.data?.content || '';
        if (cloudContent !== localContent) {
            const cloudCount = (cloudContent.match(/^\d+\./gm) || []).length;
            const localCount = (localContent.match(/^\d+\./gm) || []).length;
            if (localCount > cloudCount) {
                mergedNoteContent = localContent;
            }
        }
    }

    // Merge messages with image base64 preservation
    const mergedMessages = (cloudCard.data?.messages || []).map((cloudMsg, msgIdx) => {
        const localMsg = localCard.data?.messages?.[msgIdx];
        if (!localMsg || !Array.isArray(cloudMsg.content) || !Array.isArray(localMsg.content)) return cloudMsg;

        const mergedContent = cloudMsg.content.map((cloudPart, partIdx) => {
            const localPart = localMsg.content[partIdx];
            if (cloudPart.type === 'image' && localPart?.type === 'image') {
                return {
                    ...cloudPart,
                    source: {
                        ...cloudPart.source,
                        ...(localPart.source?.type === 'base64' ? {
                            type: 'base64',
                            data: localPart.source.data
                        } : {}),
                        ...(cloudPart.source?.url ? { s3Url: cloudPart.source.url } : {})
                    }
                };
            }
            return cloudPart;
        });
        return { ...cloudMsg, content: mergedContent };
    });

    return {
        ...cloudCard,
        ...localCard,
        ...cloudCard, // Cloud takes priority for most fields
        data: {
            ...localCard.data,
            ...cloudCard.data,
            messages: mergedMessages.length > 0 ? mergedMessages : (localCard.data?.messages || []),
            content: mergedNoteContent
        },
        // Preserve creation time
        createdAt: cloudCard.createdAt || localCard.createdAt,
        // Use later update time
        updatedAt: Math.max(cloudCard.updatedAt || 0, localCard.updatedAt || 0) || Date.now()
    };
};
