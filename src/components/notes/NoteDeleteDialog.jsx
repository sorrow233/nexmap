import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

const dialogVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 12 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 30 } },
    exit: { opacity: 0, scale: 0.92, y: 12, transition: { duration: 0.15 } }
};

export default function NoteDeleteDialog({ note, busyNoteId, onConfirm, onCancel, labels }) {
    return (
        <AnimatePresence>
            {note && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        onClick={onCancel}
                    />
                    <motion.div
                        className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151821] p-6 shadow-2xl"
                        variants={dialogVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                            {labels.deleteConfirmTitle}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                            {labels.deleteConfirmDesc}
                        </p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-6 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            {note.title}
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                            >
                                {labels.cancel}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={busyNoteId === note.id}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
                            >
                                {labels.deleteConfirmAction}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
