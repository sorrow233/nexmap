import React from 'react';
import MessageVirtualList from './virtualized/MessageVirtualList';
import { handleMathRichPaste } from '../../utils/richTextClipboard';

const MessageList = React.memo(function MessageList({
    card,
    messagesEndRef,
    scrollContainerRef,
    scrollToMessageIndexRef,
    isStreaming,
    handleRetry,
    parseModelOutput,
    onUpdate,
    onShare,
    onToggleFavorite,
    pendingCount = 0,
    pendingMessages = [],
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
    const handleNotePaste = (e) => {
        handleMathRichPaste({
            event: e,
            currentValue: card.data.content || '',
            onChangeText: (nextText) => onUpdate(card.id, (currentData) => ({
                ...currentData,
                content: nextText
            }))
        });
    };

    return (
        <div
            ref={scrollContainerRef}
            className="chat-messages-viewport messages-container flex-grow overflow-y-auto px-6 sm:px-10 py-12 custom-scrollbar transition-colors ios-scroll-fix touch-pan-y min-w-0"
        >
            <div className="w-full max-w-6xl mx-auto">
                {card.type === 'note' ? (
                    <div className="animate-fade-in">
                        <textarea
                            value={card.data.content || ''}
                            onChange={(e) => onUpdate(card.id, (currentData) => ({ ...currentData, content: e.target.value }))}
                            onPaste={handleNotePaste}
                            className="w-full bg-transparent border-none outline-none font-lxgw leading-[2.5] text-[1.1rem] text-slate-800 dark:text-slate-100 resize-none h-[calc(100vh-320px)] custom-scrollbar ios-scroll-fix touch-pan-y"
                            placeholder="Start writing..."
                        />
                    </div>
                ) : (
                    <MessageVirtualList
                        cardId={card.id}
                        messages={messages}
                        scrollContainerRef={scrollContainerRef}
                        messagesEndRef={messagesEndRef}
                        scrollToMessageIndexRef={scrollToMessageIndexRef}
                        isStreaming={isStreaming}
                        handleRetry={handleRetry}
                        marks={card.data.marks}
                        capturedNotes={card.data.capturedNotes}
                        parseModelOutput={parseModelOutput}
                        onShare={onShare}
                        onToggleFavorite={onToggleFavorite}
                        pendingCount={pendingCount}
                        pendingMessages={pendingMessages}
                        onContinueTopic={onContinueTopic}
                        onBranch={onBranch}
                    />
                )}
            </div>
        </div>
    );
});

export default MessageList;
