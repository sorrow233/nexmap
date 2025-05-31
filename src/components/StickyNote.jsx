import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Trash2, Link, ListOrdered } from 'lucide-react';
import { isSafari, isIOS } from '../utils/browser';

import { useStore } from '../store/useStore';
import { useDraggable } from '../hooks/useDraggable';

import { marked } from 'marked';
import DOMPurify from 'dompurify';

const StickyNote = React.memo(function StickyNote({
    data,
    isSelected,
    onSelect,
    onMove,
    onDelete,
    onUpdate,
    onDragEnd,
    onConnect,
    onExpand,
    isConnecting,
    isConnectionStart,
    onCreateNote,
    onCardFullScreen // NEW Prop
}) { // Line 22
    const {
        isDragging,
        handleMouseDown,
        handleTouchStart
    } = useDraggable({
        id: data.id,
        x: data.x,
        y: data.y,
        isSelected,
        onSelect,
        onMove,
        onDragEnd: () => onDragEnd && onDragEnd(data.id),
        onClick: () => {
            if (clickTimeoutRef.current) {
                // Double Click Detected
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                if (onCardFullScreen) onCardFullScreen(data.id);
            } else {
                // Single Click - wait for potential double click
                clickTimeoutRef.current = setTimeout(() => {
                    setIsExpanded(prev => !prev);
                    clickTimeoutRef.current = null;
                }, 250);
            }
        },
        disabled: isEditing
    });

    const [isEditing, setIsEditing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const cardRef = useRef(null);
    const contentRef = useRef(null);
    const clickTimeoutRef = useRef(null);

    const handleContentChange = (e) => {
        onUpdate(data.id, { ...data.data, content: e.target.value });
    };

    // Auto-Renumbering Feature
    const handleRenumber = (e) => {
        e.stopPropagation();
        const content = data.data?.content || '';
        if (!content) return;

        // logic:
        // 1. Split by newlines
        // 2. Identify lines that act as headers (e.g. "01. Title")
        // 3. Re-assign sequential numbers

        const lines = content.split('\n');
        let counter = 1;
        const newLines = lines.map(line => {
            const match = line.match(/^\d+\.\s+(.*)/);
            if (match) {
                const text = match[1];
                const newNum = String(counter++).padStart(2, '0');
                return `${newNum}. ${text}`;
            }
            return line;
        });

        const newContent = newLines.join('\n');

        if (newContent !== content) {
            onUpdate(data.id, { ...data.data, content: newContent });
        }
    };

    const handleKeyDown = (e) => {
        // Allow creating new card with Cmd+Enter
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.stopPropagation();
            const content = window.getSelection().toString() || data.data?.content || '';
            onCreateNote && onCreateNote(content, !e.shiftKey);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onUpdate(data.id, {
                    ...data.data,
                    image: event.target.result
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    onUpdate(data.id, {
                        ...data.data,
                        image: event.target.result
                    });
                };
                reader.readAsDataURL(file);
                e.preventDefault();
            }
        }
    };

    const glassStyle = (isSafari || isIOS)
        ? "bg-white/90 dark:bg-slate-900 border border-slate-300 dark:border-white/20 shadow-xl"
        : "bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]";

    // Smart Scroll Logic
    const [canScroll, setCanScroll] = useState(false);
    const scrollTimerRef = useRef(null);

    const handleMouseEnter = () => {
        scrollTimerRef.current = setTimeout(() => {
            setCanScroll(true);
        }, 500); // 0.5s delay before enabling scroll
    };

    const handleMouseLeave = () => {
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        setCanScroll(false);
    };

    // Helper: Stop propagation of wheel event to allow scrolling inside the note
    // This prevents the Canvas specific wheel listener (which preventsDefault) from intercepting it.
    const handleWheel = (e) => {
        if (canScroll) {
            e.stopPropagation();
        }
    };

    return (
        <div
            ref={cardRef}
            className={`absolute w-[336px] ${isExpanded ? 'min-h-[364px] max-h-[780px]' : 'h-[364px]'} rounded-[2rem] flex flex-col select-none pointer-events-auto group
                ${glassStyle}
                ${isDragging ? 'shadow-2xl scale-[1.02] cursor-grabbing' : 'transition-all duration-300 hover:scale-[1.01] cursor-grab'}
                ${isSelected ? 'ring-2 ring-brand-500/50' : 'hover:border-white/50'}
                ${isConnectionStart ? 'ring-2 ring-green-500 ring-dashed cursor-crosshair' : ''}
                ${isConnecting && !isConnectionStart ? 'hover:ring-2 hover:ring-green-400 hover:cursor-crosshair' : ''}
            `}
            style={{
                left: data.x,
                top: data.y,
                zIndex: isSelected ? 50 : 10,
                willChange: isDragging ? 'left, top' : 'auto'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onPaste={handlePaste}
        // onDoubleClick removed - handled in mouseUp
        >
            {/* Header / Controls */}
            <div className="flex justify-between items-center p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-xl bg-white/20 hover:bg-white/40 dark:bg-slate-800/20 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all active:scale-95"
                        title="Add Image"
                    >
                        <ImageIcon size={16} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); onConnect && onConnect(data.id); }}
                        className="p-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 backdrop-blur-md transition-all active:scale-95"
                        title="Create connection"
                    >
                        <Link size={16} />
                    </button>
                    <button
                        onClick={handleRenumber}
                        className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 backdrop-blur-md transition-all active:scale-95"
                        title="Re-order List"
                    >
                        <ListOrdered size={16} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 px-6 pb-6 pt-2 flex flex-col gap-4 relative overflow-hidden">
                {/* Image Display */}
                {data.data?.image && (
                    <div className="relative group/image overflow-hidden rounded-2xl shadow-md border border-white/20">
                        <img
                            src={data.data.image}
                            alt="Note attachment"
                            className="w-full h-auto object-cover max-h-[200px]"
                            draggable={false}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); onUpdate(data.id, { ...data.data, image: null }); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-red-500"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                {/* View/Edit Toggle */}
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        autoFocus
                        value={data.data?.content || ''}
                        onChange={handleContentChange}
                        onPaste={handlePaste}
                        onBlur={() => setIsEditing(false)}
                        placeholder="Write a note..."
                        className={`w-full flex-grow bg-transparent resize-none border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-500/50 font-lxgw leading-[2] text-lg custom-scrollbar cursor-text overflow-y-auto break-words`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                        onWheel={handleWheel} // Capture scroll in edit mode too
                    />
                ) : (
                    <div
                        ref={contentRef}
                        className={`w-full flex-grow text-slate-800 dark:text-slate-100 font-lxgw leading-[1.8] text-lg custom-scrollbar markdown-content select-text break-words overflow-x-hidden
                            ${isExpanded && canScroll ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
                        onWheel={handleWheel}
                        onMouseDown={(e) => e.stopPropagation()} // Allow selecting text
                        dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(marked(data.data?.content || '', { breaks: true }))
                        }}
                    />
                )}
            </div>

            <div className="h-2 w-12 bg-white/20 dark:bg-white/10 mx-auto mb-2 rounded-full opacity-50"></div>
        </div>
    );
});

export default StickyNote;

if (typeof window !== 'undefined') window.StickyNote = StickyNote;
