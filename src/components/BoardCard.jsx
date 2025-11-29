import React from 'react';
import { FileText, ArrowRight, Ban, Trash2, Loader2, Image as ImageIcon, RotateCcw, Clock, MoreHorizontal } from 'lucide-react';

export default function BoardCard({
    board,
    index,
    isTrashView,
    onSelect,
    onDelete,
    onRestore,
    onRequestPermanentDelete,
    onGenerateBackground,
    generatingBoardId,
    variant = 'overlay', // 'overlay' | 'stacked'
    isSystemCreditsUser = false,
    shouldAnimate = true
}) {
    const handleImageButtonClick = (e, boardId) => {
        e.stopPropagation();
        // Free users now have 20 images/week quota, no restriction needed
        onGenerateBackground(boardId);
    };

    const getDaysRemaining = (deletedAt) => {
        if (!deletedAt) return 30;
        const expiryDate = deletedAt + (30 * 24 * 60 * 60 * 1000);
        const diff = expiryDate - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    // Helper for random gradient if no image
    const getRandomGradient = (id) => {
        const gradients = [
            'from-blue-500/20 to-purple-500/20',
            'from-emerald-500/20 to-teal-500/20',
            'from-orange-500/20 to-red-500/20',
            'from-pink-500/20 to-rose-500/20',
            'from-indigo-500/20 to-cyan-500/20'
        ];
        const index = id.charCodeAt(0) % gradients.length;
        return gradients[index];
    };

    // Variant: Stacked (Modern Grid Item)
    if (variant === 'stacked') {
        const hasImage = board.backgroundImage || board.thumbnail;
        if (board.summary) console.log('[BoardCard] Rendering with Summary:', board.name, board.summary);
        // Debug usage: check if summary is present
        // if (board.id === '1767809057777') console.log('[BoardCard] Rendering:', board.id, 'HasSummary:', !!board.summary, board.summary);

        return (
            <div
                onClick={() => !isTrashView && onSelect(board.id)}
                className={`
                    group relative flex flex-col cursor-pointer transition-all duration-300 ${shouldAnimate ? 'animate-fade-in-up' : ''}
                    rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden
                    hover:shadow-2xl hover:border-indigo-500/30 dark:hover:border-indigo-400/30 hover:-translate-y-1
                    bg-white dark:bg-[#0A0A0A]
                    ${isTrashView ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}
                `}
                style={shouldAnimate ? { animationDelay: `${index * 50}ms` } : {}}>

                {/* Image Section (Top Half) - WITH AI SUMMARY SUPPORT */}
                <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-[#111]">
                    {hasImage && !board.summary ? (
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                            style={{ backgroundImage: `url(${board.backgroundImage || board.thumbnail})` }}
                        />
                    ) : board.summary ? (
                        /* AI Summary Text Cover for Stacked Variant - DEBUG VERSION */
                        <div className="absolute inset-0 bg-red-500">
                            {/* DEBUG: Red background to confirm this block renders */}
                            <div className="absolute inset-0 flex flex-col p-4">
                                <p className="text-lg font-bold text-yellow-300 bg-black/50 p-2">
                                    DEBUG: {board.summary.summary || "NO TEXT"}
                                </p>
                                <div className="mt-auto h-2 w-12 bg-yellow-400" />
                            </div>
                        </div>
                    ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${getRandomGradient(board.id)} opacity-50`} />
                    )}

                    {/* Overlay Gradient for Text Readability or Style (only for image cards) */}
                    {hasImage && !board.summary && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent dark:from-black/40" />
                    )}

                    {/* Quick Actions Overlay */}
                    {!isTrashView && (
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                            {/* Only show generate background button if cardCount >= 10 */}
                            {(board.cardCount || 0) >= 10 && (
                                <button
                                    onClick={(e) => handleImageButtonClick(e, board.id)}
                                    disabled={generatingBoardId === board.id}
                                    aria-label="Generate Board Image"
                                    className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors"
                                >
                                    {generatingBoardId === board.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(board.id);
                                }}
                                aria-label="Delete Board"
                                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Section (Bottom Half) */}
                <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2 h-12">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-gray-100 leading-tight line-clamp-2 font-inter-tight">
                            {board.name}
                        </h3>
                    </div>

                    <div className="mt-auto flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${board.cardCount > 0 ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-neutral-700'}`} />
                            <span>{board.cardCount || 0} Cards</span>
                        </div>
                        <span>{new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>

                    {isTrashView && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                <Clock size={12} /> {getDaysRemaining(board.deletedAt)} days left
                            </span>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onRestore(board.id); }} aria-label="Restore Board" className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 rounded-md transition-colors"><RotateCcw size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); onRequestPermanentDelete(board.id); }} aria-label="Permanently Delete Board" className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-md transition-colors"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Variant: Overlay (Recently Visited)
    return (
        <div
            onClick={() => !isTrashView && onSelect(board.id)}
            style={shouldAnimate ? { animationDelay: `${index * 50}ms` } : {}}
            className={`
                group relative h-[180px] w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] transition-all duration-300 hover:shadow-xl hover:scale-[1.02]
            `}
        >
            {/* Background Image OR Thumbnail (but only if no AI summary exists, as summary > thumbnail) */}
            {board.backgroundImage || (board.thumbnail && !board.summary) ? (
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                    style={{ backgroundImage: `url(${board.backgroundImage || board.thumbnail})` }}
                />
            ) : board.summary ? (
                /* AI Summary Text Cover - Simplified & Clean */
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.02] bg-[#1a1a1a]">
                    {/* Simple Ambient Background based on Theme */}
                    <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${{
                        'blue': 'from-blue-600 via-transparent to-black',
                        'purple': 'from-purple-600 via-transparent to-black',
                        'emerald': 'from-emerald-600 via-transparent to-black',
                        'orange': 'from-orange-600 via-transparent to-black',
                        'pink': 'from-pink-600 via-transparent to-black',
                        'slate': 'from-slate-600 via-transparent to-black',
                    }[board.summary.theme || 'slate']}`} />

                    {/* Content Container - Clean Layout */}
                    <div className="relative z-10 flex flex-col h-full p-5">
                        {/* Header: Title */}
                        <div className="mb-3">
                            <h3 className="text-xl font-bold text-white/90 leading-tight font-inter-tight line-clamp-2">
                                {board.name}
                            </h3>
                            {/* Minimal Accent Line */}
                            <div className={`mt-3 h-1 w-8 rounded-full opacity-80 ${{
                                'blue': 'bg-blue-500',
                                'purple': 'bg-purple-500',
                                'emerald': 'bg-emerald-500',
                                'orange': 'bg-orange-500',
                                'pink': 'bg-pink-500',
                                'slate': 'bg-slate-500',
                            }[board.summary.theme || 'slate']}`} />
                        </div>

                        {/* Body: AI Summary */}
                        <p className="text-xs font-medium text-white/50 leading-relaxed line-clamp-4">
                            {board.summary.summary}
                        </p>

                        {/* Footer: Meta & Actions */}
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                                    {board.cardCount || 0} ITEMS
                                </span>
                            </div>

                            {/* Quick Actions */}
                            {!isTrashView && (
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {(board.cardCount || 0) >= 10 && (
                                        <button
                                            onClick={(e) => handleImageButtonClick(e, board.id)}
                                            disabled={generatingBoardId === board.id}
                                            title="Generate Image Background"
                                            className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all"
                                        >
                                            {generatingBoardId === board.id ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(board.id);
                                        }}
                                        className="w-7 h-7 rounded-md bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 flex items-center justify-center transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${getRandomGradient(board.id)} opacity-30`} />
            )}

            {/* Gradient Overlay - Only for Image or Gradient cards */}
            {(!board.summary) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            )}

            {/* Content (Title/Stats) - STANDARD footer for non-summary cards */}
            {(!board.summary) && (
                <div className={`absolute inset-x-0 bottom-0 p-4`}>
                    <h3 className="text-white font-bold truncate text-base mb-1 group-hover:text-indigo-200 transition-colors font-inter-tight">
                        {board.name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        <span>{new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <span>•</span>
                        <span>{board.cardCount || 0} items</span>
                    </div>
                </div>
            )}

            {/* Icon Overlay Top Right - Standard arrow for non-summary cards */}
            {(!board.summary) && (
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <ArrowRight size={14} />
                </div>
            )}
        </div>
    );
}
