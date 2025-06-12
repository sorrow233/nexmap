import React from 'react';
import { FileText, ArrowRight, Ban, Trash2, Loader2, Image as ImageIcon, RotateCcw, Clock } from 'lucide-react';

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
    variant = 'overlay' // 'overlay' | 'stacked'
}) {
    const getDaysRemaining = (deletedAt) => {
        if (!deletedAt) return 30;
        const expiryDate = deletedAt + (30 * 24 * 60 * 60 * 1000);
        const diff = expiryDate - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    // Variant: Stacked (Zen Style)
    if (variant === 'stacked') {
        return (
            <div
                onClick={() => !isTrashView && onSelect(board.id)}
                className={`
                    group relative flex flex-col gap-4 cursor-pointer transition-all duration-500 animate-fade-in-up
                    ${isTrashView ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}
                `}
            >
                {/* Image Container - Aspect Ratio 4:3 */}
                <div className="relative w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden transition-transform duration-700 ease-out group-hover:shadow-2xl rounded-2xl">
                    {board.backgroundImage ? (
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105 saturate-[0.85] group-hover:saturate-100"
                            style={{ backgroundImage: `url(${board.backgroundImage})` }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-white/5 text-slate-200 dark:text-slate-700">
                            <div className="w-16 h-16 border border-current opacity-20 rotate-45" />
                        </div>
                    )}

                    {/* Minimal Overlay for Actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 gap-3">
                        {!isTrashView ? (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(board.id);
                                    }}
                                    className="w-10 h-10 bg-white text-slate-900 flex items-center justify-center shadow-lg hover:bg-black hover:text-white transition-colors rounded-full"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGenerateBackground(board.id);
                                    }}
                                    disabled={generatingBoardId === board.id}
                                    className="w-10 h-10 bg-white text-slate-900 flex items-center justify-center shadow-lg hover:bg-black hover:text-white transition-colors rounded-full"
                                >
                                    {generatingBoardId === board.id ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                                </button>
                            </>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onRestore(board.id); }} className="px-4 py-2 bg-white text-black text-xs font-bold tracking-widest uppercase">Restore</button>
                                <button onClick={(e) => { e.stopPropagation(); onRequestPermanentDelete(board.id); }} className="px-4 py-2 bg-red-600 text-white text-xs font-bold tracking-widest uppercase">Delete</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Typography Content */}
                <div className="flex flex-col gap-1 items-start px-1">
                    <h3 className="font-editorial text-xl text-slate-900 dark:text-white leading-tight group-hover:underline decoration-1 underline-offset-4 decoration-slate-300 dark:decoration-slate-600">
                        {board.name}
                    </h3>

                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                        <span>{new Date(board.updatedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span>{board.cardCount || 0} ITEMS</span>
                        {isTrashView && <span className="text-red-400 ml-auto flex items-center gap-1"><Clock size={10} /> {getDaysRemaining(board.deletedAt)} DAYS LEFT</span>}
                    </div>
                </div>
            </div>
        );
    }

    // Variant: Overlay (Premium Glass Style)
    return (
        <div
            onClick={() => !isTrashView && onSelect(board.id)}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`
                group relative glass-card-premium rounded-[2rem] p-8 transition-all duration-500 flex flex-col min-h-[280px] animate-fade-in-up overflow-hidden
                ${isTrashView ? 'cursor-default border-dashed border-slate-300 dark:border-white/10 opacity-70' : 'cursor-pointer hover:shadow-premium-hover hover:-translate-y-2'}
            `}
        >
            {/* Background Image or Abstract Glow */}
            {board.backgroundImage ? (
                <>
                    <div
                        key={board.backgroundImage}
                        className="absolute inset-0 bg-cover bg-center transition-all duration-700 opacity-90 group-hover:opacity-100 group-hover:scale-105 animate-fade-in"
                        style={{ backgroundImage: `url(${board.backgroundImage})` }}
                        onLoad={() => console.log(`[UI] Background loaded for board ${board.id}`)}
                        onError={(e) => console.error(`[UI] Background load ERROR for board ${board.id}. URL: ${board.backgroundImage}`)}
                    />
                    <div className="absolute inset-0 bg-black/10 dark:bg-black/20 backdrop-blur-[0.5px] transition-all duration-500 group-hover:backdrop-blur-0 group-hover:bg-transparent" />
                </>
            ) : (
                <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[60px] rounded-full transition-all duration-700 ${isTrashView ? 'bg-slate-200/20 dark:bg-white/5' : 'bg-gradient-to-br from-orange-300/08 to-pink-300/08 group-hover:from-orange-300/15 group-hover:to-pink-300/15'}`}></div>
            )}

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                    <div className={`w-14 h-14 rounded-[1.25rem] border flex items-center justify-center transition-all duration-500 shadow-sm backdrop-blur-sm ${isTrashView ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400' : 'bg-white/50 dark:bg-white/5 border-white/40 dark:border-white/5 text-slate-400 group-hover:text-orange-400 dark:group-hover:text-orange-300 group-hover:scale-110'}`}>
                        {isTrashView ? <Ban size={24} /> : <FileText size={24} />}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {!isTrashView ? (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(board.id); // Soft Delete
                                    }}
                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 shadow-sm"
                                    title="Move to Trash"
                                >
                                    <Trash2 size={20} />
                                </button>

                                {/* Generate Background Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGenerateBackground(board.id);
                                    }}
                                    disabled={generatingBoardId === board.id}
                                    className={`p-3 rounded-2xl transition-all opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 shadow-sm
                                        ${generatingBoardId === board.id
                                            ? 'bg-orange-100 text-orange-500 animate-pulse cursor-wait'
                                            : 'text-slate-300 hover:text-purple-500 hover:bg-white dark:hover:bg-slate-800'
                                        }`}
                                    title="Generate AI Background"
                                >
                                    {generatingBoardId === board.id ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRestore(board.id);
                                    }}
                                    className="p-3 text-emerald-500 bg-white dark:bg-slate-800 rounded-2xl transition-all hover:scale-110 shadow-sm border border-emerald-100 dark:border-emerald-500/20"
                                    title="Restore"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRequestPermanentDelete(board.id);
                                    }}
                                    className="p-3 text-red-500 bg-white dark:bg-slate-800 rounded-2xl transition-all hover:scale-110 shadow-sm border border-red-100 dark:border-red-500/20"
                                    title="Permanently Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="mb-4 flex flex-col gap-1">
                    <h3 className={`text-2xl font-black transition-all duration-300 leading-tight tracking-tight ${isTrashView ? 'text-slate-500 dark:text-slate-400 line-through decoration-2 decoration-slate-300 dark:decoration-slate-600' : 'text-slate-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-pink-400 dark:group-hover:from-orange-400 dark:group-hover:to-pink-300'}`}>
                        {board.name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {board.cardCount || 0} CARDS
                        </span>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-200/20 dark:border-white/5">
                    <div className="flex flex-col">
                        {isTrashView ? (
                            <>
                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">Expires In</span>
                                <span className="text-[13px] font-bold text-red-500">{getDaysRemaining(board.deletedAt)} Days</span>
                            </>
                        ) : (
                            <>
                                <span className="text-[10px] font-bold text-slate-400/80 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Last Update</span>
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">{new Date(board.updatedAt || Date.now()).toLocaleDateString()}</span>
                            </>
                        )}
                    </div>
                    {!isTrashView && (
                        <div className="w-10 h-10 rounded-full bg-white/40 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-all duration-500 -rotate-45 group-hover:rotate-0 shadow-sm backdrop-blur-sm">
                            <ArrowRight size={18} strokeWidth={2.5} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
