import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, StickyNote, ExternalLink, Copy, Trash2, PencilLine, Save, X, RefreshCw, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import notesService from '../services/notesService';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from './Toast';

const REFRESH_INTERVAL_MS = 20000;

const FALLBACK_LABELS = {
    title: 'Notes Center',
    subtitle: 'One note per board. Review, edit and keep all board notes in sync.',
    totalNotes: 'Total Notes',
    sourceBoards: 'Source Boards',
    filteredCount: 'Filtered',
    averageChars: 'Avg. Chars',
    allBoards: 'All Boards',
    sortBy: 'Sort',
    sortRecent: 'Most Recent',
    sortOldest: 'Oldest First',
    sortTitle: 'Title A-Z',
    sortLength: 'Longest First',
    searchPlaceholder: 'Search notes by title or content...',
    clearFilters: 'Reset',
    refresh: 'Refresh',
    refreshHint: 'Auto-sync every 20s',
    empty: 'No notes yet',
    emptyDesc: 'Create one note in a board and it will be listed here.',
    noMatch: 'No matching notes',
    noMatchDesc: 'Try another keyword or clear filters.',
    loadError: 'Failed to load notes index.',
    retry: 'Retry',
    openNote: 'Open Note',
    openBoard: 'Open Board',
    edit: 'Edit',
    copy: 'Copy',
    copied: 'Copied',
    delete: 'Delete',
    deleteConfirmTitle: 'Delete This Note?',
    deleteConfirmDesc: 'The note will be removed from its source board.',
    deleteConfirmAction: 'Delete Note',
    save: 'Save',
    cancel: 'Cancel',
    editorTitle: 'Edit Board Note',
    editorHint: 'Press Cmd/Ctrl + Enter to save',
    discardConfirm: 'Discard unsaved changes?',
    board: 'Board',
    updatedOn: 'Updated',
    chars: 'chars',
    lines: 'lines',
    words: 'words',
    masterNote: 'Master Note',
    stickyNote: 'Sticky Note',
    saveSuccess: 'Note saved.',
    saveFailed: 'Failed to save note.',
    copyFailed: 'Copy is unavailable in this browser.',
    deleteSuccess: 'Note deleted.',
    deleteFailed: 'Failed to delete note.',
    syncing: 'Syncing...'
};

const sortOptions = [
    { value: 'recent', labelKey: 'sortRecent' },
    { value: 'oldest', labelKey: 'sortOldest' },
    { value: 'title', labelKey: 'sortTitle' },
    { value: 'length', labelKey: 'sortLength' }
];

const formatDateTime = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const copyToClipboard = async (text) => {
    if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
    }

    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand('copy');
    document.body.removeChild(el);
    return success;
};

export default function NotesCenter({ boardsList = [], user, onUpdateBoardMetadata }) {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const toast = useToast();

    const labels = useMemo(() => ({
        ...FALLBACK_LABELS,
        ...(t.notesCenter || {})
    }), [t.notesCenter]);

    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [query, setQuery] = useState('');
    const [boardFilter, setBoardFilter] = useState('all');
    const [sortMode, setSortMode] = useState('recent');

    const [editingNote, setEditingNote] = useState(null);
    const [draftContent, setDraftContent] = useState('');
    const [pendingDeleteNote, setPendingDeleteNote] = useState(null);

    const [busyNoteId, setBusyNoteId] = useState('');
    const [copiedNoteId, setCopiedNoteId] = useState('');

    const isMountedRef = useRef(true);
    const isRefreshingRef = useRef(false);
    const refreshQueuedRef = useRef(false);
    const copyTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }
        };
    }, []);

    const refreshNotes = useCallback(async ({ background = false } = {}) => {
        if (isRefreshingRef.current) {
            refreshQueuedRef.current = true;
            return;
        }
        isRefreshingRef.current = true;

        if (background) {
            if (isMountedRef.current) setIsRefreshing(true);
        } else {
            if (isMountedRef.current) setIsLoading(true);
        }

        try {
            const nextNotes = await notesService.getNotesIndex(boardsList);
            if (isMountedRef.current) {
                setNotes(nextNotes);
                setErrorMessage('');
            }
        } catch (error) {
            console.error('[NotesCenter] Failed to refresh notes', error);
            if (isMountedRef.current) {
                setErrorMessage(labels.loadError);
            }
            if (!background && isMountedRef.current) {
                toast.error(labels.loadError);
            }
        } finally {
            if (background) {
                if (isMountedRef.current) setIsRefreshing(false);
            } else {
                if (isMountedRef.current) setIsLoading(false);
            }
            isRefreshingRef.current = false;

            if (refreshQueuedRef.current && isMountedRef.current) {
                refreshQueuedRef.current = false;
                refreshNotes({ background: true });
            }
        }
    }, [boardsList, labels.loadError, toast]);

    useEffect(() => {
        refreshNotes();
    }, [refreshNotes]);

    useEffect(() => {
        const handleUpdates = () => refreshNotes({ background: true });
        window.addEventListener(notesService.NOTE_UPDATES_EVENT, handleUpdates);
        return () => window.removeEventListener(notesService.NOTE_UPDATES_EVENT, handleUpdates);
    }, [refreshNotes]);

    useEffect(() => {
        const handleStorage = (event) => {
            if (!event?.key) return;
            if (event.key === 'mixboard_boards_list' || event.key.startsWith('mixboard_board_')) {
                refreshNotes({ background: true });
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [refreshNotes]);

    useEffect(() => {
        const handleFocus = () => refreshNotes({ background: true });
        const handleVisibility = () => {
            if (!document.hidden) {
                refreshNotes({ background: true });
            }
        };

        const interval = setInterval(() => {
            if (!document.hidden) {
                refreshNotes({ background: true });
            }
        }, REFRESH_INTERVAL_MS);

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [refreshNotes]);

    const boardOptions = useMemo(() => {
        const boardMap = new Map();
        notes.forEach(note => {
            if (!boardMap.has(note.boardId)) {
                boardMap.set(note.boardId, note.boardName);
            }
        });

        return Array.from(boardMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [notes]);

    useEffect(() => {
        if (boardFilter === 'all') return;
        const exists = boardOptions.some(option => option.id === boardFilter);
        if (!exists) {
            setBoardFilter('all');
        }
    }, [boardFilter, boardOptions]);

    const visibleNotes = useMemo(() => {
        const lowerQuery = query.trim().toLowerCase();

        const filtered = notes.filter(note => {
            const boardPass = boardFilter === 'all' || note.boardId === boardFilter;
            if (!boardPass) return false;

            if (!lowerQuery) return true;
            return note.title.toLowerCase().includes(lowerQuery) || note.content.toLowerCase().includes(lowerQuery);
        });

        return [...filtered].sort((a, b) => {
            if (sortMode === 'oldest') {
                return (a.updatedAt || 0) - (b.updatedAt || 0);
            }
            if (sortMode === 'title') {
                return a.title.localeCompare(b.title);
            }
            if (sortMode === 'length') {
                return (b.charCount || 0) - (a.charCount || 0);
            }
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
    }, [notes, query, boardFilter, sortMode]);

    const isFilterActive = query.trim().length > 0 || boardFilter !== 'all' || sortMode !== 'recent';

    const stats = useMemo(() => {
        const totalChars = notes.reduce((sum, note) => sum + (note.charCount || 0), 0);
        const avgChars = notes.length > 0 ? Math.round(totalChars / notes.length) : 0;

        return {
            totalNotes: notes.length,
            sourceBoards: boardOptions.length,
            filteredCount: visibleNotes.length,
            averageChars: avgChars
        };
    }, [notes, boardOptions.length, visibleNotes.length]);

    const handleOpenNote = (note) => {
        navigate(`/board/${note.boardId}/note/${note.id}`);
    };

    const handleOpenBoard = (note) => {
        navigate(`/board/${note.boardId}`);
    };

    const openEditor = (note) => {
        setEditingNote(note);
        setDraftContent(note.content || '');
    };

    const closeEditor = () => {
        const original = editingNote?.content || '';
        if (draftContent !== original && !window.confirm(labels.discardConfirm)) {
            return;
        }
        setEditingNote(null);
        setDraftContent('');
    };

    const handleSaveEdit = useCallback(async () => {
        if (!editingNote) return;

        const original = editingNote.content || '';
        if (draftContent === original) {
            setEditingNote(null);
            return;
        }

        setBusyNoteId(editingNote.id);
        try {
            const updatedAt = await notesService.updateNoteContent({
                boardId: editingNote.boardId,
                noteId: editingNote.id,
                content: draftContent,
                userId: user?.uid || null
            });

            if (onUpdateBoardMetadata) {
                await onUpdateBoardMetadata(editingNote.boardId, { updatedAt });
            }

            setEditingNote(null);
            setDraftContent('');
            toast.success(labels.saveSuccess);
            refreshNotes({ background: true });
        } catch (error) {
            console.error('[NotesCenter] Save failed', error);
            toast.error(labels.saveFailed);
        } finally {
            setBusyNoteId('');
        }
    }, [draftContent, editingNote, labels.saveFailed, labels.saveSuccess, onUpdateBoardMetadata, refreshNotes, toast, user?.uid]);

    const requestDelete = (note) => {
        setPendingDeleteNote(note);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteNote) return;

        const targetNote = pendingDeleteNote;
        setBusyNoteId(targetNote.id);

        try {
            const updatedAt = await notesService.softDeleteNote({
                boardId: targetNote.boardId,
                noteId: targetNote.id,
                userId: user?.uid || null
            });

            if (onUpdateBoardMetadata) {
                await onUpdateBoardMetadata(targetNote.boardId, { updatedAt });
            }

            if (editingNote?.id === targetNote.id) {
                setEditingNote(null);
                setDraftContent('');
            }

            setPendingDeleteNote(null);
            toast.success(labels.deleteSuccess);
            refreshNotes({ background: true });
        } catch (error) {
            console.error('[NotesCenter] Delete failed', error);
            toast.error(labels.deleteFailed);
        } finally {
            setBusyNoteId('');
        }
    };

    const handleCopy = async (note) => {
        try {
            const success = await copyToClipboard(note.content || '');
            if (!success) {
                toast.error(labels.copyFailed);
                return;
            }
            setCopiedNoteId(note.id);
            if (copyTimerRef.current) {
                clearTimeout(copyTimerRef.current);
            }
            copyTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                    setCopiedNoteId('');
                }
            }, 1200);
        } catch (error) {
            console.error('[NotesCenter] Copy failed', error);
            toast.error(labels.copyFailed);
        }
    };

    const handleClearFilters = () => {
        setQuery('');
        setBoardFilter('all');
        setSortMode('recent');
    };

    const handleEditorKeyDown = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            handleSaveEdit();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeEditor();
        }
    };

    const draftStats = useMemo(() => {
        const content = draftContent || '';
        return {
            chars: content.length,
            lines: content ? content.split('\n').length : 0,
            words: content.trim() ? content.trim().split(/\s+/).length : 0
        };
    }, [draftContent]);

    return (
        <>
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1117] shadow-sm mb-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(79,70,229,0.15),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.12),transparent_30%),linear-gradient(140deg,rgba(255,255,255,0.85),rgba(244,247,255,0.65))] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(129,140,248,0.22),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.2),transparent_30%),linear-gradient(140deg,rgba(15,17,23,0.95),rgba(17,24,39,0.82))]" />
                <div className="relative p-6 md:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 border border-white/60 dark:border-white/15 text-xs font-black tracking-[0.12em] uppercase text-indigo-600 dark:text-indigo-200 mb-4">
                                <StickyNote size={14} />
                                Notes Ops
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{labels.title}</h2>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 font-medium mt-2">{labels.subtitle}</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-white/10 px-3 py-2 rounded-full border border-slate-200/80 dark:border-white/10">
                                {isRefreshing ? labels.syncing : labels.refreshHint}
                            </div>
                            <button
                                onClick={() => refreshNotes({ background: true })}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
                            >
                                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                                {labels.refresh}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                        <div className="rounded-2xl p-4 bg-white/80 dark:bg-white/5 border border-white dark:border-white/10">
                            <div className="text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">{labels.totalNotes}</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalNotes}</div>
                        </div>
                        <div className="rounded-2xl p-4 bg-white/80 dark:bg-white/5 border border-white dark:border-white/10">
                            <div className="text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">{labels.sourceBoards}</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.sourceBoards}</div>
                        </div>
                        <div className="rounded-2xl p-4 bg-white/80 dark:bg-white/5 border border-white dark:border-white/10">
                            <div className="text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">{labels.filteredCount}</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.filteredCount}</div>
                        </div>
                        <div className="rounded-2xl p-4 bg-white/80 dark:bg-white/5 border border-white dark:border-white/10">
                            <div className="text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">{labels.averageChars}</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.averageChars}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.6rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111318] p-4 md:p-5 mb-6">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px_200px_auto] gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <Search size={16} className="text-slate-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={labels.searchPlaceholder}
                            className="w-full bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                        />
                    </div>

                    <select
                        value={boardFilter}
                        onChange={(e) => setBoardFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 outline-none"
                    >
                        <option value="all">{labels.allBoards}</option>
                        {boardOptions.map(board => (
                            <option key={board.id} value={board.id}>{board.name}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2">
                        <BarChart3 size={15} className="text-slate-400" />
                        <select
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 outline-none"
                        >
                            {sortOptions.map(option => (
                                <option key={option.value} value={option.value}>{labels[option.labelKey]}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleClearFilters}
                        disabled={!isFilterActive}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-40"
                    >
                        {labels.clearFilters}
                    </button>
                </div>
            </section>

            <section className="pb-36">
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-pulse">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="rounded-[1.6rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 h-[250px]">
                                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded mb-3" />
                                <div className="h-6 w-2/3 bg-slate-200 dark:bg-white/10 rounded mb-4" />
                                <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded mb-2" />
                                <div className="h-4 w-5/6 bg-slate-200 dark:bg-white/10 rounded mb-2" />
                                <div className="h-4 w-1/2 bg-slate-200 dark:bg-white/10 rounded" />
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && errorMessage && (
                    <div className="rounded-[1.6rem] border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-6 text-center">
                        <p className="font-bold text-amber-700 dark:text-amber-300">{errorMessage}</p>
                        <button
                            onClick={() => refreshNotes()}
                            className="mt-4 px-4 py-2 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 text-white"
                        >
                            {labels.retry}
                        </button>
                    </div>
                )}

                {!isLoading && !errorMessage && notes.length === 0 && (
                    <div className="py-24 text-center text-slate-500 dark:text-slate-400">
                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">{labels.empty}</div>
                        <p className="font-medium">{labels.emptyDesc}</p>
                    </div>
                )}

                {!isLoading && !errorMessage && notes.length > 0 && visibleNotes.length === 0 && (
                    <div className="py-24 text-center text-slate-500 dark:text-slate-400">
                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">{labels.noMatch}</div>
                        <p className="font-medium">{labels.noMatchDesc}</p>
                    </div>
                )}

                {!isLoading && !errorMessage && visibleNotes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {visibleNotes.map(note => (
                            <article
                                key={note.id}
                                className="group relative overflow-hidden rounded-[1.8rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141823] shadow-sm"
                            >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_85%_12%,rgba(99,102,241,0.14),transparent_32%)]" />
                                <div className="relative p-5 flex flex-col h-full">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="min-w-0">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-black bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200 mb-3">
                                                {note.isMaster ? labels.masterNote : labels.stickyNote}
                                            </span>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
                                                {note.title}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => handleOpenNote(note)}
                                            title={labels.openNote}
                                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>

                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[84px] mb-4 line-clamp-4">
                                        {note.preview || '-'}
                                    </p>

                                    <div className="mt-auto space-y-2 border-t border-slate-100 dark:border-white/10 pt-4">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                                            <span className="truncate">{labels.board}: <span className="font-semibold text-slate-700 dark:text-slate-200">{note.boardName}</span></span>
                                            <span className="shrink-0">{labels.updatedOn}: {formatDateTime(note.updatedAt)}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                                            <span>{note.charCount} {labels.chars}</span>
                                            <span>{note.lineCount} {labels.lines}</span>
                                            <span>{note.wordCount} {labels.words}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-4">
                                        <button
                                            onClick={() => handleOpenBoard(note)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20"
                                        >
                                            {labels.openBoard}
                                        </button>
                                        <button
                                            onClick={() => openEditor(note)}
                                            disabled={busyNoteId === note.id}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-50"
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <PencilLine size={13} />
                                                {labels.edit}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleCopy(note)}
                                            disabled={busyNoteId === note.id}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-50"
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <Copy size={13} />
                                                {copiedNoteId === note.id ? labels.copied : labels.copy}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => requestDelete(note)}
                                            disabled={busyNoteId === note.id}
                                            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50"
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <Trash2 size={13} />
                                                {labels.delete}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {editingNote && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={closeEditor} />
                    <div className="relative z-10 w-full max-w-5xl rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111318] shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">{labels.editorTitle}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{editingNote.boardName}</p>
                                <p className="text-[11px] text-indigo-500 dark:text-indigo-300 font-semibold mt-2">{labels.editorHint}</p>
                            </div>
                            <button
                                onClick={closeEditor}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 flex items-center justify-center"
                                title={labels.cancel}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-0">
                            <div className="p-6">
                                <textarea
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    onKeyDown={handleEditorKeyDown}
                                    className="w-full h-[420px] rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none resize-none leading-7"
                                />
                            </div>

                            <aside className="border-l border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 p-5">
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Note Stats</h4>
                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center justify-between"><span>{labels.chars}</span><strong>{draftStats.chars}</strong></div>
                                    <div className="flex items-center justify-between"><span>{labels.lines}</span><strong>{draftStats.lines}</strong></div>
                                    <div className="flex items-center justify-between"><span>{labels.words}</span><strong>{draftStats.words}</strong></div>
                                </div>
                            </aside>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                            <button
                                onClick={closeEditor}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                            >
                                {labels.cancel}
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={busyNoteId === editingNote.id}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <Save size={14} />
                                    {labels.save}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pendingDeleteNote && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setPendingDeleteNote(null)} />
                    <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151821] p-6 shadow-2xl">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{labels.deleteConfirmTitle}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{labels.deleteConfirmDesc}</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-6">{pendingDeleteNote.title}</p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setPendingDeleteNote(null)}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200"
                            >
                                {labels.cancel}
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={busyNoteId === pendingDeleteNote.id}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                            >
                                {labels.deleteConfirmAction}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
