import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, GripVertical, CaseSensitive } from 'lucide-react';

const COLORS = {
    // Modern, premium glass-like aesthetic
    blue: {
        bg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
        border: 'border-indigo-500/20 dark:border-indigo-400/30',
        text: 'text-indigo-600 dark:text-indigo-300',
        ring: 'ring-indigo-500/20',
        indicator: 'bg-indigo-500'
    },
    purple: {
        bg: 'bg-purple-500/5 dark:bg-purple-500/10',
        border: 'border-purple-500/20 dark:border-purple-400/30',
        text: 'text-purple-600 dark:text-purple-300',
        ring: 'ring-purple-500/20',
        indicator: 'bg-purple-500'
    },
    teal: {
        bg: 'bg-teal-500/5 dark:bg-teal-500/10',
        border: 'border-teal-500/20 dark:border-teal-400/30',
        text: 'text-teal-600 dark:text-teal-300',
        ring: 'ring-teal-500/20',
        indicator: 'bg-teal-500'
    },
    rose: {
        bg: 'bg-rose-500/5 dark:bg-rose-500/10',
        border: 'border-rose-500/20 dark:border-rose-400/30',
        text: 'text-rose-600 dark:text-rose-300',
        ring: 'ring-rose-500/20',
        indicator: 'bg-rose-500'
    },
    amber: {
        bg: 'bg-amber-500/5 dark:bg-amber-500/10',
        border: 'border-amber-500/20 dark:border-amber-400/30',
        text: 'text-amber-600 dark:text-amber-300',
        ring: 'ring-amber-500/20',
        indicator: 'bg-amber-500'
    },
    slate: {
        bg: 'bg-slate-500/5 dark:bg-slate-500/10',
        border: 'border-slate-500/20 dark:border-slate-400/30',
        text: 'text-slate-600 dark:text-slate-300',
        ring: 'ring-slate-500/20',
        indicator: 'bg-slate-500'
    },
};

const Zone = ({ group, isSelected }) => {
    const { cards, updateGroup, deleteGroup } = useStore();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(group.title || 'New Zone');

    // Calculate Bounding Box
    const rect = useMemo(() => {
        const groupCards = cards.filter(c => group.cardIds.includes(c.id));
        if (groupCards.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        groupCards.forEach(c => {
            const x = c.x || 0;
            const y = c.y || 0;

            // Refined heuristic for card dimensions
            // 1. If card has explicit width/height (e.g. resized sticky note), use it.
            // 2. Chat Cards: Standard width ~384px (w-96). Height varies, but we can estimate 
            //    or assume a safe minimum.
            // 3. Sticky Notes: Standard width 256px (w-64) if not resized.

            // Default widths based on type
            let width = 320;
            let height = 200;

            if (c.type === 'note') {
                width = c.width || 280; // slightly wider than standard w-64 (256px) to be safe
                height = c.height || (c.data?.isExpanded ? 400 : 280);
            } else {
                // Chat card
                width = 400; // w-[400px] often used
                // Estimate height based on message content length? Hard without DOM.
                // Let's use a generous default for now, or maybe the zone shouldn't be too tight.
                const msgCount = c.data?.messages?.length || 0;
                height = 200 + (msgCount * 50); // Rough growth
                height = Math.min(height, 800); // Cap it
            }

            // If store has precise dimensions (future proofing), use them
            if (c.width) width = c.width;
            if (c.height) height = c.height;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        // Add generous padding for the "City district" feel
        const PADDING_X = 80;
        const PADDING_Y = 80;

        return {
            x: minX - PADDING_X,
            y: minY - PADDING_Y - 40, // Extra for title
            width: (maxX - minX) + (PADDING_X * 2),
            height: (maxY - minY) + (PADDING_Y * 2) + 40
        };
    }, [cards, group.cardIds]);

    if (!rect) return null; // Don't render empty groups (or maybe render a placeholder? Plan said remove them)

    const colorTheme = COLORS[group.color] || COLORS.blue;

    const handleTitleSave = () => {
        setIsEditingTitle(false);
        if (title.trim() !== group.title) {
            updateGroup(group.id, { title: title.trim() });
        }
    };

    const handleColorChange = (colorKey) => {
        updateGroup(group.id, { color: colorKey });
    };

    return (
        <div
            className={`absolute rounded-[3rem] transition-all duration-500 ease-out group
                ${colorTheme.bg} ${colorTheme.border} border
                ${isSelected ? `ring-4 ${colorTheme.ring}` : 'hover:ring-2 hover:ring-black/5 dark:hover:ring-white/5'}
            `}
            style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                zIndex: 0, // Behind everything
                backdropFilter: 'blur(0px)' // Performance: avoid heavy blur on large areas, use opacity
            }}
        >
            {/* Title Bar */}
            <div className="absolute -top-12 left-0 right-0 flex justify-center items-center">
                <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-full 
                    bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm border border-slate-200 dark:border-slate-800
                    transition-all duration-200 opacity-50 hover:opacity-100 group-hover:opacity-100
                `}>
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                            autoFocus
                            className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 w-32 text-center"
                        />
                    ) : (
                        <span
                            onDoubleClick={() => setIsEditingTitle(true)}
                            className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-text select-none"
                        >
                            {title}
                        </span>
                    )}

                    {/* Quick Actions (only visible on hover) */}
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2 ml-2">
                        {Object.keys(COLORS).map(c => (
                            <button
                                key={c}
                                onClick={() => handleColorChange(c)}
                                className={`w-3 h-3 rounded-full ${COLORS[c].indicator} border border-slate-300/50 hover:scale-125 transition-transform`}
                                title={c.charAt(0).toUpperCase() + c.slice(1)}
                            />
                        ))}
                        <button
                            onClick={() => deleteGroup(group.id)}
                            className="ml-2 p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove Zone"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Zone;
