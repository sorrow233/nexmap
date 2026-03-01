import { ArrowRight, Trash2, Loader2, Image as ImageIcon, RotateCcw, Clock } from 'lucide-react';
import { optimizeImageUrl } from '../utils/imageOptimizer';
import { useLanguage } from '../contexts/LanguageContext';
import { getBoardDisplayName } from '../services/boardTitle/metadata';

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
    shouldAnimate = true
}) {
    const { t } = useLanguage();
    const displayName = getBoardDisplayName(board, t.gallery?.untitledBoard || 'Untitled Board');

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
        // Fresh, modern gradients - light mode friendly with dark mode variants
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

    // Helper for diverse tag colors (Modern, Fresh, Elegant)
    const getTagColor = (tag) => {
        const colors = [
            'bg-sky-50 text-sky-700 border-sky-200/50',       // Fresh Sky
            'bg-indigo-50 text-indigo-700 border-indigo-200/50', // Elegant Indigo
            'bg-emerald-50 text-emerald-700 border-emerald-200/50', // Nature Emerald
            'bg-rose-50 text-rose-700 border-rose-200/50',    // Soft Rose
            'bg-violet-50 text-violet-700 border-violet-200/50', // Deep Violet
            'bg-amber-50 text-amber-700 border-amber-200/50',  // Warm Amber
            'bg-teal-50 text-teal-700 border-teal-200/50',    // Clean Teal
        ];
        // Simple hash to generate consistent color for same tag
        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
            hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // Variant: Stacked (Modern Grid Item)
    if (variant === 'stacked') {
        const hasImage = board.backgroundImage || board.thumbnail;
        return (
            <div
                onClick={() => !isTrashView && onSelect(board.id)}
                className={`
                    group relative flex flex-col cursor-pointer transition-all duration-300 ${shouldAnimate ? 'animate-fade-in-up' : ''}
                    rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden
                    hover:shadow-2xl hover:border-cyan-500/30 dark:hover:border-cyan-400/30 hover:-translate-y-1
                    bg-white dark:bg-[#0A0A0A]
                    ${isTrashView ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}
                `}
                style={shouldAnimate ? { animationDelay: `${index * 50}ms` } : {}}>

                {/* Image Section (Top Half) */}
                <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-[#111]">
                    {hasImage ? (
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                            style={{ backgroundImage: `url(${optimizeImageUrl(board.backgroundImage || board.thumbnail, 600)})` }}
                        />
                    ) : board.summary ? (
                        // Neural Clay Text Card Variant v3.0 (Stacked)
                        <div className={`absolute inset-0 transition-all duration-500 ${
                            // Theme-based Pastel Backgrounds
                            {
                                'blue': 'bg-[#eff6ff]',    // blue-50
                                'purple': 'bg-[#f5f3ff]',  // violet-50
                                'emerald': 'bg-[#ecfdf5]', // emerald-50
                                'orange': 'bg-[#fff7ed]',  // orange-50
                                'pink': 'bg-[#fdf2f8]',    // pink-50
                                'slate': 'bg-[#f8fafc]',   // slate-50
                            }[board.summary.theme || 'slate']
                            }`}>

                            {/* Soft Inner Shadow (Clay Effect) */}
                            <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]" />

                            {/* Content - Concept Pills */}
                            <div className="relative z-10 h-full flex flex-col justify-center px-6">
                                <div className="flex flex-wrap justify-center gap-2">
                                    {(typeof board.summary === 'string' ? board.summary : board.summary.summary)
                                        .split(' · ')
                                        .slice(0, 4) // Limit to top 4 tags for stacked/compact view
                                        .map((tag, i) => (
                                            <span key={i} className={`
                                            px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm border
                                            ${getTagColor(tag)}
                                        `}>
                                                {tag}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${getRandomGradient(board.id)} opacity-50`} />
                    )}

                    {/* Overlay Gradient for Text Readability or Style */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent dark:from-black/40" />

                    {/* Quick Actions Overlay */}
                    {!isTrashView && (
                        <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">

                            <button
                                onClick={(e) => handleImageButtonClick(e, board.id)}
                                disabled={generatingBoardId === board.id}
                                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors"
                            >
                                {generatingBoardId === board.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                            </button>

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
                            {displayName}
                        </h3>
                    </div>

                    <div className="mt-auto flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${board.cardCount > 0 ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-neutral-700'}`} />
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
            {/* Background */}
            {board.backgroundImage || board.thumbnail ? (
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                    style={{ backgroundImage: `url(${optimizeImageUrl(board.backgroundImage || board.thumbnail, 600)})` }}
                />
            ) : board.summary ? (
                // Neural Clay Text Card Variant v3.0 (Soft & Tactile)
                <div className={`absolute inset-0 transition-all duration-500 group-hover:-translate-y-1 ${
                    // Theme-based Pastel Backgrounds
                    {
                        'blue': 'bg-[#eff6ff]',    // blue-50
                        'purple': 'bg-[#f5f3ff]',  // violet-50
                        'emerald': 'bg-[#ecfdf5]', // emerald-50
                        'orange': 'bg-[#fff7ed]',  // orange-50
                        'pink': 'bg-[#fdf2f8]',    // pink-50
                        'slate': 'bg-[#f8fafc]',   // slate-50
                    }[board.summary.theme || 'slate']
                    }`}>

                    {/* Soft Inner Shadow (Clay Effect) */}
                    <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_40px_rgba(0,0,0,0.02)] ring-1 ring-black/5" />

                    {/* Content Layout */}
                    <div className="relative z-10 flex flex-col h-full p-6">

                        {/* Header: Title */}
                        <div className="mb-4">
                            <h3 className="text-xl font-bold tracking-tight text-slate-800 leading-snug line-clamp-2">
                                {displayName}
                            </h3>
                            {/* Decorative underline */}
                            <div className={`mt-3 h-1 w-8 rounded-full opacity-30 ${{
                                'blue': 'bg-blue-500',
                                'purple': 'bg-violet-500',
                                'emerald': 'bg-emerald-500',
                                'orange': 'bg-orange-500',
                                'pink': 'bg-pink-500',
                                'slate': 'bg-slate-500'
                            }[board.summary.theme || 'slate']
                                }`} />
                        </div>

                        {/* Body: Concept Pills */}
                        <div className="flex flex-wrap gap-2 content-start">
                            {board.summary.summary.split(' · ').map((tag, i) => (
                                <span key={i} className={`
                                    px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-sm border
                                    ${getTagColor(tag)}
                                `}>
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Footer: Meta & Actions */}
                        <div className="mt-auto flex items-center justify-between pt-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>

                            {/* Quick Actions (Clay Buttons) */}
                            {!isTrashView && (
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                    <button
                                        onClick={(e) => handleImageButtonClick(e, board.id)}
                                        disabled={generatingBoardId === board.id}
                                        className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-cyan-500 shadow-sm hover:shadow-md transition-all flex items-center justify-center border border-slate-100"
                                    >
                                        {generatingBoardId === board.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(board.id);
                                        }}
                                        className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-red-500 shadow-sm hover:shadow-md transition-all flex items-center justify-center border border-slate-100"
                                    >
                                        <Trash2 size={14} />
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
                    <h3 className="text-white font-bold truncate text-base mb-1 group-hover:text-cyan-200 transition-colors font-inter-tight">
                        {displayName}
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
