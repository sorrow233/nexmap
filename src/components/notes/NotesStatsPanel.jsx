import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } }
};

const statConfig = [
    { key: 'totalNotes', color: 'text-indigo-600 dark:text-indigo-400' },
    { key: 'sourceBoards', color: 'text-sky-600 dark:text-sky-400' },
    { key: 'filteredCount', color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'averageChars', color: 'text-amber-600 dark:text-amber-400' }
];

export default function NotesStatsPanel({ stats, labels }) {
    return (
        <motion.div
            className="flex items-center gap-5 flex-wrap"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {statConfig.map(({ key, color }) => (
                <motion.div
                    key={key}
                    variants={itemVariants}
                    className="flex items-baseline gap-1.5"
                >
                    <span className={`text-xl font-black tabular-nums ${color}`}>
                        {stats[key]}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        {labels[key]}
                    </span>
                </motion.div>
            ))}
        </motion.div>
    );
}
