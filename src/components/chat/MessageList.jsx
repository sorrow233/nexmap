import React from 'react';
import ErrorBoundary from '../ErrorBoundary';
import MessageItem from './MessageItem';
import favoritesService from '../../services/favoritesService';
import { Clock } from 'lucide-react';

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
    onToggleFavorite,
    pendingCount = 0,
    onContinueTopic,
    onBranch
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
            className="messages-container flex-grow overflow-y-auto px-6 sm:px-10 py-12 custom-scrollbar transition-colors ios-scroll-fix touch-pan-y min-w-0"
        >
            <div className="w-full max-w-5xl mx-auto">
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
                                    onContinueTopic={onContinueTopic}
                                    onBranch={onBranch}
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

                        {/* 等待队列提示 */}
                        {pendingCount > 0 && (
                            <div className="pt-4 flex justify-center animate-fade-in">
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-full">
                                    <Clock size={14} className="text-amber-500 animate-pulse" />
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                        {pendingCount} 条消息等待发送
                                    </span>
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
