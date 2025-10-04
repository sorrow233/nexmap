import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Trash2, GripVertical, Palette, Smile, FileText, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const COLORS = {
    // Modern, premium glass-like aesthetic
    blue: {
        bg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
        border: 'border-indigo-500/20 dark:border-indigo-400/30',
        text: 'text-indigo-600 dark:text-indigo-300',
        ring: 'ring-indigo-500/20',
        indicator: 'bg-indigo-500',
        hex: '#6366f1'
    },
    purple: {
        bg: 'bg-purple-500/5 dark:bg-purple-500/10',
        border: 'border-purple-500/20 dark:border-purple-400/30',
        text: 'text-purple-600 dark:text-purple-300',
        ring: 'ring-purple-500/20',
        indicator: 'bg-purple-500',
        hex: '#a855f7'
    },
    teal: {
        bg: 'bg-teal-500/5 dark:bg-teal-500/10',
        border: 'border-teal-500/20 dark:border-teal-400/30',
        text: 'text-teal-600 dark:text-teal-300',
        ring: 'ring-teal-500/20',
        indicator: 'bg-teal-500',
        hex: '#14b8a6'
    },
    rose: {
        bg: 'bg-rose-500/5 dark:bg-rose-500/10',
        border: 'border-rose-500/20 dark:border-rose-400/30',
        text: 'text-rose-600 dark:text-rose-300',
        ring: 'ring-rose-500/20',
        indicator: 'bg-rose-500',
        hex: '#f43f5e'
    },
    amber: {
        bg: 'bg-amber-500/5 dark:bg-amber-500/10',
        border: 'border-amber-500/20 dark:border-amber-400/30',
        text: 'text-amber-600 dark:text-amber-300',
        ring: 'ring-amber-500/20',
        indicator: 'bg-amber-500',
        hex: '#f59e0b'
    },
    slate: {
        bg: 'bg-slate-500/5 dark:bg-slate-500/10',
        border: 'border-slate-500/20 dark:border-slate-400/30',
        text: 'text-slate-600 dark:text-slate-300',
        ring: 'ring-slate-500/20',
        indicator: 'bg-slate-500',
        hex: '#64748b'
    },
};

const EMOJI_PRESETS = ['📁', '💡', '🎯', '⭐', '🔥', '💎', '🚀', '📌', '🎨', '💻', '📊', '🌟'];

const Zone = ({ group, isSelected }) => {
    const { cards, updateGroup, deleteGroup } = useStore();
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
        const groupCards = cards.filter(c => group.cardIds.includes(c.id));
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

    // Calculate stats
    const stats = useMemo(() => {
        const groupCards = cards.filter(c => group.cardIds.includes(c.id));
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
        setShowColorPicker(false);
    };

    const handleCustomColorApply = () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(customColorInput)) {
            updateGroup(group.id, { customColor: customColorInput });
            setShowColorPicker(false);
        }
    };

    const handleEmojiSelect = (emoji) => {
        updateGroup(group.id, { icon: emoji });
        setShowEmojiPicker(false);
    };

    const handleDescriptionSave = () => {
        updateGroup(group.id, { description: description.trim() });
        setShowDescription(false);
    };

    // Dynamic styles for custom color
    const customBgStyle = hasCustomColor ? { backgroundColor: `${group.customColor}08` } : {};
    const customBorderStyle = hasCustomColor ? { borderColor: `${group.customColor}30` } : {};

    return (
        <div
            className={`absolute rounded-[3rem] transition-all duration-300 ease-out group
                ${!hasCustomColor ? `${colorTheme.bg} ${colorTheme.border}` : ''} border
                ${isSelected ? `ring-4 ${!hasCustomColor ? colorTheme.ring : ''}` : 'hover:ring-2 hover:ring-black/5 dark:hover:ring-white/5'}
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
            <div className="absolute -top-12 left-0 right-0 flex justify-center items-center">
                <div
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full 
                        bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700
                        transition-all duration-200 opacity-70 hover:opacity-100 group-hover:opacity-100
                    `}
                >
                    {/* Icon */}
                    {group.icon && (
                        <span className="text-base">{group.icon}</span>
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
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 dark:text-slate-200 w-32 text-center"
                        />
                    ) : (
                        <span
                            onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                            className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-text select-none"
                        >
                            {title}
                        </span>
                    )}

                    {/* Stats Badge */}
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {stats.cardCount} 📄 {stats.messageCount > 0 && `· ${stats.messageCount} 💬`}
                    </span>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
                        {/* Color Picker */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title={t?.zone?.customColor || "Color"}
                            >
                                <Palette size={14} />
                            </button>

                            {showColorPicker && (
                                <div
                                    className="absolute top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 z-50 min-w-[180px]"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                        {t?.zone?.colorPresets || "Presets"}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {Object.entries(COLORS).map(([key, val]) => (
                                            <button
                                                key={key}
                                                onClick={() => handleColorChange(key)}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${group.color === key && !hasCustomColor ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: val.hex }}
                                            />
                                        ))}
                                    </div>
                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                        {t?.zone?.customColor || "Custom"}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customColorInput}
                                            onChange={(e) => setCustomColorInput(e.target.value)}
                                            placeholder="#FF5733"
                                            className="flex-1 px-2 py-1 text-xs border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                        />
                                        <button
                                            onClick={handleCustomColorApply}
                                            className="px-2 py-1 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-600"
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
                                onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title={t?.zone?.selectEmoji || "Icon"}
                            >
                                <Smile size={14} />
                            </button>

                            {showEmojiPicker && (
                                <div
                                    className="absolute top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 z-50"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="grid grid-cols-6 gap-1">
                                        {EMOJI_PRESETS.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleEmojiSelect(emoji)}
                                                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => handleEmojiSelect('')}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Remove"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowDescription(!showDescription); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`p-1 transition-colors ${group.description ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                            title={t?.zone?.description || "Notes"}
                        >
                            <FileText size={14} />
                        </button>

                        {/* Delete */}
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove Zone"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Description Panel */}
            {showDescription && (
                <div
                    className="absolute -top-32 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 z-50 w-64"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        {t?.zone?.description || "Zone Notes"}
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleDescriptionSave}
                        placeholder={t?.zone?.descriptionPlaceholder || "Add notes..."}
                        rows={3}
                        className="w-full px-2 py-1.5 text-sm border rounded-lg resize-none dark:bg-slate-700 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            )}
        </div>
    );
};

export default Zone;
