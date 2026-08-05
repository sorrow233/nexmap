import React from 'react';
import { CheckSquare2, Square, Trash2, X } from 'lucide-react';

const replaceCount = (template, count, fallback) => (
    typeof template === 'string'
        ? template.replace('{count}', String(count))
        : fallback
);

export default function MessageBatchDeleteBar({
    selectedCount,
    totalCount,
    onToggleAll,
    onCancel,
    onDelete,
    copy = {},
    mobileMode = false
}) {
    const allSelected = totalCount > 0 && selectedCount === totalCount;
    const selectedLabel = replaceCount(
        copy.selectedMessages,
        selectedCount,
        `已选 ${selectedCount} 条`
    );

    return (
        <div
            className={`shrink-0 border-t border-slate-200/80 bg-white/95 dark:border-white/10 dark:bg-slate-950/95 ${mobileMode
                ? 'px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3'
                : 'px-6 py-4 sm:px-10'
                }`}
            role="toolbar"
            aria-label={copy.selectionToolbar || '消息删除选择'}
        >
            <div className="mx-auto flex w-full max-w-6xl items-center gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {selectedLabel}
                    </p>
                    {!mobileMode && (
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            {copy.selectionHint || '点击消息继续选择'}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onToggleAll}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                    aria-pressed={allSelected}
                >
                    {allSelected ? <CheckSquare2 size={16} /> : <Square size={16} />}
                    <span className={mobileMode ? 'sr-only sm:not-sr-only' : ''}>
                        {allSelected ? (copy.deselectAll || '取消全选') : (copy.selectAll || '全选')}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                >
                    <X size={16} />
                    <span className={mobileMode ? 'sr-only sm:not-sr-only' : ''}>{copy.cancel || '取消'}</span>
                </button>

                <button
                    type="button"
                    onClick={onDelete}
                    disabled={selectedCount === 0}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
                >
                    <Trash2 size={16} />
                    <span>{copy.deleteSelected || '删除'}</span>
                </button>
            </div>
        </div>
    );
}
