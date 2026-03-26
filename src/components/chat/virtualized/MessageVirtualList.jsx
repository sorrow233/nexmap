import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ErrorBoundary from '../../ErrorBoundary';
import MessageItem from '../MessageItem';
import PendingQueueIndicator from '../PendingQueueIndicator';
import favoritesService from '../../../services/favoritesService';

const ITEM_GAP_PX = 64;
const DEFAULT_OVERSCAN = 4;
const STREAMING_INDICATOR_HEIGHT = 64;
const PENDING_INDICATOR_HEIGHT = 56;
const BOTTOM_SENTINEL_HEIGHT = 128;

const extractMessageTextLength = (content) => {
    if (typeof content === 'string') {
        return content.length;
    }

    if (!Array.isArray(content)) {
        return 0;
    }

    return content.reduce((total, part) => (
        part?.type === 'text' && typeof part.text === 'string'
            ? total + part.text.length
            : total
    ), 0);
};

const estimateMessageHeight = (message) => {
    if (!message) {
        return 220;
    }

    const textLength = extractMessageTextLength(message.content);
    if (message.role === 'user') {
        return Math.min(360, 140 + Math.ceil(textLength / 120) * 26);
    }

    return Math.min(1200, 220 + Math.ceil(textLength / 90) * 28);
};

export default function MessageVirtualList({
    cardId,
    messages = [],
    scrollContainerRef,
    messagesEndRef,
    scrollToMessageIndexRef,
    isStreaming,
    handleRetry,
    marks,
    capturedNotes,
    parseModelOutput,
    onShare,
    onToggleFavorite,
    pendingCount = 0,
    pendingMessages = [],
    onContinueTopic,
    onBranch
}) {
    const hasDetachedStreamingMessage = Boolean(
        isStreaming &&
        messages.length > 0 &&
        messages[messages.length - 1]?.role === 'assistant'
    );
    const detachedStreamingMessage = hasDetachedStreamingMessage
        ? messages[messages.length - 1]
        : null;
    const virtualizedMessages = hasDetachedStreamingMessage
        ? messages.slice(0, -1)
        : messages;

    const rowVirtualizer = useVirtualizer({
        count: virtualizedMessages.length,
        getScrollElement: () => scrollContainerRef.current,
        getItemKey: (index) => virtualizedMessages[index]?.id || `${cardId}-${index}`,
        estimateSize: (index) => estimateMessageHeight(virtualizedMessages[index]) + ITEM_GAP_PX,
        overscan: DEFAULT_OVERSCAN
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalMessagesHeight = rowVirtualizer.getTotalSize();
    const showStreamingIndicator = isStreaming && !hasDetachedStreamingMessage;

    React.useEffect(() => {
        if (!scrollToMessageIndexRef) {
            return undefined;
        }

        scrollToMessageIndexRef.current = (index, options = {}) => {
            if (hasDetachedStreamingMessage && index >= virtualizedMessages.length) {
                messagesEndRef.current?.scrollIntoView({
                    behavior: options.behavior || 'smooth',
                    block: options.align || 'end'
                });
                return;
            }

            rowVirtualizer.scrollToIndex(index, {
                align: options.align || 'center'
            });
        };

        return () => {
            if (scrollToMessageIndexRef.current) {
                scrollToMessageIndexRef.current = null;
            }
        };
    }, [hasDetachedStreamingMessage, messagesEndRef, rowVirtualizer, scrollToMessageIndexRef, virtualizedMessages.length]);

    return (
        <div className="w-full">
            <div
                className="relative w-full"
                style={{ height: `${totalMessagesHeight}px` }}
            >
                {virtualRows.map((virtualRow) => {
                    const message = virtualizedMessages[virtualRow.index];

                    return (
                        <div
                            key={virtualRow.key}
                            ref={rowVirtualizer.measureElement}
                            data-index={virtualRow.index}
                            className="absolute left-0 top-0 w-full"
                            style={{
                                transform: `translateY(${virtualRow.start}px)`,
                                paddingBottom: `${ITEM_GAP_PX}px`
                            }}
                        >
                            <ErrorBoundary level="card">
                                <MessageItem
                                    cardId={cardId}
                                    message={message}
                                    index={virtualRow.index}
                                    marks={marks}
                                    capturedNotes={capturedNotes}
                                    parseModelOutput={parseModelOutput}
                                    isStreaming={false}
                                    handleRetry={handleRetry}
                                    onShare={onShare}
                                    onToggleFavorite={onToggleFavorite}
                                    isFavorite={favoritesService.isFavorite(cardId, virtualRow.index)}
                                    onContinueTopic={onContinueTopic}
                                    onBranch={onBranch}
                                />
                            </ErrorBoundary>
                        </div>
                    );
                })}
            </div>

            {detachedStreamingMessage && (
                <div className="pb-[64px]">
                    <ErrorBoundary level="card">
                        <MessageItem
                            cardId={cardId}
                            message={detachedStreamingMessage}
                            index={messages.length - 1}
                            marks={marks}
                            capturedNotes={capturedNotes}
                            parseModelOutput={parseModelOutput}
                            isStreaming
                            handleRetry={handleRetry}
                            onShare={onShare}
                            onToggleFavorite={onToggleFavorite}
                            isFavorite={favoritesService.isFavorite(cardId, messages.length - 1)}
                            onContinueTopic={onContinueTopic}
                            onBranch={onBranch}
                        />
                    </ErrorBoundary>
                </div>
            )}

            {showStreamingIndicator && (
                <div className="flex justify-start pt-2">
                    <div className="flex gap-2 items-center text-brand-500/40 dark:text-brand-400/30">
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0s]" />
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Streaming Intelligence</span>
                    </div>
                </div>
            )}

            {pendingCount > 0 && (
                <div className={showStreamingIndicator ? 'pt-2' : ''}>
                    <PendingQueueIndicator pendingMessages={pendingMessages} />
                </div>
            )}

            <div
                ref={messagesEndRef}
                className="w-full"
                style={{ height: `${BOTTOM_SENTINEL_HEIGHT}px` }}
            />
        </div>
    );
}
