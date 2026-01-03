import React from 'react';
import { Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shared Instruction Chips Component
 * Used in ChatBar and ChatInput for consistent UI
 */
const InstructionChips = ({
    instructions = [],
    onSelect,
    onClear,
    disabled = false,
    className = ""
}) => {
    if (!instructions || instructions.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex flex-wrap gap-1.5 items-center ${className}`}
            >
                {instructions.map((inst, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelect(inst.content || inst.text)}
                        disabled={disabled}
                        className="group flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-cyan-500 border border-slate-200/50 dark:border-white/10 rounded-full transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-sm font-bold"
                    >
                        <Star size={10} className="fill-current text-slate-300 group-hover:text-cyan-300" />
                        <span className="text-[10px] tracking-tight truncate max-w-[120px]">
                            {inst.name || inst.text}
                        </span>
                    </button>
                ))}

                {onClear && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-400 transition-colors ml-auto flex items-center justify-center"
                        title="Clear choices"
                    >
                        <X size={12} />
                    </button>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default InstructionChips;
