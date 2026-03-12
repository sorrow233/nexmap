import React, { useMemo } from 'react';
import { RefreshCw, Sprout, Star, Trash2, X } from 'lucide-react';

export default function MobileBoardSelectionBar({
    cards,
    selectedIds,
    onClearSelection,
    onOpenSelection,
    onQuickSprout,
    onExpandTopics,
    onDeleteSelection
}) {
    const selectedCards = useMemo(
        () => cards.filter((card) => selectedIds.includes(card.id)),
        [cards, selectedIds]
    );

    const canExpandTopics = selectedCards.length === 1 && (selectedCards[0]?.data?.marks?.length || 0) > 0;

    if (selectedIds.length === 0) return null;

    return (
        <div className="fixed inset-x-0 z-40 px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 8.5rem)' }}>
            <div className="rounded-[1.6rem] border border-cyan-100/70 bg-white/92 p-3 shadow-[0_20px_60px_-32px_rgba(6,182,212,0.45)] backdrop-blur-xl dark:border-cyan-500/20 dark:bg-slate-950/86">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                            编辑模式
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            已选中 {selectedIds.length} 张卡片
                        </div>
                    </div>
                    <button
                        onClick={onClearSelection}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 active:scale-95 dark:bg-white/5 dark:text-slate-200"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <ActionButton icon={RefreshCw} label="打开" onClick={onOpenSelection} />
                    <ActionButton icon={Sprout} label="发散" onClick={onQuickSprout} />
                    <ActionButton icon={Star} label="展开" onClick={onExpandTopics} disabled={!canExpandTopics} />
                    <ActionButton icon={Trash2} label="删除" onClick={onDeleteSelection} danger />
                </div>
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label, onClick, disabled = false, danger = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-xs font-bold transition-all active:scale-95 ${danger
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200'
                : 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-100'
                } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
        >
            <Icon size={18} />
            {label}
        </button>
    );
}
