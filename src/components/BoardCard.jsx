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

    // Helper for random gradient if no image - Modern fresh colors with dark mode support
    const getRandomGradient = (id) => {
        const gradients = [
            'from-sky-400/30 via-cyan-300/20 to-teal-400/30 dark:from-sky-600/25 dark:via-cyan-500/15 dark:to-teal-600/25',
            'from-violet-400/30 via-purple-300/20 to-fuchsia-400/30 dark:from-violet-600/25 dark:via-purple-500/15 dark:to-fuchsia-600/25',
            'from-rose-400/30 via-pink-300/20 to-orange-400/30 dark:from-rose-600/25 dark:via-pink-500/15 dark:to-orange-600/25',
            'from-emerald-400/30 via-green-300/20 to-lime-400/30 dark:from-emerald-600/25 dark:via-green-500/15 dark:to-lime-600/25',
            'from-amber-400/30 via-yellow-300/20 to-orange-400/30 dark:from-amber-600/25 dark:via-yellow-500/15 dark:to-orange-600/25',
            'from-indigo-400/30 via-blue-300/20 to-cyan-400/30 dark:from-indigo-600/25 dark:via-blue-500/15 dark:to-cyan-600/25'
        ];
        const index = id.charCodeAt(0) % gradients.length;
        return gradients[index];
    };

    // Helper for glass tag colors
    const getTagColor = (tag) => {
        // Minimal glass style for tags
        return 'bg-white/40 dark:bg-white/10 text-slate-700 dark:text-slate-200 border-white/40 dark:border-white/10';
    };

    // Common container classes for Glassmorphism
    const containerClasses = `
        group relative cursor-pointer overflow-hidden
        rounded-3xl border border-white/40 dark:border-white/10
        bg-white/60 dark:bg-white/5 backdrop-blur-xl
        shadow-lg hover:shadow-2xl transition-all duration-500
        hover:-translate-y-1 hover:border-white/60 dark:hover:border-white/20
    `;

    // Variant: Stacked (Modern Grid Item)
    if (variant === 'stacked') {
        const hasImage = board.backgroundImage || board.thumbnail;
        return (
            <div
                onClick={() => !isTrashView && onSelect(board.id)}
                className={`
                    ${containerClasses}
                    flex flex-col h-full
                    ${shouldAnimate ? 'animate-fade-in-up' : ''}
                    ${isTrashView ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}
                `}
                style={shouldAnimate ? { animationDelay: `${index * 50}ms` } : {}}>

                {/* Top Half - Visual/Image Area */}
                <div className="relative w-full aspect-[16/10] overflow-hidden rounded-t-3xl border-b border-white/10">
                    {hasImage ? (
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                            style={{ backgroundImage: `url(${board.backgroundImage || board.thumbnail})` }}
                        />
                    ) : board.summary ? (
                        // Glass Gradient Variant for Summary Cards
                        <div className={`absolute inset-0 transition-all duration-500 bg-gradient-to-br from-indigo-50/50 via-white/50 to-pink-50/50 dark:from-indigo-900/30 dark:via-purple-900/20 dark:to-pink-900/30`}>
                            {/* Abstract decorative shapes */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                            {/* Summary Content Center */}
                            <div className="relative z-10 h-full flex flex-col justify-center items-center px-6">
                                <div className="flex flex-wrap justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                    {(typeof board.summary === 'string' ? board.summary : board.summary.summary)
                                        .split(' · ')
                                        .slice(0, 3)
                                        .map((tag, i) => (
                                            <span key={i} className={`
                                            px-2.5 py-1 rounded-lg text-[10px] font-medium tracking-wide border backdrop-blur-sm
                                            ${getTagColor(tag)}
                                        `}>
                                                {tag}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${getRandomGradient(board.id)} opacity-40`} />
                    )}

                    {/* Subtle Overlay */}
                    <div className="absolute inset-0 bg-white/10 dark:bg-black/10 group-hover:bg-transparent transition-colors duration-500" />

                    {/* Actions Overlay */}
                    {!isTrashView && (
                        <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                            <button
                                onClick={(e) => handleImageButtonClick(e, board.id)}
                                disabled={generatingBoardId === board.id}
                                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white/40 transition-colors"
                            >
                                {generatingBoardId === board.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(board.id);
                                }}
                                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom Half - Info */}
                <div className="p-5 flex flex-col gap-2 relative bg-white/40 dark:bg-black/5 h-full">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 font-inter-tight tracking-tight">
                            {board.name}
                        </h3>
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/40 dark:bg-white/5 border border-white/20">
                            <span className={`w-1.5 h-1.5 rounded-full ${board.cardCount > 0 ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-neutral-600'}`} />
                            <span>{board.cardCount || 0} Cards</span>
                        </div>
                        <span className="opacity-70">{new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>

                {/* Trash View Footer */}
                {isTrashView && (
                    <div className="absolute bottom-0 inset-x-0 bg-red-50/90 dark:bg-red-900/90 backdrop-blur-sm p-2 flex justify-between items-center z-30">
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-200 flex items-center gap-1 ml-2">
                            <Clock size={10} /> {getDaysRemaining(board.deletedAt)}d left
                        </span>
                        <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); onRestore(board.id); }} className="p-1.5 hover:bg-white/50 rounded-md text-emerald-600"><RotateCcw size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onRequestPermanentDelete(board.id); }} className="p-1.5 hover:bg-white/50 rounded-md text-red-600"><Trash2 size={14} /></button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Variant: Overlay (Recently Visited) - Streamlined Glass
    return (
        <div
            onClick={() => !isTrashView && onSelect(board.id)}
            style={shouldAnimate ? { animationDelay: `${index * 50}ms` } : {}}
            className={`
                ${containerClasses}
                h-[200px] w-full
            `}
        >
            {/* Background Layer */}
            {board.backgroundImage || board.thumbnail ? (
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-90"
                    style={{ backgroundImage: `url(${board.backgroundImage || board.thumbnail})` }}
                />
            ) : board.summary ? (
                // Soft Abstract Gradient for Summary
                <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                </div>
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${getRandomGradient(board.id)} opacity-40`} />
            )}

            {/* Glass Overlay Content */}
            <div className="absolute inset-0 flex flex-col p-6 z-10">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug line-clamp-2 drop-shadow-sm mix-blend-hard-light">
                            {board.name}
                        </h3>
                        {/* Decorative Underline */}
                        <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-60" />
                    </div>

                    {/* Action Icon */}
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-slate-800 dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:rotate-[-45deg] hover:bg-white/40">
                        <ArrowRight size={16} />
                    </div>
                </div>

                {/* Body - Tags (if summary) */}
                {board.summary && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {board.summary.summary.split(' · ').slice(0, 3).map((tag, i) => (
                            <span key={i} className={`
                                    px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md
                                    bg-white/30 border-white/30 text-slate-800 dark:text-white dark:bg-white/10
                                `}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer Meta */}
                <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest bg-white/30 dark:bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
                        {new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>

                    {!isTrashView && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                            <button
                                onClick={(e) => handleImageButtonClick(e, board.id)}
                                disabled={generatingBoardId === board.id}
                                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-slate-700 dark:text-white flex items-center justify-center hover:bg-white/40 transition-colors"
                            >
                                {generatingBoardId === board.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(board.id);
                                }}
                                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-slate-700 dark:text-white flex items-center justify-center hover:bg-red-500/80 hover:text-white transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Gradient Overlay for text readability on images */}
            {(board.backgroundImage || board.thumbnail) && (
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/20 to-transparent dark:from-black/80 dark:via-black/20 pointer-events-none" />
            )}
        </div>
    );
}
