import React from 'react';
import ErrorBoundary from '../ErrorBoundary';
import MessageItem from './MessageItem';
import favoritesService from '../../services/favoritesService';

export default function MessageList({
    card,
    messagesEndRef,
    scrollContainerRef,
    handleScroll,
    isStreaming,
    handleRetry,
    parseModelOutput,
    onUpdate,
    onShare,
    onToggleFavorite
}) {

    // Helper to identify if it's a note or chat
    // Actually, ChatModal handles the "Note" text area separately.
    // MessageList is only for 'conversation' type or the chat part.
    // If card.type === 'note', ChatModal renders a textarea.
    // If card.type !== 'note', it renders MessageList logic.
    // So this component assumes it's displaying a list of messages.

    const messages = card.data.messages || [];

    return (
        <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="messages-container flex-grow overflow-y-auto px-6 sm:px-10 py-12 custom-scrollbar transition-colors ios-scroll-fix touch-pan-y"
        >
            <div className="reader-width">
                {card.type === 'note' ? (
                    <div className="animate-fade-in">
                        <textarea
                            value={card.data.content || ''}
                            onChange={(e) => onUpdate(card.id, (currentData) => ({ ...currentData, content: e.target.value }))}
                            className="w-full bg-transparent border-none outline-none font-lxgw leading-[2.5] text-[1.1rem] text-slate-800 dark:text-slate-100 resize-none h-[calc(100vh-320px)] custom-scrollbar ios-scroll-fix touch-pan-y"
                            placeholder="Start writing..."
                        />
                    </div>
                ) : (
                    <div className="space-y-16">
                        {messages.map((m, i) => (
                            <ErrorBoundary key={i} level="card">
                                <MessageItem
                                    message={m}
                                    index={i}
                                    marks={card.data.marks}
                                    capturedNotes={card.data.capturedNotes}
                                    parseModelOutput={parseModelOutput}
                                    isStreaming={isStreaming}
                                    handleRetry={handleRetry}
                                    onShare={onShare}
                                    onToggleFavorite={(idx, content) => onToggleFavorite(card.id, idx, content)}
                                    isFavorite={favoritesService.isFavorite(card.id, i)}
                                />
                            </ErrorBoundary>
                        ))}

                        {isStreaming && (
                            <div className="pt-8 flex justify-start">
                                <div className="flex gap-2 items-center text-brand-500/40 dark:text-brand-400/30">
                                    <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0s]" />
                                    <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Streaming Intelligence</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-32" />
                    </div>
                )}
            </div>
        </div>
    );
}
