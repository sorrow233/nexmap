import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, ArrowRight, ExternalLink, Share2, X } from 'lucide-react';
import favoritesService from '../services/favoritesService';
import { useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import ShareModal from './share/ShareModal';

export default function FavoritesGallery() {
    const [favorites, setFavorites] = useState([]);
    const [expandedFav, setExpandedFav] = useState(null);
    const [shareContent, setShareContent] = useState(null);
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

    const handleShare = (e, content) => {
        e.stopPropagation();
        setShareContent(content);
    };

    const renderMarkdown = (content) => {
        if (!content) return '';
        const html = marked.parse(content);
        return DOMPurify.sanitize(html);
    };

    if (favorites.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-40 animate-fade-in text-slate-500">
                <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 dark:bg-white/5 flex items-center justify-center mb-8 shadow-inner">
                    <Star size={40} className="text-indigo-200 dark:text-slate-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 font-inter-tight">No favorites yet</h2>
                <p className="max-w-xs text-center font-medium">
                    Star your most important conversations to keep them handy here.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="animate-fade-in pb-40">
                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 pl-1 flex items-center gap-2 uppercase tracking-widest">
                    <Star size={16} className="text-indigo-500" />
                    Collection
                    <span className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {favorites.length}
                    </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
                    {favorites.map((item, index) => (
                        <div
                            key={item.id}
                            onDoubleClick={() => setExpandedFav(item)}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className="group relative glass-card p-6 rounded-[2rem] hover:glass-card-hover min-h-[200px] flex flex-col justify-between animate-fade-in-up cursor-pointer border border-slate-200 dark:border-white/10"
                        >
                            <div className="mb-4">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg">
                                        Note
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => handleShare(e, item.content)}
                                            className="text-slate-400 hover:text-indigo-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                            title="Share as image"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleRemove(e, item.id)}
                                            className="text-amber-400 hover:text-slate-400 transition-colors p-1"
                                            title="Remove from favorites"
                                        >
                                            <Star size={16} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none 
                                    prose-headings:font-bold prose-headings:tracking-tight
                                    prose-h1:text-lg prose-h1:mb-2 
                                    prose-h2:text-base prose-h2:mb-2 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-white/10 prose-h2:pb-1
                                    prose-p:text-sm prose-p:leading-relaxed prose-p:mb-2 prose-p:text-slate-700 dark:prose-p:text-slate-300
                                    prose-strong:text-slate-900 dark:prose-strong:text-white
                                    prose-ul:list-disc prose-ul:pl-4 prose-ul:my-2
                                    prose-li:text-sm prose-li:my-0.5
                                    prose-blockquote:border-l-2 prose-blockquote:border-indigo-500 prose-blockquote:pl-2 prose-blockquote:italic prose-blockquote:text-xs
                                    prose-code:text-xs prose-code:bg-slate-100 dark:prose-code:bg-white/10 prose-code:px-1 prose-code:rounded
                                    font-inter-tight text-slate-700 dark:text-slate-300 leading-relaxed max-h-[300px] overflow-hidden relative"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
                                />
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 dark:from-black dark:via-black/80 to-transparent pointer-events-none rounded-b-[2rem]" />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between mt-auto z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">From</span>
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]" title={item.boardName}>
                                        {item.boardName || "Unknown"}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCardClick(item.source?.boardId); }}
                                    className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-all"
                                    title="Go to source board"
                                >
                                    <ExternalLink size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Expanded Modal */}
            {expandedFav && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4" style={{ perspective: '1000px' }}>
                    <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md transition-opacity" onClick={() => setExpandedFav(null)} />

                    <div className="w-full max-w-[1100px] h-full sm:h-[92vh] sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-fade-in relative z-10 transition-all duration-500 bg-white/95 dark:bg-[#0A0A0A] backdrop-blur-2xl border border-slate-200 dark:border-white/10">
                        {/* Header */}
                        <div className="h-20 px-10 flex justify-between items-center shrink-0 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20 flex items-center justify-center">
                                    <Star size={24} className="text-white" fill="white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-2xl tracking-tight leading-tight font-inter-tight">Favorite Note</h3>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-indigo-500 dark:text-indigo-400">Collection</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShareContent(expandedFav.content)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                                >
                                    <Share2 size={14} />
                                    Share
                                </button>
                                <button onClick={() => setExpandedFav(null)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-grow overflow-y-auto px-6 sm:px-10 py-12 custom-scrollbar">
                            <div className="reader-width">
                                <div
                                    className="prose prose-slate dark:prose-invert max-w-none 
                                    prose-headings:font-bold prose-headings:tracking-tight
                                    prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-2
                                    prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-white/10 prose-h2:pb-2
                                    prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
                                    prose-p:leading-relaxed prose-p:text-base prose-p:mb-4 prose-p:text-slate-700 dark:prose-p:text-slate-300
                                    prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-bold
                                    prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                                    prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                                    prose-li:my-1 prose-li:text-slate-700 dark:prose-li:text-slate-300
                                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:my-4 prose-blockquote:rounded-r-lg
                                    prose-code:font-mono prose-code:text-sm prose-code:bg-slate-100 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-indigo-600 dark:prose-code:text-indigo-400
                                    prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:my-4
                                    font-inter-tight"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(expandedFav.content) }}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-10 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">Source: <span className="font-bold text-slate-900 dark:text-white">{expandedFav.boardName}</span></span>
                                <button
                                    onClick={() => { setExpandedFav(null); handleCardClick(expandedFav.source?.boardId); }}
                                    className="text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1"
                                >
                                    Go to Board <ExternalLink size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={!!shareContent}
                onClose={() => setShareContent(null)}
                content={shareContent}
            />
        </>
    );
}
