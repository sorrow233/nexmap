import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, StickyNote, ExternalLink, Copy, Trash2, PencilLine, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import notesService from '../services/notesService';
import { useLanguage } from '../contexts/LanguageContext';

const FALLBACK_LABELS = {
    title: 'Notes Center',
    subtitle: 'Manage sticky notes across all active boards.',
    totalNotes: 'Total Notes',
    sourceBoards: 'Source Boards',
    allBoards: 'All Boards',
    searchPlaceholder: 'Search notes...',
    empty: 'No notes yet',
    emptyDesc: 'Create a note on canvas and it will appear here.',
    noMatch: 'No matching notes',
    noMatchDesc: 'Try another keyword or switch board filter.',
    open: 'Open',
    edit: 'Edit',
    copy: 'Copy',
    copied: 'Copied',
    delete: 'Delete',
    deleteConfirm: 'Delete this note from its board?',
    save: 'Save',
    cancel: 'Cancel',
    editorTitle: 'Edit Note'
};

export default function NotesCenter({ boardsList = [], user, onUpdateBoardMetadata }) {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const labels = { ...FALLBACK_LABELS, ...(t.notesCenter || {}) };

    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [boardFilter, setBoardFilter] = useState('all');
    const [editingNote, setEditingNote] = useState(null);
    const [draftContent, setDraftContent] = useState('');
    const [busyNoteId, setBusyNoteId] = useState(null);
    const [copiedNoteId, setCopiedNoteId] = useState(null);

    const refreshNotes = useCallback(async () => {
        setIsLoading(true);
        try {
            const nextNotes = await notesService.getNotesIndex(boardsList);
            setNotes(nextNotes);
        } finally {
            setIsLoading(false);
        }
    }, [boardsList]);

    useEffect(() => {
        refreshNotes();
    }, [refreshNotes]);

    useEffect(() => {
        const handleUpdates = () => refreshNotes();
        window.addEventListener(notesService.NOTE_UPDATES_EVENT, handleUpdates);
        return () => window.removeEventListener(notesService.NOTE_UPDATES_EVENT, handleUpdates);
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

    const filteredNotes = useMemo(() => {
        const lowerQuery = query.trim().toLowerCase();

        return notes.filter(note => {
            const boardPass = boardFilter === 'all' || note.boardId === boardFilter;
            if (!boardPass) return false;

            if (!lowerQuery) return true;
            return note.title.toLowerCase().includes(lowerQuery) || note.content.toLowerCase().includes(lowerQuery);
        });
    }, [notes, query, boardFilter]);

    const notesBoardCount = boardOptions.length;

    const toNotePath = (note) => `/board/${note.boardId}/note/${note.id}`;

    const formatDate = (ts) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const handleEdit = (note) => {
        setEditingNote(note);
        setDraftContent(note.content || '');
    };

    const handleSaveEdit = async () => {
        if (!editingNote) return;
        setBusyNoteId(editingNote.id);
        try {
            const updatedAt = await notesService.updateNoteContent({
                boardId: editingNote.boardId,
                noteId: editingNote.id,
                content: draftContent,
                userId: user?.uid || null
            });

            if (onUpdateBoardMetadata) {
                onUpdateBoardMetadata(editingNote.boardId, { updatedAt });
            }

            setEditingNote(null);
            await refreshNotes();
        } finally {
            setBusyNoteId(null);
        }
    };

    const handleDelete = async (note) => {
        if (!window.confirm(labels.deleteConfirm)) return;

        setBusyNoteId(note.id);
        try {
            const updatedAt = await notesService.softDeleteNote({
                boardId: note.boardId,
                noteId: note.id,
                userId: user?.uid || null
            });

            if (onUpdateBoardMetadata) {
                onUpdateBoardMetadata(note.boardId, { updatedAt });
            }

            if (editingNote?.id === note.id) {
                setEditingNote(null);
            }

            await refreshNotes();
        } finally {
            setBusyNoteId(null);
        }
    };

    const handleCopy = async (note) => {
        if (!navigator?.clipboard) return;
        await navigator.clipboard.writeText(note.content || '');
        setCopiedNoteId(note.id);
        setTimeout(() => setCopiedNoteId(null), 1000);
    };

    if (isLoading) {
        return (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400">
                {labels.title}...
            </div>
        );
    }

    return (
        <>
            <div className="animate-fade-in pb-36">
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                                <StickyNote size={20} />
                            </span>
                            {labels.title}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {labels.subtitle}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3">
                            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">{labels.totalNotes}</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{notes.length}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3">
                            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">{labels.sourceBoards}</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{notesBoardCount}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 flex items-center gap-2">
                            <Search size={16} className="text-slate-400" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={labels.searchPlaceholder}
                                className="w-full bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={boardFilter}
                            onChange={(e) => setBoardFilter(e.target.value)}
                            className="px-4 py-2 rounded-xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
                        >
                            <option value="all">{labels.allBoards}</option>
                            {boardOptions.map(board => (
                                <option key={board.id} value={board.id}>{board.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {notes.length === 0 && (
                    <div className="py-24 text-center text-slate-500 dark:text-slate-400">
                        <div className="text-2xl font-black text-slate-800 dark:text-white mb-2">{labels.empty}</div>
                        <p className="font-medium">{labels.emptyDesc}</p>
                    </div>
                )}

                {notes.length > 0 && filteredNotes.length === 0 && (
                    <div className="py-24 text-center text-slate-500 dark:text-slate-400">
                        <div className="text-2xl font-black text-slate-800 dark:text-white mb-2">{labels.noMatch}</div>
                        <p className="font-medium">{labels.noMatchDesc}</p>
                    </div>
                )}

                {filteredNotes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredNotes.map(note => (
                            <div key={note.id} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="min-w-0">
                                        <div className="text-[10px] uppercase tracking-widest font-black text-indigo-500 mb-2">
                                            {note.isMaster ? 'Master Note' : 'Sticky Note'}
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
                                            {note.title}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => navigate(toNotePath(note))}
                                        title={labels.open}
                                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0"
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                </div>

                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[66px] mb-4">
                                    {note.preview || '-'}
                                </p>

                                <div className="text-xs text-slate-400 mb-4 flex items-center justify-between gap-3">
                                    <span className="truncate">{note.boardName}</span>
                                    <span>{formatDate(note.updatedAt)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(note)}
                                        disabled={busyNoteId === note.id}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <PencilLine size={13} />
                                            {labels.edit}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleCopy(note)}
                                        disabled={busyNoteId === note.id}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <Copy size={13} />
                                            {copiedNoteId === note.id ? labels.copied : labels.copy}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(note)}
                                        disabled={busyNoteId === note.id}
                                        className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <Trash2 size={13} />
                                            {labels.delete}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editingNote && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingNote(null)} />
                    <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111] shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">{labels.editorTitle}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{editingNote.boardName}</p>
                            </div>
                            <button
                                onClick={() => setEditingNote(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 flex items-center justify-center"
                                title={labels.cancel}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6">
                            <textarea
                                value={draftContent}
                                onChange={(e) => setDraftContent(e.target.value)}
                                className="w-full h-[360px] rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none resize-none"
                            />
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setEditingNote(null)}
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
        </>
    );
}
