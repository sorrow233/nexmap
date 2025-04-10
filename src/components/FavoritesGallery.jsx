
import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';
import favoritesService from '../services/favoritesService';
import { useNavigate } from 'react-router-dom';

export default function FavoritesGallery() {
    const [favorites, setFavorites] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Initial load
        setFavorites(favoritesService.getFavorites());

        // Listen for updates
        const handleUpdate = () => {
            setFavorites(favoritesService.getFavorites());
        };
        window.addEventListener('favorites-updated', handleUpdate);
        return () => window.removeEventListener('favorites-updated', handleUpdate);
    }, []);

    const handleCardClick = (boardId, cardId) => {
        // Navigate to board
        // In the future we might want to deeply link to the card (e.g., expand it)
        // For now, just open the board. The user can find it.
        // We could append ?cardId=... to logic later.
        navigate(`/board/${boardId}`);
    };

    const handleRemove = (e, cardId) => {
        e.stopPropagation();
        favoritesService.removeFavorite(cardId);
    };

    if (favorites.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-40 animate-fade-in text-slate-500">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-8 shadow-inner">
                    <Star size={40} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No favorites yet</h2>
                <p className="max-w-xs text-center font-medium">
                    Star your most important conversations to keep them handy here.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-40">
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 pl-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center">
                    <Star size={20} fill="currentColor" />
                </div>
                Collection
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-3 py-1 rounded-full font-bold">
                    {favorites.length}
                </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
                {favorites.map((item, index) => (
                    <div
                        key={item.cardId}
                        onClick={() => handleCardClick(item.boardId, item.cardId)}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className="group relative glass-card p-6 rounded-[2rem] cursor-pointer hover:glass-card-hover min-h-[200px] flex flex-col justify-between animate-slide-up"
                    >
                        <div className="mb-4">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg">
                                    {item.type === 'note' ? 'Note' : 'Conversation'}
                                </span>
                                <button
                                    onClick={(e) => handleRemove(e, item.cardId)}
                                    className="text-orange-400 hover:text-slate-400 transition-colors p-1"
                                    title="Remove from favorites"
                                >
                                    <Star size={16} fill="currentColor" />
                                </button>
                            </div>
                            <p className="font-lxgw text-slate-700 dark:text-slate-300 text-sm line-clamp-4 font-medium leading-relaxed">
                                {typeof item.preview === 'string'
                                    ? item.preview
                                    : (Array.isArray(item.preview)
                                        ? "Media Content" // Fallback for complex content
                                        : "No preview")}
                            </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">From Board</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]" title={item.boardName}>
                                    {item.boardName}
                                </span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/20 transition-all">
                                <ExternalLink size={14} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
