import React from 'react';
import { motion } from 'framer-motion';
import { FileText, LayoutGrid, Filter, Type } from 'lucide-react';

const statConfig = [
    { key: 'totalNotes', icon: FileText, gradient: 'from-indigo-500 to-violet-500' },
    { key: 'sourceBoards', icon: LayoutGrid, gradient: 'from-sky-500 to-cyan-500' },
    { key: 'filteredCount', icon: Filter, gradient: 'from-emerald-500 to-teal-500' },
    { key: 'averageChars', icon: Type, gradient: 'from-amber-500 to-orange-500' }
];

const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

export default function NotesStatsPanel({ stats, labels }) {
    return (
        <motion.div
            className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {statConfig.map(({ key, icon: Icon, gradient }) => (
                <motion.div
                    key={key}
                    variants={itemVariants}
                    className="rounded-2xl p-4 bg-white/80 dark:bg-white/5 border border-white dark:border-white/10 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                            <Icon size={14} className="text-white" />
                        </div>
                        <span className="text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">
                            {labels[key]}
                        </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                        {stats[key]}
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
}
