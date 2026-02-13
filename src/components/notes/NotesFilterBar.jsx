import React from 'react';
import { Search, BarChart3, LayoutGrid, List } from 'lucide-react';

const sortOptions = [
    { value: 'recent', labelKey: 'sortRecent' },
    { value: 'oldest', labelKey: 'sortOldest' },
    { value: 'title', labelKey: 'sortTitle' },
    { value: 'length', labelKey: 'sortLength' }
];

export default function NotesFilterBar({
    query, onQueryChange,
    boardFilter, onBoardFilterChange,
    sortMode, onSortModeChange,
    boardOptions,
    isFilterActive, onClearFilters,
    viewMode, onViewModeChange,
    labels
}) {
    return (
        <section className="rounded-[1.6rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111318] p-4 md:p-5 mb-6">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px_200px_auto_auto] gap-3 items-center">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-shadow">
                    <Search size={16} className="text-slate-400 shrink-0" />
                    <input
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder={labels.searchPlaceholder}
                        className="w-full bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                    />
                </div>

                {/* Board Filter */}
                <select
                    value={boardFilter}
                    onChange={(e) => onBoardFilterChange(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                    <option value="all">{labels.allBoards}</option>
                    {boardOptions.map(board => (
                        <option key={board.id} value={board.id}>{board.name}</option>
                    ))}
                </select>

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <BarChart3 size={15} className="text-slate-400 shrink-0" />
                    <select
                        value={sortMode}
                        onChange={(e) => onSortModeChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                    >
                        {sortOptions.map(option => (
                            <option key={option.value} value={option.value}>{labels[option.labelKey]}</option>
                        ))}
                    </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-0.5">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                            ? 'bg-white dark:bg-white/15 text-indigo-600 dark:text-indigo-300 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        title="Grid View"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                            ? 'bg-white dark:bg-white/15 text-indigo-600 dark:text-indigo-300 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        title="List View"
                    >
                        <List size={16} />
                    </button>
                </div>

                {/* Reset */}
                <button
                    onClick={onClearFilters}
                    disabled={!isFilterActive}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-40 transition-opacity"
                >
                    {labels.clearFilters}
                </button>
            </div>
        </section>
    );
}
