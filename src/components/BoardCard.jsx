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

                {/* Image Section (Top Half) */}
                <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-[#111]">
                    {hasImage ? (
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                            style={{ backgroundImage: `url(${board.backgroundImage || board.thumbnail})` }}
                        />
                    ) : board.summary ? (
                        // DEBUG: Bright colors to test visibility
                        <div className="absolute inset-0 bg-yellow-400 flex items-center justify-center p-4 z-50">
                            <p className="text-lg text-red-600 font-bold text-center">
                                {typeof board.summary === 'string'
                                    ? board.summary
                                    : (board.summary.summary || `RAW: ${JSON.stringify(board.summary).slice(0, 80)}`)}
                            </p>
                        </div>
                    ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${getRandomGradient(board.id)} opacity-50`} />
                    )}

                    {/* Overlay Gradient for Text Readability or Style */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent dark:from-black/40" />

                    {/* Quick Actions Overlay */}
                    {!isTrashView && (
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">

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
            {/* Background */}
            {board.backgroundImage || board.thumbnail ? (
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                    style={{ backgroundImage: `url(${board.backgroundImage || board.thumbnail})` }}
                />
            ) : board.summary ? (
                // AI Text Cover Variant v2.0 (Premium Dark Glass)
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.02] bg-[#050505]">

                    {/* 1. Dynamic Ambient Background */}
                    <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${{
                        'blue': 'from-blue-900/40 via-slate-950 to-black',
                        'purple': 'from-purple-900/40 via-slate-950 to-black',
                        'emerald': 'from-emerald-900/40 via-slate-950 to-black',
                        'orange': 'from-orange-900/40 via-slate-950 to-black',
                        'pink': 'from-pink-900/40 via-slate-950 to-black',
                        'slate': 'from-slate-800/40 via-slate-950 to-black',
                    }[board.summary.theme || 'slate']
                        }`} />

                    {/* 2. Spotlight / Northern Lights Effect */}
                    <div className={`absolute -top-1/2 -right-1/2 w-[200%] h-[200%] opacity-20 blur-[100px] bg-[conic-gradient(at_center,var(--tw-gradient-stops))] ${board.summary.theme === 'orange' ? 'from-orange-600 via-amber-900/20 to-transparent' :
                        board.summary.theme === 'emerald' ? 'from-emerald-600 via-teal-900/20 to-transparent' :
                            board.summary.theme === 'pink' ? 'from-pink-600 via-rose-900/20 to-transparent' :
                                board.summary.theme === 'purple' ? 'from-purple-600 via-violet-900/20 to-transparent' :
                                    'from-blue-600 via-indigo-900/20 to-transparent'
                        } animate-slow-spin-slower pointer-events-none group-hover:opacity-30 transition-opacity duration-700`} />

                    {/* 3. Noise Texture */}
                    <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

                    {/* 4. Glass Surface & Border */}
                    <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl pointer-events-none group-hover:ring-white/20 transition-all duration-500" />
                    <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 box-shadow-inner ${board.summary.theme === 'orange' ? 'shadow-[inset_0_0_80px_rgba(249,115,22,0.1)]' :
                        board.summary.theme === 'emerald' ? 'shadow-[inset_0_0_80px_rgba(16,185,129,0.1)]' :
                            board.summary.theme === 'pink' ? 'shadow-[inset_0_0_80px_rgba(236,72,153,0.1)]' :
                                board.summary.theme === 'purple' ? 'shadow-[inset_0_0_80px_rgba(168,85,247,0.1)]' :
                                    'shadow-[inset_0_0_80px_rgba(59,130,246,0.1)]'
                        }`} />

                    {/* 5. Content Layout */}
                    <div className="relative z-10 flex flex-col h-full p-6">

                        {/* Header: Title */}
                        <div className="mb-4">
                            <h3 className="text-[1.6rem] leading-[1.1] font-bold tracking-tight text-white/95 font-inter-tight drop-shadow-md line-clamp-2">
                                {board.name}
                            </h3>
                            {/* Decorative Accent Line */}
                            <div className={`mt-4 h-[2px] w-12 rounded-full bg-gradient-to-r opacity-80 ${board.summary.theme === 'orange' ? 'from-orange-400 to-amber-500 shadow-[0_0_10px_rgba(251,146,60,0.5)]' :
                                board.summary.theme === 'emerald' ? 'from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]' :
                                    board.summary.theme === 'pink' ? 'from-pink-400 to-rose-500 shadow-[0_0_10px_rgba(244,114,182,0.5)]' :
                                        board.summary.theme === 'purple' ? 'from-purple-400 to-violet-500 shadow-[0_0_10px_rgba(192,132,252,0.5)]' :
                                            'from-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(96,165,250,0.5)]'
                                }`} />
                        </div>

                        {/* Body: AI Summary */}
                        <p className="text-[13px] font-medium text-white/70 leading-[1.6] line-clamp-4 mix-blend-plus-lighter tracking-wide">
                            {board.summary.summary}
                        </p>

                        {/* Footer: Meta & Actions */}
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                    {new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-[10px] font-bold text-white/30 tracking-[0.2em]">{board.cardCount || 0} ITEMS</span>
                            </div>

                            {/* Quick Actions (Visually integrated) */}
                            {!isTrashView && (
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">

                                    <button
                                        onClick={(e) => handleImageButtonClick(e, board.id)}
                                        disabled={generatingBoardId === board.id}
                                        aria-label="Generate Summary"
                                        title="Generate Text Summary"
                                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all border border-transparent hover:border-white/10"
                                    >
                                        {generatingBoardId === board.id ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(board.id);
                                        }}
                                        aria-label="Delete"
                                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 flex items-center justify-center transition-all border border-transparent hover:border-red-500/20"
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
