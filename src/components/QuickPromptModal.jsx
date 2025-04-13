import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

export default function QuickPromptModal({ isOpen, onClose, onSubmit, initialPosition }) {
    const [text, setText] = useState('');
    const inputRef = useRef(null);
    const modalRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setText('');
        }
    }, [isOpen]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSubmit(text);
            setText('');
            onClose();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    // Adjust position to keep modal within viewport
    // Default width is roughly 320px
    const adjustedX = Math.min(initialPosition.x, window.innerWidth - 340);
    const adjustedY = Math.min(initialPosition.y, window.innerHeight - 150);

    return (
        <div
            className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
            style={{
                left: adjustedX,
                top: adjustedY
            }}
        >
            <div
                ref={modalRef}
                className="w-[320px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ring-4 ring-black/5 dark:ring-white/5"
            >
                <form onSubmit={handleSubmit} className="p-3">
                    <div className="relative">
                        <textarea
                            ref={inputRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type to create card..."
                            className="w-full bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 rounded-lg pl-3 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                            rows={2}
                            style={{ minHeight: '60px' }}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={14} />
                            </button>
                            <button
                                type="submit"
                                disabled={!text.trim()}
                                className="p-1.5 bg-brand-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-600 transition-colors shadow-sm"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="mt-2 px-1 flex justify-between items-center text-[10px] text-slate-400 select-none">
                        <span>Hashtags for tags</span>
                        <div className="flex items-center gap-1">
                            <span className="bg-slate-100 dark:bg-slate-700 px-1 rounded">Enter</span> to send
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
