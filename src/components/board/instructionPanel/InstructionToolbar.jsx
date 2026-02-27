import React from 'react';
import { Search, Sparkles, XCircle } from 'lucide-react';

const FILTER_OPTIONS = [
    { id: 'all', label: '全部' },
    { id: 'enabled', label: '已启用' },
    { id: 'recommended', label: 'AI 推荐' },
    { id: 'disabled', label: '未启用' }
];

export default function InstructionToolbar({
    query,
    onQueryChange,
    filter,
    onFilterChange,
    optionalCount = 0,
    visibleCount = 0,
    enabledCount = 0,
    autoCount = 0,
    onEnableAll,
    onDisableAll,
    onApplyAuto
}) {
    return (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 md:text-sm">
                <span className="rounded-lg bg-slate-800/80 px-2 py-1">
                    可选 {optionalCount}
                </span>
                <span className="rounded-lg bg-slate-800/80 px-2 py-1">
                    可见 {visibleCount}
                </span>
                <span className="rounded-lg bg-cyan-400/15 px-2 py-1 text-cyan-100">
                    已启用 {enabledCount}
                </span>
                <span className="rounded-lg bg-emerald-400/15 px-2 py-1 text-emerald-100">
                    AI 推荐 {autoCount}
                </span>
            </div>

            <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={query}
                    onChange={(e) => onQueryChange?.(e.target.value)}
                    placeholder="搜索标题或内容..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-300/50 focus:outline-none"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {FILTER_OPTIONS.map(option => (
                    <button
                        key={option.id}
                        onClick={() => onFilterChange?.(option.id)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors md:text-sm ${filter === option.id
                            ? 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100'
                            : 'border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800'
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={onEnableAll}
                    className="rounded-lg border border-cyan-300/35 bg-cyan-400/15 px-3 py-1.5 text-xs font-bold text-cyan-100 transition-colors hover:bg-cyan-400/25 md:text-sm"
                >
                    全选可选
                </button>
                <button
                    onClick={onDisableAll}
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 md:text-sm"
                >
                    清空选择
                </button>
                <button
                    onClick={onApplyAuto}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/35 bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-100 transition-colors hover:bg-emerald-400/25 md:text-sm"
                >
                    <Sparkles size={12} />
                    应用 AI 推荐
                </button>
                {query && (
                    <button
                        onClick={() => onQueryChange?.('')}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800 md:text-sm"
                    >
                        <XCircle size={12} />
                        清除搜索
                    </button>
                )}
            </div>
        </div>
    );
}
