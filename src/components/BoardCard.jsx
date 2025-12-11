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

    // Helper for Glass Theme Styles (Restored & Modernized)
    const getThemeStyles = (themeName) => {
        const theme = themeName || 'slate';

        const styles = {
            blue: {
                bg: 'from-blue-50/80 via-white/50 to-indigo-50/80 dark:from-blue-900/30 dark:via-slate-900/20 dark:to-indigo-900/30',
                border: 'border-blue-400/50 dark:border-blue-400/30 ring-1 ring-blue-400/20',
                blob1: 'bg-blue-400/20',
                blob2: 'bg-indigo-400/20',
                tag: 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-100 border-blue-200/50 dark:border-blue-700/30',
                text: 'text-blue-900 dark:text-blue-50',
                underline: 'bg-gradient-to-r from-blue-500 to-indigo-500'
            },
            purple: {
                bg: 'from-violet-50/80 via-white/50 to-fuchsia-50/80 dark:from-violet-900/30 dark:via-slate-900/20 dark:to-fuchsia-900/30',
                border: 'border-violet-400/50 dark:border-violet-400/30 ring-1 ring-violet-400/20',
                blob1: 'bg-violet-400/20',
                blob2: 'bg-fuchsia-400/20',
                tag: 'bg-violet-100/50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-100 border-violet-200/50 dark:border-violet-700/30',
                text: 'text-violet-900 dark:text-violet-50',
                underline: 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
            },
            emerald: {
                bg: 'from-emerald-50/80 via-white/50 to-teal-50/80 dark:from-emerald-900/30 dark:via-slate-900/20 dark:to-teal-900/30',
                border: 'border-emerald-400/50 dark:border-emerald-400/30 ring-1 ring-emerald-400/20',
                blob1: 'bg-emerald-400/20',
                blob2: 'bg-teal-400/20',
                tag: 'bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-100 border-emerald-200/50 dark:border-emerald-700/30',
                text: 'text-emerald-900 dark:text-emerald-50',
                underline: 'bg-gradient-to-r from-emerald-500 to-teal-500'
            },
            orange: {
                bg: 'from-orange-50/80 via-white/50 to-amber-50/80 dark:from-orange-900/30 dark:via-slate-900/20 dark:to-amber-900/30',
                border: 'border-orange-400/50 dark:border-orange-400/30 ring-1 ring-orange-400/20',
                blob1: 'bg-orange-400/20',
                blob2: 'bg-amber-400/20',
                tag: 'bg-orange-100/50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-100 border-orange-200/50 dark:border-orange-700/30',
                text: 'text-orange-900 dark:text-orange-50',
                underline: 'bg-gradient-to-r from-orange-500 to-amber-500'
            },
            pink: {
                bg: 'from-pink-50/80 via-white/50 to-rose-50/80 dark:from-pink-900/30 dark:via-slate-900/20 dark:to-rose-900/30',
                border: 'border-pink-400/50 dark:border-pink-400/30 ring-1 ring-pink-400/20',
                blob1: 'bg-pink-400/20',
                blob2: 'bg-rose-400/20',
                tag: 'bg-pink-100/50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-100 border-pink-200/50 dark:border-pink-700/30',
                text: 'text-pink-900 dark:text-pink-50',
                underline: 'bg-gradient-to-r from-pink-500 to-rose-500'
            },
            slate: {
                bg: 'from-slate-50/80 via-white/50 to-gray-50/80 dark:from-slate-800/40 dark:via-slate-900/20 dark:to-gray-800/40',
                border: 'border-slate-300/50 dark:border-slate-500/30 ring-1 ring-slate-400/20',
                blob1: 'bg-slate-400/20',
                blob2: 'bg-gray-400/20',
                tag: 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-100 border-slate-200/50 dark:border-slate-600/30',
                text: 'text-slate-900 dark:text-slate-100',
                underline: 'bg-gradient-to-r from-slate-500 to-gray-500'
            }
        };

        return styles[theme] || styles.slate;
    };

    // Helper for glass tag colors (Fallback)
    const getTagColor = (tag) => {
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

    // Unified Glass Slab Renderer
    const renderContent = (currentVariant) => {
        const hasImage = board.backgroundImage || board.thumbnail;
        const themeStyles = board.summary ? getThemeStyles(board.summary.theme) : null;
        const isOverlay = currentVariant === 'overlay';

        return (
            <div
                onClick={() => !isTrashView && onSelect(board.id)}
                className={`
                    ${containerClasses}
                    ${isOverlay ? 'h-[220px] w-full' : 'min-h-[280px] h-full flex flex-col'}
                    ${shouldAnimate ? 'animate-fade-in-up' : ''}
                    ${isTrashView ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}
                    ${themeStyles ? themeStyles.border : ''}
                `}
                style={shouldAnimate ? { animationDelay: `${index * 50}ms` } : {}}>

                {/* Background Layer (Unified for Image and Theme) */}
                <div className="absolute inset-0 z-0">
                    {hasImage ? (
                        <>
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                style={{ backgroundImage: `url(${board.backgroundImage || board.thumbnail})` }}
                            />
                            {/* Readability Overlay (Gradient) */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent dark:from-black/90 dark:via-black/30 opacity-80" />
                        </>
                    ) : (
                        <div className={`absolute inset-0 transition-all duration-500 bg-gradient-to-br ${themeStyles ? themeStyles.bg : getRandomGradient(board.id)}`}>
                            {themeStyles && (
                                <>
                                    <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 ${themeStyles.blob1}`} />
                                    <div className={`absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 ${themeStyles.blob2}`} />
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Main Content (Z-Indexed Above Background) */}
                <div className="relative z-10 flex flex-col h-full p-6">
                    {/* Header Area */}
                    <div className="flex justify-between items-start mb-2 group/header">
                        <div className="flex-1 min-w-0 pr-2">
                            <h3 className={`
                                font-bold tracking-tight line-clamp-2 font-inter-tight
                                ${isOverlay ? 'text-xl' : 'text-lg'}
                                ${hasImage ? 'text-white' : (themeStyles ? themeStyles.text : 'text-slate-800 dark:text-slate-100')}
                            `}>
                                {board.name}
                            </h3>
                            <div className={`
                                mt-2 h-1 w-10 rounded-full opacity-60
                                ${themeStyles ? themeStyles.underline : (hasImage ? 'bg-white/40' : 'bg-indigo-500/40')}
                            `} />
                        </div>

                        {/* Arrow hint for Overlay variant */}
                        {isOverlay && (
                            <div className="shrink-0 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform">
                                <ArrowRight size={14} className="-rotate-45" />
                            </div>
                        )}
                    </div>

                    {/* Summary/Tags (Visible for both types if available) */}
                    {(board.summary) && (
                        <div className="mt-3 flex flex-wrap gap-1.5 overflow-hidden max-h-[64px]">
                            {board.summary.summary.split(' · ').slice(0, 3).map((tag, i) => (
                                <span key={i} className={`
                                    px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md
                                    ${themeStyles ? themeStyles.tag : (hasImage ? 'bg-black/20 border-white/20 text-white/90' : 'bg-white/40 border-slate-200 text-slate-600')}
                                `}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Footer Meta (Push to Bottom) */}
                    <div className="mt-auto pt-6 flex items-center justify-between">
                        <div className={`
                            flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-sm transition-all duration-300
                            ${hasImage
                                ? 'bg-white/10 border-white/20 text-white/80'
                                : 'bg-white/40 dark:bg-black/20 border-white/20 text-slate-500 dark:text-neutral-400'}
                        `}>
                            <span className={`w-1.5 h-1.5 rounded-full ${board.cardCount > 0 ? (hasImage ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-indigo-500') : 'bg-slate-300'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{board.cardCount || 0} Cards</span>
                        </div>

                        <span className={`
                            text-[10px] font-bold opacity-60
                            ${hasImage ? 'text-white' : 'text-slate-500 dark:text-neutral-400'}
                        `}>
                            {new Date(board.updatedAt || board.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </div>

                {/* Actions (Floating Corner) */}
                {!isTrashView && (
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                        <button
                            onClick={(e) => handleImageButtonClick(e, board.id)}
                            disabled={generatingBoardId === board.id}
                            title="Generate Background"
                            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition-all active:scale-90"
                        >
                            {generatingBoardId === board.id ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(board.id); }}
                            title="Move to Trash"
                            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-red-500/80 transition-all active:scale-90"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                {/* Trash View Actions */}
                {isTrashView && (
                    <div className="absolute bottom-0 inset-x-0 bg-red-600/90 backdrop-blur-md p-2 flex justify-between items-center z-30">
                        <span className="text-[10px] font-bold text-white flex items-center gap-1 ml-2">
                            {getDaysRemaining(board.deletedAt)}d left
                        </span>
                        <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); onRestore(board.id); }} className="p-1.5 hover:bg-white/20 rounded-md text-white transition-colors"><RotateCcw size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onRequestPermanentDelete(board.id); }} className="p-1.5 hover:bg-white/20 rounded-md text-white transition-colors"><Trash2 size={14} /></button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return renderContent(variant);
}
