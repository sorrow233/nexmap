import React from 'react';
import { isSafari, isIOS } from '../utils/browser';
import ChatView from './chat/ChatView';

export default function ChatModal(props) {
    const { card, isOpen, onClose, mode } = props;
    if (!isOpen || (!card && mode !== 'global')) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4"
            style={{ perspective: '1000px' }}
        >
            <div
                className={`absolute inset-0 transition-opacity-blur ${isSafari || isIOS ? 'bg-slate-950/90' : 'bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md'}`}
                onClick={onClose}
            />
            <div className={`w-full max-w-[1100px] h-full sm:h-[92vh] sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col relative z-10 transition-all duration-500`}>
                <ChatView {...props} />
            </div>
        </div>
    );
}
