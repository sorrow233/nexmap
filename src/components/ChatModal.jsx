import React from 'react';
import { isSafari, isIOS } from '../utils/browser';
import ChatView from './chat/ChatView';

export default function ChatModal(props) {
    const { card, isOpen, onClose, mobileMode = false } = props;
    if (!isOpen || !card) return null;

    return (
        <div
            className={mobileMode
                ? 'chat-modal ios-mobile-viewport fixed inset-x-0 z-[100] overflow-hidden bg-white dark:bg-slate-950'
                : 'chat-modal fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4'}
            role="dialog"
            aria-modal="true"
            style={mobileMode ? undefined : { perspective: '1000px' }}
        >
            {!mobileMode && (
                <div
                    className={`absolute inset-0 transition-opacity-blur ${isSafari || isIOS ? 'bg-slate-950/90' : 'bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md'}`}
                    onClick={onClose}
                />
            )}
            <div className={mobileMode
                ? 'relative z-10 flex h-full w-full flex-col'
                : 'relative z-10 flex h-full w-full max-w-[1100px] flex-col shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] sm:h-[92vh] sm:rounded-[2.5rem]'}>
                <ChatView {...props} />
            </div>
        </div>
    );
}
