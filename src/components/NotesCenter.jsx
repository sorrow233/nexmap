import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StickyNote, RefreshCw, FileX2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import notesService from '../services/notesService';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from './Toast';

// Sub-components
import NotesStatsPanel from './notes/NotesStatsPanel';
import NotesFilterBar from './notes/NotesFilterBar';
import NoteCard from './notes/NoteCard';
import NoteEditorModal from './notes/NoteEditorModal';
import NoteDeleteDialog from './notes/NoteDeleteDialog';

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
    emptyDesc: 'Create a note in any board and it will appear here automatically.',
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

const listContainerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } }
};

export default function NotesCenter({ boardsList = [], user, onUpdateBoardMetadata }) {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const toast = useToast();

    const labels = useMemo(() => ({
        ...FALLBACK_LABELS,
        ...(t.notesCenter || {})
    }), [t.notesCenter]);

    // --- State ---
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [query, setQuery] = useState('');
    const [boardFilter, setBoardFilter] = useState('all');
    const [sortMode, setSortMode] = useState('recent');
    const [viewMode, setViewMode] = useState('grid');

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
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        };
    }, []);

    // --- Data fetching ---
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
            if (isMountedRef.current) setErrorMessage(labels.loadError);
            if (!background && isMountedRef.current) toast.error(labels.loadError);
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

    useEffect(() => { refreshNotes(); }, [refreshNotes]);

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
        const handleVisibility = () => { if (!document.hidden) refreshNotes({ background: true }); };
        const interval = setInterval(() => { if (!document.hidden) refreshNotes({ background: true }); }, REFRESH_INTERVAL_MS);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [refreshNotes]);

    // --- Filtering & sorting ---
    const boardOptions = useMemo(() => {
        const boardMap = new Map();
        notes.forEach(note => {
            if (!boardMap.has(note.boardId)) boardMap.set(note.boardId, note.boardName);
        });
        return Array.from(boardMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [notes]);

    useEffect(() => {
        if (boardFilter === 'all') return;
        if (!boardOptions.some(o => o.id === boardFilter)) setBoardFilter('all');
    }, [boardFilter, boardOptions]);

    const visibleNotes = useMemo(() => {
        const lowerQuery = query.trim().toLowerCase();
        const filtered = notes.filter(note => {
            if (boardFilter !== 'all' && note.boardId !== boardFilter) return false;
            if (!lowerQuery) return true;
            return note.title.toLowerCase().includes(lowerQuery) || note.content.toLowerCase().includes(lowerQuery);
        });
        return [...filtered].sort((a, b) => {
            if (sortMode === 'oldest') return (a.updatedAt || 0) - (b.updatedAt || 0);
            if (sortMode === 'title') return a.title.localeCompare(b.title);
            if (sortMode === 'length') return (b.charCount || 0) - (a.charCount || 0);
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
    }, [notes, query, boardFilter, sortMode]);

    const isFilterActive = query.trim().length > 0 || boardFilter !== 'all' || sortMode !== 'recent';

    const stats = useMemo(() => {
        const totalChars = notes.reduce((sum, n) => sum + (n.charCount || 0), 0);
        return {
            totalNotes: notes.length,
            sourceBoards: boardOptions.length,
            filteredCount: visibleNotes.length,
            averageChars: notes.length > 0 ? Math.round(totalChars / notes.length) : 0
        };
    }, [notes, boardOptions.length, visibleNotes.length]);

    // --- Handlers ---
    const handleOpenNote = useCallback((note) => navigate(`/board/${note.boardId}/note/${note.id}`), [navigate]);
    const handleOpenBoard = useCallback((note) => navigate(`/board/${note.boardId}`), [navigate]);

    const openEditor = useCallback((note) => {
        setEditingNote(note);
        setDraftContent(note.content || '');
    }, []);

    const closeEditor = useCallback(() => {
        const original = editingNote?.content || '';
        if (draftContent !== original && !window.confirm(labels.discardConfirm)) return;
        setEditingNote(null);
        setDraftContent('');
    }, [editingNote, draftContent, labels.discardConfirm]);

    const handleSaveEdit = useCallback(async () => {
        if (!editingNote) return;
        if (draftContent === (editingNote.content || '')) {
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
            if (onUpdateBoardMetadata) await onUpdateBoardMetadata(editingNote.boardId, { updatedAt });
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
    }, [draftContent, editingNote, labels, onUpdateBoardMetadata, refreshNotes, toast, user?.uid]);

    const confirmDelete = useCallback(async () => {
        if (!pendingDeleteNote) return;
        const target = pendingDeleteNote;
        setBusyNoteId(target.id);
        try {
            const updatedAt = await notesService.softDeleteNote({
                boardId: target.boardId,
                noteId: target.id,
                userId: user?.uid || null
            });
            if (onUpdateBoardMetadata) await onUpdateBoardMetadata(target.boardId, { updatedAt });
            if (editingNote?.id === target.id) {
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
    }, [pendingDeleteNote, editingNote, labels, onUpdateBoardMetadata, refreshNotes, toast, user?.uid]);

    const handleCopy = useCallback(async (note) => {
        try {
            const success = await copyToClipboard(note.content || '');
            if (!success) { toast.error(labels.copyFailed); return; }
            setCopiedNoteId(note.id);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) setCopiedNoteId('');
            }, 1200);
        } catch {
            toast.error(labels.copyFailed);
        }
    }, [labels.copyFailed, toast]);

    const handleClearFilters = useCallback(() => {
        setQuery('');
        setBoardFilter('all');
        setSortMode('recent');
    }, []);

    const handleEditorKeyDown = useCallback((event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            handleSaveEdit();
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            closeEditor();
        }
    }, [handleSaveEdit, closeEditor]);

    // --- Shared card action props ---
    const cardActions = useMemo(() => ({
        onOpenNote: handleOpenNote,
        onOpenBoard: handleOpenBoard,
        onEdit: openEditor,
        onCopy: handleCopy,
        onDelete: (note) => setPendingDeleteNote(note)
    }), [handleOpenNote, handleOpenBoard, openEditor, handleCopy]);

    return (
        <>
            {/* Hero Section */}
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

                    <NotesStatsPanel stats={stats} labels={labels} />
                </div>
            </section>

            {/* Filter Bar */}
            <NotesFilterBar
                query={query}
                onQueryChange={setQuery}
                boardFilter={boardFilter}
                onBoardFilterChange={setBoardFilter}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                boardOptions={boardOptions}
                isFilterActive={isFilterActive}
                onClearFilters={handleClearFilters}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                labels={labels}
            />

            {/* Notes List */}
            <section className="pb-36">
                {/* Loading skeleton */}
                {isLoading && (
                    <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5' : 'flex flex-col gap-3'} animate-pulse`}>
                        {Array.from({ length: viewMode === 'grid' ? 6 : 4 }).map((_, i) => (
                            <div key={i} className={`rounded-[1.6rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 ${viewMode === 'grid' ? 'h-[250px]' : 'h-[80px]'}`}>
                                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded mb-3" />
                                <div className="h-6 w-2/3 bg-slate-200 dark:bg-white/10 rounded mb-4" />
                                {viewMode === 'grid' && (
                                    <>
                                        <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded mb-2" />
                                        <div className="h-4 w-5/6 bg-slate-200 dark:bg-white/10 rounded mb-2" />
                                        <div className="h-4 w-1/2 bg-slate-200 dark:bg-white/10 rounded" />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Error */}
                {!isLoading && errorMessage && (
                    <div className="rounded-[1.6rem] border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-6 text-center">
                        <p className="font-bold text-amber-700 dark:text-amber-300">{errorMessage}</p>
                        <button
                            onClick={() => refreshNotes()}
                            className="mt-4 px-4 py-2 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                        >
                            {labels.retry}
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && !errorMessage && notes.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-24 text-center"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-500/20 dark:to-violet-500/20 flex items-center justify-center">
                            <FileX2 size={36} className="text-indigo-400 dark:text-indigo-300" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">{labels.empty}</div>
                        <p className="font-medium text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{labels.emptyDesc}</p>
                    </motion.div>
                )}

                {/* No match */}
                {!isLoading && !errorMessage && notes.length > 0 && visibleNotes.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-24 text-center"
                    >
                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">{labels.noMatch}</div>
                        <p className="font-medium text-slate-500 dark:text-slate-400">{labels.noMatchDesc}</p>
                    </motion.div>
                )}

                {/* Notes grid/list */}
                {!isLoading && !errorMessage && visibleNotes.length > 0 && (
                    <motion.div
                        className={viewMode === 'grid'
                            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
                            : 'flex flex-col gap-3'
                        }
                        variants={listContainerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        <AnimatePresence mode="popLayout">
                            {visibleNotes.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    viewMode={viewMode}
                                    labels={labels}
                                    busyNoteId={busyNoteId}
                                    copiedNoteId={copiedNoteId}
                                    {...cardActions}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </section>

            {/* Editor Modal */}
            <NoteEditorModal
                editingNote={editingNote}
                draftContent={draftContent}
                onDraftChange={setDraftContent}
                onSave={handleSaveEdit}
                onClose={closeEditor}
                onKeyDown={handleEditorKeyDown}
                busyNoteId={busyNoteId}
                labels={labels}
            />

            {/* Delete Dialog */}
            <NoteDeleteDialog
                note={pendingDeleteNote}
                busyNoteId={busyNoteId}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDeleteNote(null)}
                labels={labels}
            />
        </>
    );
}
