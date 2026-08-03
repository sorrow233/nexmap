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
    onDeleteMessage,
    pendingCount = 0,
    pendingMessages = [],
    onContinueTopic,
    onBranch,
    mobileMode = false
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
            className={`chat-messages-viewport messages-container min-w-0 flex-grow overflow-y-auto transition-colors ios-scroll-fix touch-pan-y ${mobileMode
                ? 'px-4 py-5'
                : 'px-6 py-12 custom-scrollbar sm:px-10'
                }`}
        >
            <div className="w-full max-w-6xl mx-auto">
                {card.type === 'note' ? (
                    <div className="animate-fade-in">
                        <textarea
                            value={card.data.content || ''}
                            onChange={(e) => onUpdate(card.id, (currentData) => ({ ...currentData, content: e.target.value }))}
                            onPaste={handleNotePaste}
                            className={`w-full resize-none border-none bg-transparent text-slate-800 outline-none ios-scroll-fix touch-pan-y dark:text-slate-100 ${mobileMode
                                ? 'min-h-[calc(var(--mobile-viewport-height)_-_11rem)] text-[16px] leading-8'
                                : 'h-[calc(100vh-320px)] custom-scrollbar font-lxgw text-[1.1rem] leading-[2.5]'
                                }`}
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
                        onDeleteMessage={onDeleteMessage}
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
