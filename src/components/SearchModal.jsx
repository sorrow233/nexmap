import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, X, FileText, ArrowRight, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * SearchModal - 全局搜索弹窗
 * 支持 Cmd/Ctrl + K 快捷键触发
 * 跨画板搜索卡片内容
 */
export default function SearchModal({ isOpen, onClose, boardsList, allBoardsData }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Search logic
    const performSearch = useCallback((searchQuery) => {
        if (!searchQuery.trim() || !allBoardsData) {
            setResults([]);
            return;
        }

        const lowerQuery = searchQuery.toLowerCase();
        const searchResults = [];

        // Search through all boards
        Object.entries(allBoardsData).forEach(([boardId, boardData]) => {
            const board = boardsList.find(b => b.id === boardId);
            const boardName = board?.name || 'Untitled Board';

            // Search cards in this board
            if (boardData.cards) {
                boardData.cards.forEach(card => {
                    const content = card.data?.content || '';
                    const title = card.data?.title || '';

                    if (content.toLowerCase().includes(lowerQuery) ||
                        title.toLowerCase().includes(lowerQuery)) {
                        searchResults.push({
                            type: 'card',
                            boardId,
                            boardName,
                            cardId: card.id,
                            title: title || content.slice(0, 50) + (content.length > 50 ? '...' : ''),
                            snippet: getSnippet(content, lowerQuery),
                            matchType: title.toLowerCase().includes(lowerQuery) ? 'title' : 'content'
                        });
                    }
                });
            }
        });

        // Also search board names
        boardsList.forEach(board => {
            if (board.name?.toLowerCase().includes(lowerQuery)) {
                searchResults.unshift({
                    type: 'board',
                    boardId: board.id,
                    boardName: board.name,
                    title: board.name,
                    snippet: `画板 · ${board.cards?.length || 0} 卡片`
                });
            }
        });

        // Limit results
        setResults(searchResults.slice(0, 10));
        setSelectedIndex(0);
    }, [allBoardsData, boardsList]);

    // Get snippet around match
    const getSnippet = (content, query) => {
        const index = content.toLowerCase().indexOf(query);
        if (index === -1) return content.slice(0, 80);

        const start = Math.max(0, index - 30);
        const end = Math.min(content.length, index + query.length + 50);
        let snippet = content.slice(start, end);

        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet += '...';

        return snippet;
    };

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 150);
        return () => clearTimeout(timer);
    }, [query, performSearch]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleResultClick(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [results, selectedIndex, onClose]);

    // Handle result click
    const handleResultClick = useCallback((result) => {
        if (result.type === 'board') {
            navigate(`/board/${result.boardId}`);
        } else if (result.type === 'card') {
            // Navigate to board and potentially highlight card
            navigate(`/board/${result.boardId}?highlight=${result.cardId}`);
        }
        onClose();
    }, [navigate, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <Search size={20} className="text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="搜索卡片、画板..."
                        className="flex-1 bg-transparent text-lg outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">ESC</kbd>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto">
                    {results.length === 0 && query && (
                        <div className="px-4 py-8 text-center text-slate-400">
                            没有找到匹配结果
                        </div>
                    )}

                    {results.length === 0 && !query && (
                        <div className="px-4 py-8 text-center text-slate-400">
                            <p>输入关键词搜索所有画板</p>
                            <div className="flex items-center justify-center gap-2 mt-3 text-xs">
                                <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                    <Command size={12} /> K
                                </kbd>
                                <span>打开搜索</span>
                            </div>
                        </div>
                    )}

                    {results.map((result, index) => (
                        <button
                            key={`${result.boardId}-${result.cardId || 'board'}`}
                            onClick={() => handleResultClick(result)}
                            className={`
                                w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                                ${index === selectedIndex
                                    ? 'bg-blue-50 dark:bg-blue-900/30'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }
                            `}
                        >
                            <div className={`
                                mt-0.5 p-1.5 rounded-lg
                                ${result.type === 'board'
                                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'
                                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600'
                                }
                            `}>
                                <FileText size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                                    {result.title}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                    {result.type === 'card' && (
                                        <span className="text-slate-400">in {result.boardName} · </span>
                                    )}
                                    {result.snippet}
                                </div>
                            </div>
                            <ArrowRight size={16} className="mt-1 text-slate-300 flex-shrink-0" />
                        </button>
                    ))}
                </div>

                {/* Footer */}
                {results.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 flex items-center gap-4">
                        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↑↓</kbd> 导航</span>
                        <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">Enter</kbd> 打开</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Hook for global search shortcut
 */
export function useSearchShortcut(callback) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                callback();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [callback]);
}
