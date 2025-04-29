import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, GripVertical, CaseSensitive } from 'lucide-react';

const COLORS = {
    blue: { bg: 'bg-blue-100/50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
    green: { bg: 'bg-emerald-100/50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
    purple: { bg: 'bg-purple-100/50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300' },
    orange: { bg: 'bg-orange-100/50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300' },
    red: { bg: 'bg-rose-100/50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300' },
    gray: { bg: 'bg-slate-100/50 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700', text: 'text-slate-600 dark:text-slate-400' },
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
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            // Assuming standard card size if not available, but usually Cards have diverse heights.
            // For now, let's assume a rough standard or try to get dynamic size if possible.
            // Since we don't store w/h in store explicitly for all types, we use a heuristic.
            const cardWidth = 340; // Approx card width
            const cardHeight = c.type === 'note' && c.data.isExpanded ? 600 : 200; // Heuristic

            maxX = Math.max(maxX, c.x + cardWidth);
            maxY = Math.max(maxY, c.y + cardHeight);
        });

        // Add padding
        const PADDING = 60;
        return {
            x: minX - PADDING,
            y: minY - PADDING - 40, // Extra top padding for title
            width: (maxX - minX) + (PADDING * 2),
            height: (maxY - minY) + (PADDING * 2) + 40
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
            className={`absolute rounded-[2.5rem] transition-all duration-300 group
                ${colorTheme.bg} ${colorTheme.border} border-2
                ${isSelected ? 'ring-4 ring-brand-500/20' : ''}
            `}
            style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                zIndex: 0 // Behind everything
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
                                className={`w-3 h-3 rounded-full ${COLORS[c].bg.replace('/50', '')} border border-slate-300 hover:scale-125 transition-transform`}
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
