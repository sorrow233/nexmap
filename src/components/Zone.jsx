import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, Palette, Smile, FileText, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

import { useDraggable } from '../hooks/useDraggable';

const COLORS = {
    // ... (unchanged)
    cyan: {
        bg: 'bg-cyan-500/5 dark:bg-cyan-500/10',
        border: 'border-cyan-500/20 dark:border-cyan-400/30',
        text: 'text-cyan-600 dark:text-cyan-300',
        ring: 'ring-cyan-500/20',
        indicator: 'bg-cyan-500',
        hex: '#06b6d4'
    }
};

const EMOJI_PRESETS = ['📁', '💡', '🎯', '⭐', '🔥', '💎', '🚀', '📌', '🎨', '💻', '📊', '🌟', '🧠', '⚙️', '📝', '✨'];

const Zone = ({ group, isSelected }) => {
    const { cards, updateGroup, deleteGroup, moveGroupCards } = useStore();
    const { t } = useLanguage();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(group.title || 'New Zone');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showDescription, setShowDescription] = useState(false);
    const [description, setDescription] = useState(group.description || '');
    const [customColorInput, setCustomColorInput] = useState(group.customColor || '');

    // Calculate Bounding Box
    const rect = useMemo(() => {
        // Filter out soft-deleted cards
        const groupCards = cards.filter(c => group.cardIds.includes(c.id) && !c.deletedAt);
        if (groupCards.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        groupCards.forEach(c => {
            const x = c.x || 0;
            const y = c.y || 0;
            let width = c.type === 'note' ? (c.width || 280) : 400;
            let height = c.type === 'note' ? (c.height || 280) : 200;

            if (c.type !== 'note') {
                const msgCount = c.data?.messages?.length || 0;
                height = 200 + (msgCount * 50);
                height = Math.min(height, 800);
            }

            if (c.width) width = c.width;
            if (c.height) height = c.height;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        const PADDING_X = 80;
        const PADDING_Y = 80;

        return {
            x: minX - PADDING_X,
            y: minY - PADDING_Y - 40,
            width: (maxX - minX) + (PADDING_X * 2),
            height: (maxY - minY) + (PADDING_Y * 2) + 40
        };
    }, [cards, group.cardIds]);

    // Make Zone Draggable via Title Bar
    const { handleMouseDown, isDragging } = useDraggable({
        id: group.id,
        x: rect ? rect.x : 0,
        y: rect ? rect.y : 0,
        disabled: isEditingTitle || !rect,
        onMove: (id, newX, newY) => {
            if (!rect) return;
            const deltaX = newX - rect.x;
            const deltaY = newY - rect.y;
            if (deltaX === 0 && deltaY === 0) return;
            moveGroupCards(id, deltaX, deltaY);
        }
    });

    // Calculate stats
    const stats = useMemo(() => {
        // Filter out soft-deleted cards
        const groupCards = cards.filter(c => group.cardIds.includes(c.id) && !c.deletedAt);
        const cardCount = groupCards.length;
        let messageCount = 0;
        groupCards.forEach(c => {
            if (c.data?.messages) {
                messageCount += c.data.messages.length;
            }
        });
        return { cardCount, messageCount };
    }, [cards, group.cardIds]);

    if (!rect) return null;

    // Get color - prioritize customColor
    const getZoneColor = () => {
        if (group.customColor) {
            return {
                bg: '',
                border: '',
                text: '',
                ring: '',
                indicator: '',
                hex: group.customColor
            };
        }
        return COLORS[group.color] || COLORS.blue;
    };
    const colorTheme = getZoneColor();
    const hasCustomColor = !!group.customColor;

    const handleTitleSave = () => {
        setIsEditingTitle(false);
        if (title.trim() !== group.title) {
            updateGroup(group.id, { title: title.trim() });
        }
    };

    const handleColorChange = (colorKey) => {
        updateGroup(group.id, { color: colorKey, customColor: '' });
        // setShowColorPicker(false); // Can keep open for rapid preview
    };

    const handleCustomColorApply = () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(customColorInput)) {
            updateGroup(group.id, { customColor: customColorInput });
            // setShowColorPicker(false);
        }
    };

    const handleEmojiSelect = (emoji) => {
        updateGroup(group.id, { icon: emoji });
        setShowEmojiPicker(false);
    };

    const handleDescriptionSave = () => {
        updateGroup(group.id, { description: description.trim() });
    };

    // Dynamic styles for custom color
    const customBgStyle = hasCustomColor ? { backgroundColor: `${group.customColor}08` } : {};
    const customBorderStyle = hasCustomColor ? { borderColor: `${group.customColor}30` } : {};

    return (
        <div
            className={`absolute rounded-[3rem] transition-all duration-300 ease-out group
                ${!hasCustomColor ? `${colorTheme.bg} ${colorTheme.border}` : ''} border
                ${isSelected ? `ring-4 ${!hasCustomColor ? colorTheme.ring : ''}` : 'hover:ring-2 hover:ring-black/5 dark:hover:ring-white/5'}
                ${isDragging ? 'cursor-grabbing' : ''}
            `}
            style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                zIndex: 0,
                ...customBgStyle,
                ...customBorderStyle,
                ...(isSelected && hasCustomColor ? { boxShadow: `0 0 0 4px ${group.customColor}20` } : {})
            }}
        >
            {/* Title Bar */}
            <div className={`absolute -top-14 left-0 right-0 flex justify-center items-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
            >
                <div
                    className={`
                        flex items-center gap-0.5 px-3 py-2 rounded-2xl
                        bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl border border-slate-200/50 dark:border-slate-700/50
                        transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5
                        ${isDragging ? 'scale-105 shadow-2xl' : ''}
                    `}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Icon section */}
                    <div className="flex items-center gap-2 pl-1 pr-3 border-r border-slate-200 dark:border-slate-800">
                        {/* Icon */}
                        {group.icon && (
                            <span className="text-xl select-none">{group.icon}</span>
                        )}

                        {/* Title */}
                        {isEditingTitle ? (
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleTitleSave}
                                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                                autoFocus
                                className="bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-slate-100 min-w-[80px] w-auto max-w-[200px]"
                            />
                        ) : (
                            <span
                                onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                                className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-text select-none truncate max-w-[200px]"
                            >
                                {title}
                            </span>
                        )}

                        {/* Stats Badge */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/50 ml-1">
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {stats.cardCount} <span className="opacity-50">Docs</span>
                            </span>
                            {stats.messageCount > 0 && (
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap border-l border-slate-200 dark:border-slate-700/50 pl-1.5">
                                    {stats.messageCount} <span className="opacity-50">Msg</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center pl-2 gap-0.5">
                        {/* Color Picker */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); setShowEmojiPicker(false); setShowDescription(false); }}
                                className={`p-1.5 rounded-lg transition-all ${showColorPicker ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800'}`}
                                title={t?.zone?.customColor || "Color Theme"}
                            >
                                <Palette size={15} />
                            </button>

                            {showColorPicker && (
                                <div
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-50 w-[280px] animate-in fade-in zoom-in-95 duration-200"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
                                        {t?.zone?.colorPresets || "Presets"}
                                    </div>
                                    <div className="grid grid-cols-7 gap-2 mb-4">
                                        {Object.entries(COLORS).map(([key, val]) => (
                                            <button
                                                key={key}
                                                onClick={() => handleColorChange(key)}
                                                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${group.color === key && !hasCustomColor ? 'border-slate-900 dark:border-slate-100 scale-110 ring-2 ring-offset-2 ring-slate-100 dark:ring-slate-900' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                                                style={{ backgroundColor: val.hex }}
                                                title={key}
                                            />
                                        ))}
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-slate-800 my-3"></div>

                                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
                                        {t?.zone?.customColor || "Custom Hex"}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200 dark:border-slate-600" style={{ backgroundColor: customColorInput || '#ffffff' }}></div>
                                            <input
                                                type="text"
                                                value={customColorInput}
                                                onChange={(e) => setCustomColorInput(e.target.value)}
                                                placeholder="#FF5733"
                                                className="w-full pl-8 pr-2 py-1.5 text-xs font-mono border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                        <button
                                            onClick={handleCustomColorApply}
                                            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Emoji Picker */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowColorPicker(false); setShowDescription(false); }}
                                className={`p-1.5 rounded-lg transition-all ${showEmojiPicker ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800'}`}
                                title={t?.zone?.selectEmoji || "Icon"}
                            >
                                <Smile size={15} />
                            </button>

                            {showEmojiPicker && (
                                <div
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-50 w-[240px] animate-in fade-in zoom-in-95 duration-200"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="grid grid-cols-6 gap-2">
                                        {EMOJI_PRESETS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleEmojiSelect(emoji)}
                                                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all hover:scale-110 active:scale-95"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => handleEmojiSelect('')}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:text-red-400 rounded-xl transition-all"
                                            title="Remove Icon"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDescription(!showDescription); setShowColorPicker(false); setShowEmojiPicker(false); }}
                                className={`p-1.5 rounded-lg transition-all ${showDescription || description ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800'}`}
                                title={t?.zone?.description || "Notes"}
                            >
                                <FileText size={15} />
                            </button>

                            {showDescription && (
                                <div
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-0 z-50 w-72 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                            {t?.zone?.description || "Zone Notes"}
                                        </span>
                                        <button
                                            onClick={() => setShowDescription(false)}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="p-3">
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            onBlur={handleDescriptionSave}
                                            placeholder={t?.zone?.descriptionPlaceholder || "Add notes about this zone..."}
                                            rows={5}
                                            className="w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 border-0 bg-transparent resize-none focus:outline-none placeholder:text-slate-400"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Delete */}
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        <button
                            onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-all"
                            title="Delete Zone"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Zone;
