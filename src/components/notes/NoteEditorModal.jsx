import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.94, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
    exit: { opacity: 0, scale: 0.94, y: 20, transition: { duration: 0.18 } }
};

export default function NoteEditorModal({
    editingNote,
    draftContent,
    onDraftChange,
    onSave,
    onClose,
    onKeyDown,
    busyNoteId,
    labels
}) {
    const draftStats = useMemo(() => {
        const content = draftContent || '';
        return {
            chars: content.length,
            lines: content ? content.split('\n').length : 0,
            words: content.trim() ? content.trim().split(/\s+/).length : 0
        };
    }, [draftContent]);

    return (
        <AnimatePresence>
            {editingNote && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={onClose}
                    />
                    <motion.div
                        className="relative z-10 w-full max-w-5xl rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111318] shadow-2xl overflow-hidden"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                    {labels.editorTitle}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {editingNote.boardName}
                                </p>
                                <p className="text-[11px] text-indigo-500 dark:text-indigo-300 font-semibold mt-2">
                                    {labels.editorHint}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center transition-colors"
                                title={labels.cancel}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-0">
                            {/* Editor */}
                            <div className="p-6">
                                <div className="relative">
                                    {/* Line numbers gutter */}
                                    <div className="absolute left-3 top-3 bottom-3 w-8 flex flex-col items-end pr-2 pt-[1px] text-[10px] leading-7 text-slate-300 dark:text-slate-600 select-none overflow-hidden pointer-events-none font-mono">
                                        {(draftContent || '').split('\n').slice(0, 100).map((_, i) => (
                                            <div key={i}>{i + 1}</div>
                                        ))}
                                    </div>
                                    <textarea
                                        value={draftContent}
                                        onChange={(e) => onDraftChange(e.target.value)}
                                        onKeyDown={onKeyDown}
                                        className="w-full h-[420px] rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 pl-14 pr-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none resize-none leading-7 font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500/30 transition-shadow"
                                    />
                                </div>
                            </div>

                            {/* Stats sidebar */}
                            <aside className="border-l border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/20 p-5">
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                                    Note Stats
                                </h4>
                                <div className="space-y-3">
                                    {[
                                        { label: labels.chars, value: draftStats.chars },
                                        { label: labels.lines, value: draftStats.lines },
                                        { label: labels.words, value: draftStats.words }
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-300">{label}</span>
                                            <strong className="tabular-nums text-slate-900 dark:text-white">{value}</strong>
                                        </div>
                                    ))}
                                </div>

                                {/* Visual bar */}
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
                                    <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">Content Length</div>
                                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (draftStats.chars / 2000) * 100)}%` }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
                                        {draftStats.chars} / 2000+
                                    </div>
                                </div>
                            </aside>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                            >
                                {labels.cancel}
                            </button>
                            <button
                                onClick={onSave}
                                disabled={busyNoteId === editingNote.id}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-sm hover:shadow-indigo-500/25"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <Save size={14} />
                                    {labels.save}
                                </span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
