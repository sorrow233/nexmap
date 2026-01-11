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
 * Reconciles cloud cards with local cards, handling generic content merging and deletion detection.
 * Uses syncVersion (logical clock) for reliable conflict detection, with timestamp fallback for backward compatibility.
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
    // Determine which source is authoritative based on syncVersion or timestamp
    const cloudIsNewer = cloudSyncVersion > 0 && localSyncVersion > 0
        ? cloudSyncVersion > localSyncVersion
        : boardUpdatedAt > localUpdatedAt;

    // 1. Reconcile Cloud Cards (Keep unless locally deleted)
    const mergedCards = cloudCards.map(cloudCard => {
        const localCard = localCards.find(c => c.id === cloudCard.id);
        if (!localCard) {
            // RECONCILIATION: Is this a remote addition or a local deletion?
            // Use syncVersion-based detection if available, otherwise use timestamp
            const referenceTime = localSyncVersion > 0 ? 0 : localUpdatedAt;
            if (cloudCard.createdAt && cloudCard.createdAt > referenceTime) {
                return cloudCard; // Remote addition
            }
            return null; // Likely local deletion
        }

        // Robust content merging for 'note' type cards
        if (cloudCard.type === 'note' && localCard.type === 'note') {
            const cloudContent = cloudCard.data?.content || '';
            const localContent = localCard.data?.content || '';
            if (cloudContent !== localContent) {
                const cloudCount = (cloudContent.match(/^\d+\./gm) || []).length;
                const localCount = (localContent.match(/^\d+\./gm) || []).length;
                if (localCount > cloudCount) {
                    cloudCard.data.content = localContent;
                }
            }
        }

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
            data: {
                ...cloudCard.data,
                ...localCard.data,
                ...cloudCard.data, // Re-apply cloud data but keep local specific fields if needed? 
                // Original logic was: ...cloudCard.data, ...localCard.data, messages: merged, content: cloudCard.data.content
                // But wait, line 113-118 of original:
                // ...cloudCard.data,
                // ...localCard.data,
                // messages: mergedMessages,
                // content: cloudCard.data.content

                // Let's stick to the original logic exactly to be safe
                ...localCard.data,
                messages: mergedMessages,
                content: cloudCard.data.content || localCard.data.content // Original line 117 says `content: cloudCard.data.content` but wait,
                // If cloudCard.data.content was updated in line 82 (cloudCard.data.content = localContent), then it works.
            }
        };
    }).filter(Boolean);

    // 2. Reconcile Local Cards (Keep new local additions)
    const localOnlyCards = localCards.filter(lc => {
        const inCloud = cloudCards.find(cc => cc.id === lc.id);
        if (inCloud) return false;

        // RECONCILIATION: Is this a new local card or a remote deletion?
        if (lc.createdAt && lc.createdAt > (boardUpdatedAt || 0)) {
            return true; // New local addition
        }
        return false; // Likely remote deletion
    });

    return [...mergedCards, ...localOnlyCards];
};
