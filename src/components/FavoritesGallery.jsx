
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

    const handleCardClick = (boardId) => {
        if (boardId) navigate(`/board/${boardId}`);
    };

    const handleRemove = (e, favId) => {
        e.stopPropagation();
        favoritesService.removeFavoriteById(favId);
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
                        key={item.id}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className="group relative glass-card p-6 rounded-[2rem] hover:glass-card-hover min-h-[200px] flex flex-col justify-between animate-slide-up"
                    >
                        <div className="mb-4">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg">
                                    Favorite Note
                                </span>
                                <button
                                    onClick={(e) => handleRemove(e, item.id)} // Remove by favId
                                    className="text-orange-400 hover:text-slate-400 transition-colors p-1"
                                    title="Remove from favorites"
                                >
                                    <Star size={16} fill="currentColor" />
                                </button>
                            </div>
                            <div className="font-lxgw text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar">
                                {item.content}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between mt-auto">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Source Board</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]" title={item.boardName}>
                                    {item.boardName || "Unknown"}
                                </span>
                            </div>
                            <button
                                onClick={() => handleCardClick(item.source?.boardId)}
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/20 transition-all"
                                title="Go to source board"
                            >
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
