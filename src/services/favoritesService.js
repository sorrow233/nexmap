
const FAVORITES_KEY = 'mixboard_favorites_index';

// Helper to get raw favorites
const getRawFavorites = () => {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse favorites", e);
        return [];
    }
};

const saveFavorites = (favorites) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    // Dispatch event for reactive updates in other components/tabs
    window.dispatchEvent(new Event('favorites-updated'));
};

const favoritesService = {
    getFavorites: () => {
        return getRawFavorites().sort((a, b) => b.favoritedAt - a.favoritedAt);
    },

    // Check if a specific message in a card is favorited
    isFavorite: (cardId, messageIndex) => {
        const list = getRawFavorites();
        return list.some(item => item.source?.cardId === cardId && item.source?.messageIndex === messageIndex);
    },

    addFavorite: (card, boardId, boardName, messageIndex, messageContent) => {
        const list = getRawFavorites();
        // Prevent duplicates
        if (list.some(item => item.source?.cardId === card.id && item.source?.messageIndex === messageIndex)) return;

        const newFavorite = {
            id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: {
                cardId: card.id,
                messageIndex: messageIndex,
                boardId: boardId
            },
            boardName: boardName,
            content: messageContent, // Full independent content
            type: 'note', // Treated as a note
            favoritedAt: Date.now()
        };

        saveFavorites([newFavorite, ...list]);
        console.log(`[Favorites] Snapshotted message ${messageIndex} from card ${card.id}`);
    },

    removeFavorite: (cardId, messageIndex) => {
        const list = getRawFavorites();
        // Remove by source identity
        const newList = list.filter(item => !(item.source?.cardId === cardId && item.source?.messageIndex === messageIndex));
        saveFavorites(newList);
        console.log(`[Favorites] Removed snapshot for message ${messageIndex} of card ${cardId}`);
    },

    removeFavoriteById: (favId) => {
        const list = getRawFavorites();
        const newList = list.filter(item => item.id !== favId);
        saveFavorites(newList);
    },

    // Toggle function for convenience
    toggleFavorite: (card, boardId, boardName, messageIndex, messageContent) => {
        const list = getRawFavorites();
        const exists = list.some(item => item.source?.cardId === card.id && item.source?.messageIndex === messageIndex);
        if (exists) {
            favoritesService.removeFavorite(card.id, messageIndex);
            return false;
        } else {
            favoritesService.addFavorite(card, boardId, boardName, messageIndex, messageContent);
            return true;
        }
    }
};

export default favoritesService;
