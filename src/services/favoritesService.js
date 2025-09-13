
const FAVORITES_KEY = 'mixboard_favorites_index';

// Cloud sync integration
import { saveFavoriteToCloud, deleteFavoriteFromCloud } from './syncService';
import { auth } from './firebase';

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
            category: 'Uncategorized',
            favoritedAt: Date.now()
        };

        saveFavorites([newFavorite, ...list]);
        console.log(`[Favorites] Snapshotted message ${messageIndex} from card ${card.id}`);

        // Cloud Sync
        if (auth.currentUser) {
            saveFavoriteToCloud(auth.currentUser.uid, newFavorite);
        }

        // Trigger auto-categorization
        favoritesService.autoCategorize(newFavorite.id, messageContent);
    },

    removeFavorite: (cardId, messageIndex) => {
        const list = getRawFavorites();
        // Find ID first for cloud delete
        const itemToDelete = list.find(item => item.source?.cardId === cardId && item.source?.messageIndex === messageIndex);

        // Remove by source identity
        const newList = list.filter(item => !(item.source?.cardId === cardId && item.source?.messageIndex === messageIndex));
        saveFavorites(newList);
        console.log(`[Favorites] Removed snapshot for message ${messageIndex} of card ${cardId}`);

        // Cloud Sync
        if (auth.currentUser && itemToDelete) {
            deleteFavoriteFromCloud(auth.currentUser.uid, itemToDelete.id);
        }
    },

    removeFavoriteById: (favId) => {
        const list = getRawFavorites();
        const newList = list.filter(item => item.id !== favId);
        saveFavorites(newList);

        // Cloud Sync
        if (auth.currentUser) {
            deleteFavoriteFromCloud(auth.currentUser.uid, favId);
        }
    },

    updateCategory: (favId, newCategory) => {
        const list = getRawFavorites();
        const index = list.findIndex(item => item.id === favId);
        if (index !== -1) {
            list[index].category = newCategory;
            saveFavorites(list);

            // Cloud Sync
            if (auth.currentUser) {
                saveFavoriteToCloud(auth.currentUser.uid, list[index]);
            }
        }
    },

    // Called by sync listener to update local state from cloud
    updateLocalFavorites: (updates) => {
        let list = getRawFavorites();
        let hasChanges = false;

        updates.forEach(update => {
            if (update._deleted) {
                const initialLen = list.length;
                list = list.filter(f => f.id !== update.id);
                if (list.length !== initialLen) hasChanges = true;
            } else {
                const index = list.findIndex(f => f.id === update.id);
                if (index !== -1) {
                    // Update existing
                    if (JSON.stringify(list[index]) !== JSON.stringify(update)) {
                        list[index] = update;
                        hasChanges = true;
                    }
                } else {
                    // Add new
                    list.push(update);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            saveFavorites(list);
            console.log(`[Favorites] Updated local state with ${updates.length} changes from cloud`);
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
