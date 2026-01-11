import React from 'react';
import { StickyNote, Target } from 'lucide-react';
import { linkageService } from '../../services/linkageService';

const ChatSelectionMenu = ({ selection, onCaptureNote, onMarkTopic, t }) => {
    if (!selection) return null;

    return (
        <div
            className="fixed z-[110] flex items-center gap-1 -translate-x-1/2 -translate-y-[130%] animate-bounce-in transition-all backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-full px-1 py-1 shadow-2xl border border-white/20 dark:border-white/10"
            style={{
                top: selection.rect.top,
                left: selection.rect.left
            }}
        >
            <button
                onClick={onCaptureNote}
                className="text-slate-700 dark:text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-white/50 dark:hover:bg-white/10 transition-all active:scale-95"
            >
                <StickyNote size={13} className="text-amber-500" />
                笔记
            </button>
            <button
                onClick={onMarkTopic}
                className="text-slate-700 dark:text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-white/50 dark:hover:bg-white/10 transition-all active:scale-95"
            >
                <Target size={13} className="text-brand-500" />
                焦点
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    linkageService.sendToExternalProject(selection.text);
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-white/50 dark:hover:bg-white/10 transition-all active:scale-95"
                title="Send to FlowStudio"
            >
                <img src="/flowstudio-32x32.png" alt="Flow" className="w-4 h-4" />
                <span className="text-slate-700 dark:text-white">Flow</span>
            </button>
        </div>
    );
};

export default ChatSelectionMenu;
