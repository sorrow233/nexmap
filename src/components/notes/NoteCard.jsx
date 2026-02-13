import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, PencilLine, Copy, Trash2, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const formatDateTime = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const cleanTitle = (title) => {
    if (!title) return '';
    return title
        .replace(/^#+\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .trim();
};

const stripMarkdown = (text) => {
    if (!text) return '';
    // Basic stripping for preview
    return text
        .replace(/^#+\s+/gm, '') // headings
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // italic
        .replace(/`{3}[\s\S]*?`{3}/g, '[Code]') // code blocks
        .replace(/`(.+?)`/g, '$1') // inline code
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
        .replace(/^\s*>+\s?/gm, '') // blockquotes
        .replace(/^\s*-\s+/gm, '') // lists
        .replace(/\n{2,}/g, '\n') // multiple newlines
        .trim();
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
};

function ActionButton({ onClick, icon: Icon, label, disabled, dangerous }) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            disabled={disabled}
            title={label}
            className={`p-2 rounded-xl backdrop-blur-md transition-all duration-200 active:scale-95
                ${dangerous
                    ? 'text-red-500 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 dark:text-slate-500 dark:hover:text-indigo-300 dark:hover:bg-white/10'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
            `}
        >
            <Icon size={16} strokeWidth={2} />
        </button>
    );
}

function NoteCardGrid({
    note, labels, busyNoteId, copiedNoteId,
    onOpenNote, onOpenBoard, onEdit, onCopy, onDelete
}) {
    const [expanded, setExpanded] = useState(false);
    const displayTitle = cleanTitle(note.title);
    const isBusy = busyNoteId === note.id;

    const renderedContent = useMemo(() => {
        if (!note.content) return null;
        const rawHtml = marked(note.content, { breaks: true, gfm: true });
        return DOMPurify.sanitize(rawHtml);
    }, [note.content]);

    return (
        <motion.article
            layout
            variants={cardVariants}
            className="group relative flex flex-col h-full overflow-hidden rounded-[24px] border border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#18181b] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <ActionButton onClick={() => onOpenBoard(note)} icon={ExternalLink} label={labels.openBoard} />
                <ActionButton onClick={() => onEdit(note)} icon={PencilLine} label={labels.edit} disabled={isBusy} />
                <ActionButton onClick={() => onCopy(note)} icon={Copy} label={copiedNoteId === note.id ? labels.copied : labels.copy} disabled={isBusy} />
                <ActionButton onClick={() => onDelete(note)} icon={Trash2} label={labels.delete} disabled={isBusy} dangerous />
            </div>

            <div
                className="flex flex-col flex-1 p-6 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${note.isMaster
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                    >
                        {note.isMaster ? labels.masterNote : labels.stickyNote}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {formatDateTime(note.updatedAt)}
                    </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug mb-3 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {displayTitle || note.title}
                </h3>

                <div className="relative">
                    <AnimatePresence initial={false} mode="wait">
                        {expanded ? (
                            <motion.div
                                key="expanded"
                                initial={{ opacity: 0, height: 'auto' }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                            >
                                <div
                                    className="prose prose-sm prose-slate dark:prose-invert max-w-none 
                                        prose-p:my-1.5 prose-p:leading-relaxed 
                                        prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-headings:font-bold prose-headings:my-2
                                        prose-code:text-indigo-600 dark:prose-code:text-indigo-300 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-500/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                                        prose-li:my-0.5
                                        font-lxgw text-[15px]"
                                    dangerouslySetInnerHTML={{ __html: renderedContent || '<p class="text-slate-400 italic">No content</p>' }}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="collapsed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-4 font-lxgw">
                                    {stripMarkdown(note.content || note.preview) || <span className="text-slate-400 italic">No content</span>}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-auto pt-6 flex items-center justify-between text-xs font-medium text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                        <span className="truncate hover:text-indigo-500 transition-colors">{note.boardName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span title={labels.chars}>{note.charCount}c</span>
                        {expanded && <span title={labels.words}>{note.wordCount}w</span>}
                    </div>
                </div>
            </div>

            <div className={`h-1 w-full bg-gradient-to-r 
                ${note.isMaster
                    ? 'from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100'
                    : 'from-amber-400 via-orange-400 to-yellow-400 opacity-0 group-hover:opacity-100'
                } transition-opacity duration-300`}
            />
        </motion.article>
    );
}

function NoteCardList({
    note, labels, busyNoteId, copiedNoteId,
    onOpenNote, onOpenBoard, onEdit, onCopy, onDelete
}) {
    const [expanded, setExpanded] = useState(false);
    const displayTitle = cleanTitle(note.title);
    const isBusy = busyNoteId === note.id;

    const renderedContent = useMemo(() => {
        if (!note.content) return null;
        const rawHtml = marked(note.content, { breaks: true, gfm: true });
        return DOMPurify.sanitize(rawHtml);
    }, [note.content]);

    return (
        <motion.article
            layout
            variants={cardVariants}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#18181b] shadow-sm hover:shadow-md transition-all duration-200"
        >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                        <span className={`w-2 h-2 rounded-full ${note.isMaster ? 'bg-indigo-500 shadow-indigo-500/50 shadow-sm' : 'bg-amber-400'}`} />
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {displayTitle || note.title}
                        </h3>
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto sm:ml-0 tabular-nums">
                            {formatDateTime(note.updatedAt)}
                        </span>
                    </div>

                    <AnimatePresence mode="wait">
                        {expanded ? (
                            <motion.div
                                key="expanded"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div
                                    className="prose prose-sm prose-slate dark:prose-invert max-w-none 
                                        prose-p:my-1 prose-p:leading-relaxed 
                                        prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-headings:font-bold prose-headings:my-2
                                        prose-code:text-indigo-600 dark:prose-code:text-indigo-300 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-500/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                                        font-lxgw text-sm pt-2"
                                    dangerouslySetInnerHTML={{ __html: renderedContent || '<p class="text-slate-400 italic">No content</p>' }}
                                />
                            </motion.div>
                        ) : (
                            <motion.p
                                key="collapsed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm text-slate-500 dark:text-slate-400 truncate font-lxgw"
                            >
                                {stripMarkdown(note.content || note.preview) || <span className="text-slate-400 italic">No content</span>}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <div className="mt-3 flex items-center gap-4 text-xs font-medium text-slate-400 dark:text-slate-600">
                        <span>{note.boardName}</span>
                        <span>{note.charCount} {labels.chars}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:self-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton onClick={() => onOpenBoard(note)} icon={ExternalLink} label={labels.openBoard} />
                    <ActionButton onClick={() => onEdit(note)} icon={PencilLine} label={labels.edit} disabled={isBusy} />
                    <ActionButton onClick={() => onCopy(note)} icon={Copy} label={labels.copy} disabled={isBusy} />
                    <ActionButton onClick={() => onDelete(note)} icon={Trash2} label={labels.delete} disabled={isBusy} dangerous />
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
