
const FAVORITES_KEY = 'mixboard_favorites_index';
const FAVORITE_FINGERPRINT_CONTENT_LIMIT = 80_000;

import { runtimeLog } from '../utils/runtimeLogging';

let cachedFavoritesRaw = null;
let cachedFavoritesList = null;
let storageListenerInstalled = false;

const normalizeFavoriteContent = (messageContent) => {
    if (typeof messageContent === 'string') {
        return messageContent;
    }

    if (Array.isArray(messageContent)) {
        return messageContent.reduce((result, part) => {
            if (part?.type === 'text' && typeof part.text === 'string') {
                return result + part.text;
            }
            return result;
        }, '');
    }

    if (messageContent == null) {
        return '';
    }

    return String(messageContent);
};

const buildFavoriteFingerprint = (messageContent) => {
    const normalized = normalizeFavoriteContent(messageContent).trim();
    if (!normalized) return '';

    let hash = 0;
    for (let index = 0; index < normalized.length; index += 1) {
        hash = ((hash << 5) - hash) + normalized.charCodeAt(index);
        hash |= 0;
    }

    return `fp_${normalized.length}_${Math.abs(hash)}`;
};

const readFavoriteStorage = () => {
    if (typeof localStorage === 'undefined') return null;
    try {
        return localStorage.getItem(FAVORITES_KEY);
    } catch {
        return null;
    }
};

const clearFavoritesCache = () => {
    cachedFavoritesRaw = null;
    cachedFavoritesList = null;
};

const ensureFavoritesStorageListener = () => {
    if (storageListenerInstalled || typeof window === 'undefined') return;
    storageListenerInstalled = true;
    window.addEventListener('storage', (event) => {
        if (event.key === FAVORITES_KEY) {
            clearFavoritesCache();
        }
    });
};

const parseFingerprintContentLength = (fingerprint = '') => {
    const match = String(fingerprint || '').match(/^fp_(\d+)_/);
    if (!match) return null;
    const length = Number(match[1]);
    return Number.isFinite(length) ? length : null;
};

const buildScopedFavoriteMatcher = ({
    cardId,
    messageId = null,
    messageIndex = null,
    messageContent = null
} = {}) => {
    let normalizedContentLength = null;
    let normalizedContentLengthResolved = false;
    let fingerprint = null;
    let fingerprintResolved = false;

    const readNormalizedContentLength = () => {
        if (!normalizedContentLengthResolved) {
            normalizedContentLength = normalizeFavoriteContent(messageContent).trim().length;
            normalizedContentLengthResolved = true;
        }
        return normalizedContentLength;
    };

    const readFingerprint = () => {
        if (!fingerprintResolved) {
            fingerprint = buildFavoriteFingerprint(messageContent);
            fingerprintResolved = true;
        }
        return fingerprint;
    };

    return (favorite = {}) => {
        if (favorite?.source?.cardId !== cardId) {
            return false;
        }

        const storedMessageId = favorite?.source?.messageId;
        if (storedMessageId && messageId) {
            return storedMessageId === messageId;
        }

        if (storedMessageId && !messageId) {
            return false;
        }

        if (favorite?.source?.messageIndex !== messageIndex) {
            return false;
        }

        const storedFingerprint = favorite?.source?.fingerprint;
        if (!storedFingerprint) {
            return true;
        }

        const storedLength = parseFingerprintContentLength(storedFingerprint);
        const contentLength = readNormalizedContentLength();
        if (storedLength !== null && contentLength !== storedLength) {
            return false;
        }

        if (contentLength > FAVORITE_FINGERPRINT_CONTENT_LIMIT) {
            return false;
        }

        const currentFingerprint = readFingerprint();
        return Boolean(currentFingerprint && storedFingerprint === currentFingerprint);
    };
};

// Helper to get raw favorites
const getRawFavorites = () => {
    ensureFavoritesStorageListener();
    const stored = readFavoriteStorage();
    if (stored === cachedFavoritesRaw && Array.isArray(cachedFavoritesList)) {
        return cachedFavoritesList;
    }

    try {
        const parsed = stored ? JSON.parse(stored) : [];
        cachedFavoritesRaw = stored;
        cachedFavoritesList = Array.isArray(parsed) ? parsed : [];
        return cachedFavoritesList;
    } catch (e) {
        console.error("Failed to parse favorites", e);
        clearFavoritesCache();
        return [];
    }
};

const saveFavorites = (favorites) => {
    const normalizedFavorites = Array.isArray(favorites) ? favorites : [];
    const serialized = JSON.stringify(normalizedFavorites);
    cachedFavoritesRaw = serialized;
    cachedFavoritesList = normalizedFavorites;
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(FAVORITES_KEY, serialized);
    }
    // Dispatch event for reactive updates in other components/tabs
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('favorites-updated'));
    }
};

const favoritesService = {
    getFavorites: () => {
        return [...getRawFavorites()].sort((a, b) => b.favoritedAt - a.favoritedAt);
    },

    // Check if a specific message in a card is favorited
    isFavorite: (cardId, messageId, messageIndex, messageContent) => {
        const list = getRawFavorites();
        const matchesSource = buildScopedFavoriteMatcher({
            cardId,
            messageId,
            messageIndex,
            messageContent
        });
        return list.some(matchesSource);
    },

    addFavorite: (card, boardId, boardName, messageId, messageIndex, messageContent) => {
        const list = getRawFavorites();
        const fingerprint = buildFavoriteFingerprint(messageContent);
        const matchesSource = buildScopedFavoriteMatcher({
            cardId: card.id,
            messageId,
            messageIndex,
            messageContent
        });
        // Prevent duplicates
        if (list.some(matchesSource)) return;

        const newFavorite = {
            id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: {
                cardId: card.id,
                messageId: messageId || null,
                messageIndex,
                fingerprint,
                boardId: boardId
            },
            boardName: boardName,
            content: normalizeFavoriteContent(messageContent), // Full independent content
            type: 'note', // Treated as a note
            category: 'Uncategorized',
            favoritedAt: Date.now()
        };

        saveFavorites([newFavorite, ...list]);
        runtimeLog(`[Favorites] Snapshotted message ${messageIndex} from card ${card.id}`);

        // Trigger auto-categorization
        favoritesService.autoCategorize(newFavorite.id, messageContent);
    },

    removeFavorite: (cardId, messageId, messageIndex, messageContent) => {
        const list = getRawFavorites();
        const matchesSource = buildScopedFavoriteMatcher({
            cardId,
            messageId,
            messageIndex,
            messageContent
        });
        // Remove by source identity
        const newList = list.filter((item) => !matchesSource(item));
        saveFavorites(newList);
        runtimeLog(`[Favorites] Removed snapshot for message ${messageId || messageIndex} of card ${cardId}`);
    },

    removeFavoriteById: (favId) => {
        const list = getRawFavorites();
        const newList = list.filter(item => item.id !== favId);
        saveFavorites(newList);
    },

    updateCategory: (favId, newCategory) => {
        const list = getRawFavorites();
        const index = list.findIndex(item => item.id === favId);
        if (index !== -1) {
            list[index].category = newCategory;
            saveFavorites(list);
        }
    },

    // Auto-categorize using AI
    autoCategorize: async (favId, content) => {
        try {
            // Import dynamically to avoid circular dependencies if any, or just standard import
            // Assuming llm service is available via window or global if not imported. 
            // Better to use the imported 'chatCompletion' from 'llm.js' but we need access to API key/config.
            // Since this is a service, we might need to get config from store or localStorage.

            // For now, let's try to get config from localStorage if stored, or we rely on the caller to provide it is tricky.
            // Actually, best way is to import the store or similar.
            // Let's attempt to use the 'aiSlice' or similar if possible, but services usually standalone.
            // We'll read from localStorage for 'mixboard_ai_config' if that's where keys are.

            const configStr = localStorage.getItem('mixboard_settings'); // Assuming settings slice persists here
            let config = null;
            if (configStr) {
                const settings = JSON.parse(configStr);
                // The structure of settings slice might need verification. 
                // Usually it's in a 'root' persist or similar. 
                // Let's assume we can get it from the window object (not ideal) or just skip if no config.
                // A better approach: The UI component calling this likely has access. 
                // BUT addFavorite is called from UI. 
            }

            // SIMPLIFICATION: We will emit an event requesting categorization, 
            // and a component (like AIManager or Main Layout) listening to it can perform the AI call.
            // OR we can implement a simple heuristic or mock it for now if AI is too complex to wire here.

            // Re-reading 'llm.js': it exports chatCompletion.
            // We need the apiKey. 

            // Let's try to import store to get state.
            // import { useStore } from '../store/useStore' is for React.
            // We can import the store instance if it was exported, but it's often a hook.

            // ALTERNATIVE: Use a custom event that the BoardPage or Layout listens to.
            window.dispatchEvent(new CustomEvent('request-auto-categorization', {
                detail: { favId, content }
            }));

        } catch (e) {
            console.error("[Favorites] Auto-categorization failed initialization", e);
        }
    },

    // Toggle function for convenience
    toggleFavorite: (card, boardId, boardName, messageId, messageIndex, messageContent) => {
        const list = getRawFavorites();
        const matchesSource = buildScopedFavoriteMatcher({
            cardId: card.id,
            messageId,
            messageIndex,
            messageContent
        });
        const exists = list.some(matchesSource);
        if (exists) {
            favoritesService.removeFavorite(card.id, messageId, messageIndex, messageContent);
            return false;
        } else {
            favoritesService.addFavorite(card, boardId, boardName, messageId, messageIndex, messageContent);
            return true;
        }
    }
};

export default favoritesService;
