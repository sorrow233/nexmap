import React from 'react';
import { Plus, Search, Sparkles, Trash2, Copy, Filter, ArrowUpDown, XCircle } from 'lucide-react';
import {
    FILTER_OPTIONS,
    getInstructionDisplayTitle,
    getInstructionSnippet
} from './helpers';

const SORT_OPTIONS = [
    { id: 'updated_desc', label: '最近更新' },
    { id: 'created_desc', label: '最新创建' },
    { id: 'title_asc', label: '标题 A-Z' },
    { id: 'updated_asc', label: '最早更新' }
];

export default function InstructionListPanel({
    t,
    items = [],
    activeId,
    query,
    filter,
    sort,
    onQueryChange,
    onFilterChange,
    onSortChange,
    onSelect,
    onAddInstruction,
    onDuplicateInstruction,
    onRemoveInstruction,
    onClearEmptyInstructions,
    summary,
    isEmptyState = false
}) {
    return (
        <section className="rounded-[26px] border border-[#eee3d7] bg-[rgba(255,252,247,0.92)] p-4 dark:border-slate-800/80 dark:bg-[#141c26]/90">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[#4a3e33] dark:text-slate-100">
                    {t.settings?.customInstructions || '自定义指令'}
                </h4>
                <button
                    onClick={onAddInstruction}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#efb65a] px-3 py-1.5 text-xs font-semibold text-[#332412] transition-colors hover:bg-[#f3bf6c]"
                >
                    <Plus size={12} />
                    {t.settings?.addInstruction || '新增指令'}
                </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
                <span className="rounded-xl bg-[#f4eee6] px-2 py-1 text-[#7d6c5a] dark:bg-[#17202c] dark:text-slate-200">
                    {(t.settings?.instructionMetricTotal || '总数')} {summary?.total ?? 0}
                </span>
                <span className="rounded-xl bg-[#f8f2e8] px-2 py-1 text-[#8d6d49] dark:bg-[#17202c] dark:text-slate-200">
                    {(t.settings?.instructionMetricEnabled || '已启用')} {summary?.enabled ?? 0}
                </span>
                <span className="rounded-xl bg-[#edf5ee] px-2 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {(t.settings?.instructionMetricGlobal || '全局')} {summary?.global ?? 0}
                </span>
                <span className="rounded-xl bg-[#fbf3e7] px-2 py-1 text-[#b17d31] dark:bg-amber-500/10 dark:text-amber-200">
                    {(t.settings?.instructionMetricEmpty || '空内容')} {summary?.empty ?? 0}
                </span>
            </div>

            <div className="space-y-2">
                <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#baa996]" />
                    <input
                        value={query}
                        onChange={(e) => onQueryChange?.(e.target.value)}
                        placeholder={t.settings?.canvasInstructionOpenSettings ? '搜索标题或正文...' : '搜索...'}
                        className="w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] py-2 pl-8 pr-3 text-xs text-[#5d503f] outline-none transition-colors focus:border-[#e7d4bb] dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                        <Filter size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#baa996]" />
                        <select
                            value={filter}
                            onChange={(e) => onFilterChange?.(e.target.value)}
                            className="w-full appearance-none rounded-2xl border border-[#eee3d7] bg-[#fffdf9] py-2 pl-7 pr-2 text-xs text-[#5d503f] outline-none transition-colors focus:border-[#e7d4bb] dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                        >
                            {FILTER_OPTIONS.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.fallback}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <ArrowUpDown size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#baa996]" />
                        <select
                            value={sort}
                            onChange={(e) => onSortChange?.(e.target.value)}
                            className="w-full appearance-none rounded-2xl border border-[#eee3d7] bg-[#fffdf9] py-2 pl-7 pr-2 text-xs text-[#5d503f] outline-none transition-colors focus:border-[#e7d4bb] dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                        >
                            {SORT_OPTIONS.map(option => (
                                <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {query && (
                        <button
                            onClick={() => onQueryChange?.('')}
                            className="inline-flex items-center gap-1 rounded-full border border-[#eadfce] bg-[#fffaf4] px-2.5 py-1 text-[11px] text-[#6d5d4d] transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <XCircle size={11} />
                            清空搜索
                        </button>
                    )}
                    <button
                        onClick={onClearEmptyInstructions}
                        disabled={(summary?.empty || 0) === 0}
                        className="inline-flex items-center gap-1 rounded-full border border-[#eed8ae] bg-[#fbf3e7] px-2.5 py-1 text-[11px] font-semibold text-[#b17d31] transition-colors hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
                    >
                        <Trash2 size={11} />
                        清理空白
                    </button>
                </div>
            </div>

            <div className="mt-3 max-h-[460px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {items.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500 dark:border-white/15 dark:text-slate-300">
                        {isEmptyState
                            ? (t.settings?.customInstructionsEmpty || '还没有任何自定义指令，点击右上角“新增指令”开始。')
                            : '当前筛选条件下没有匹配项'}
                    </div>
                )}

                {items.map((item, idx) => {
                    const isActive = item.id === activeId;
                    const isEmpty = !String(item.content || '').trim();
                    const title = getInstructionDisplayTitle(item, t.settings?.canvasInstructionUntitled || '未命名指令');
                    const snippet = getInstructionSnippet(item);

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelect?.(item.id)}
                            className={`group w-full rounded-xl border px-3 py-2 text-left transition-all ${isActive
                                ? 'border-[#eadbc9] bg-[#fffaf3] shadow-[0_10px_24px_rgba(93,75,52,0.08)] dark:border-slate-600/70 dark:bg-[#1b2430] dark:shadow-[0_14px_28px_rgba(2,6,23,0.42)]'
                                : 'border-[#eee3d7] bg-[#fffdf9] hover:bg-white dark:border-white/10 dark:bg-slate-900/30 dark:hover:border-white/20'
                                }`}
                        >
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-[#4a3e33] dark:text-slate-100">
                                    #{idx + 1} {title}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <span
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onDuplicateInstruction?.(item.id);
                                        }}
                                        className="rounded-md p-1 text-[#b0a08e] hover:bg-[#f8f1e6] hover:text-[#8d6d49] dark:hover:bg-slate-800"
                                        title="复制"
                                    >
                                        <Copy size={12} />
                                    </span>
                                    <span
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onRemoveInstruction?.(item.id);
                                        }}
                                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                                        title="删除"
                                    >
                                        <Trash2 size={12} />
                                    </span>
                                </div>
                            </div>
                            <p className="line-clamp-2 text-[11px] leading-relaxed text-[#8f7e6b] dark:text-slate-300">
                                {snippet}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${item.enabled !== false
                                    ? 'bg-[#f8f2e8] text-[#8d6d49] dark:bg-[#17202c] dark:text-slate-200'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                    {item.enabled !== false ? '启用' : '停用'}
                                </span>
                                {item.isGlobal === true && (
                                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                                        全局
                                    </span>
                                )}
                                {isEmpty && (
                                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                                        空内容
                                    </span>
                                )}
                                {item.isGlobal !== true && item.enabled !== false && !isEmpty && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-[#f4eee6] px-1.5 py-0.5 text-[10px] font-semibold text-[#7d6c5a] dark:bg-slate-800 dark:text-slate-300">
                                        <Sparkles size={10} />
                                        画布可选
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
