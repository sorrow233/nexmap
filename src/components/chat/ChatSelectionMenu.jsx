import React from 'react';
import { StickyNote, Star } from 'lucide-react';
import { linkageService } from '../../services/linkageService';

const ChatSelectionMenu = ({ selection, onCaptureNote, onMarkTopic, t }) => {
    if (!selection) return null;

    return (
        <div
            className="fixed z-[110] flex gap-2 -translate-x-1/2 -translate-y-[130%] animate-bounce-in transition-all"
            style={{
                top: selection.rect.top,
                left: selection.rect.left
            }}
        >
            <button
                onClick={onCaptureNote}
                className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95"
            >
                <StickyNote size={14} className="text-brand-500" />
                {t.chat.captureAsNote}
            </button>
            <button
                onClick={onMarkTopic}
                className="bg-brand-600 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 hover:bg-brand-500 transition-all hover:scale-105 active:scale-95 border border-white/10"
            >
                <Star size={14} />
                {t.chat.markTopic}
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    linkageService.sendToExternalProject(selection.text);
                }}
                className="bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 border border-slate-200 dark:border-white/10"
                title="Send to FlowStudio"
            >
                <img src="/flowstudio-32x32.png" alt="FlowStudio" className="w-5 h-5" />
            </button>
        </div>
    );
};

export default ChatSelectionMenu;

