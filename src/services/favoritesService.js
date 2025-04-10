
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

    isFavorite: (cardId) => {
        const list = getRawFavorites();
        return list.some(item => item.cardId === cardId);
    },

    addFavorite: (card, boardId, boardName) => {
        const list = getRawFavorites();
        if (list.some(item => item.cardId === card.id)) return; // Already exists

        const newFavorite = {
            cardId: card.id,
            boardId: boardId,
            boardName: boardName,
            preview: card.data?.text || card.data?.messages?.[0]?.content || "Untitled Card",
            type: card.type,
            favoritedAt: Date.now()
        };

        saveFavorites([newFavorite, ...list]);
        console.log(`[Favorites] Added card ${card.id} from board ${boardId}`);
    },

    removeFavorite: (cardId) => {
        const list = getRawFavorites();
        const newList = list.filter(item => item.cardId !== cardId);
        saveFavorites(newList);
        console.log(`[Favorites] Removed card ${cardId}`);
    },

    // Toggle function for convenience
    toggleFavorite: (card, boardId, boardName) => {
        const list = getRawFavorites();
        const exists = list.some(item => item.cardId === card.id);
        if (exists) {
            favoritesService.removeFavorite(card.id);
            return false;
        } else {
            favoritesService.addFavorite(card, boardId, boardName);
            return true;
        }
    }
};

export default favoritesService;
