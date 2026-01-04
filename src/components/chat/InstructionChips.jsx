import React from 'react';
import { Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getColorForString } from '../../utils/colors';

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
                className={`flex flex-wrap gap-2 items-center ${className}`}
            >
                {instructions.map((inst, idx) => {
                    const displayName = inst.name || inst.text;
                    const colorClass = inst.color || getColorForString(displayName);
                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect(inst.content || inst.text)}
                            disabled={disabled}
                            className={`
                                group flex items-center gap-2 px-3.5 py-1.5 border rounded-2xl transition-all 
                                backdrop-blur-md active:scale-95 disabled:opacity-50 shrink-0 
                                shadow-sm hover:shadow-md font-bold tracking-tight
                                ${colorClass}
                            `}
                        >
                            <Star size={10} className="fill-current opacity-60 group-hover:opacity-100 transition-opacity" />
                            <span className="text-[11px] leading-none truncate max-w-[150px]">
                                {displayName}
                            </span>
                        </button>
                    );
                })}

                {onClear && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all ml-auto flex items-center justify-center border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
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
