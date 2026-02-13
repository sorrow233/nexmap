import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, PencilLine, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
};

function NoteCardGrid({
    note, labels, busyNoteId, copiedNoteId,
    onOpenNote, onOpenBoard, onEdit, onCopy, onDelete
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.article
            layout
            variants={cardVariants}
            className="group relative overflow-hidden rounded-[1.8rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141823] shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all duration-300"
        >
            {/* Hover gradient glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_85%_12%,rgba(99,102,241,0.12),transparent_40%)]" />

            <div className="relative p-5 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-black mb-2.5
                            ${note.isMaster
                                ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-600 dark:from-indigo-500/15 dark:to-violet-500/15 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-500/20'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200 border border-amber-100 dark:border-amber-500/20'
                            }`}
                        >
                            {note.isMaster ? labels.masterNote : labels.stickyNote}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2">
                            {note.title}
                        </h3>
                    </div>
                    <button
                        onClick={() => onOpenNote(note)}
                        title={labels.openNote}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0 transition-colors"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>

                {/* Preview with expand/collapse */}
                <div
                    className="cursor-pointer group/preview mb-4"
                    onClick={() => setExpanded(!expanded)}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {expanded ? (
                            <motion.div
                                key="expanded"
                                initial={{ opacity: 0, height: 84 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 84 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                    {note.content || '-'}
                                </p>
                            </motion.div>
                        ) : (
                            <motion.p
                                key="collapsed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[84px] line-clamp-4"
                            >
                                {note.preview || '-'}
                            </motion.p>
                        )}
                    </AnimatePresence>
                    <div className="flex items-center justify-center mt-2">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold group-hover/preview:text-indigo-500 transition-colors flex items-center gap-1">
                            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {expanded ? 'Collapse' : 'Expand'}
                        </span>
                    </div>
                </div>

                {/* Meta info */}
                <div className="mt-auto space-y-2 border-t border-slate-100 dark:border-white/10 pt-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                        <span className="truncate">
                            {labels.board}: <span className="font-semibold text-slate-700 dark:text-slate-200">{note.boardName}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">{formatDateTime(note.updatedAt)}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span className="tabular-nums">{note.charCount} {labels.chars}</span>
                        <span className="tabular-nums">{note.lineCount} {labels.lines}</span>
                        <span className="tabular-nums">{note.wordCount} {labels.words}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={() => onOpenBoard(note)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                    >
                        {labels.openBoard}
                    </button>
                    <button
                        onClick={() => onEdit(note)}
                        disabled={busyNoteId === note.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-50 transition-colors"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <PencilLine size={13} />
                            {labels.edit}
                        </span>
                    </button>
                    <button
                        onClick={() => onCopy(note)}
                        disabled={busyNoteId === note.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-50 transition-colors"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <Copy size={13} />
                            {copiedNoteId === note.id ? labels.copied : labels.copy}
                        </span>
                    </button>
                    <button
                        onClick={() => onDelete(note)}
                        disabled={busyNoteId === note.id}
                        className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                    >
                        <span className="inline-flex items-center gap-1.5">
                            <Trash2 size={13} />
                            {labels.delete}
                        </span>
                    </button>
                </div>
            </div>
        </motion.article>
    );
}

function NoteCardList({
    note, labels, busyNoteId, copiedNoteId,
    onOpenNote, onOpenBoard, onEdit, onCopy, onDelete
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.article
            layout
            variants={cardVariants}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141823] shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all duration-300"
        >
            <div className="relative p-4 md:p-5">
                <div className="flex items-start gap-4">
                    {/* Left: badge + title */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black shrink-0
                                ${note.isMaster
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200'
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200'
                                }`}
                            >
                                {note.isMaster ? labels.masterNote : labels.stickyNote}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                                {formatDateTime(note.updatedAt)}
                            </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug truncate">
                            {note.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {note.boardName}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {note.charCount} {labels.chars} · {note.lineCount} {labels.lines}
                            </span>
                        </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => onOpenBoard(note)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors" title={labels.openBoard}>
                            <ExternalLink size={14} />
                        </button>
                        <button onClick={() => onEdit(note)} disabled={busyNoteId === note.id} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-50 transition-colors" title={labels.edit}>
                            <PencilLine size={14} />
                        </button>
                        <button onClick={() => onCopy(note)} disabled={busyNoteId === note.id} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50 transition-colors" title={copiedNoteId === note.id ? labels.copied : labels.copy}>
                            <Copy size={14} />
                        </button>
                        <button onClick={() => onDelete(note)} disabled={busyNoteId === note.id} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors" title={labels.delete}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* Expandable preview */}
                <div
                    className="cursor-pointer mt-2"
                    onClick={() => setExpanded(!expanded)}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {expanded ? (
                            <motion.div
                                key="expanded"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words max-h-[240px] overflow-y-auto pr-1 custom-scrollbar border-t border-slate-100 dark:border-white/5 pt-2 mt-1">
                                    {note.content || '-'}
                                </p>
                            </motion.div>
                        ) : (
                            <motion.p
                                key="collapsed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm text-slate-500 dark:text-slate-400 truncate"
                            >
                                {note.preview || '-'}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.article>
    );
}

export default function NoteCard({ note, viewMode, ...props }) {
    if (viewMode === 'list') {
        return <NoteCardList note={note} {...props} />;
    }
    return <NoteCardGrid note={note} {...props} />;
}
