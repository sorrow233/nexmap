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
    const rowVirtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => scrollContainerRef.current,
        getItemKey: (index) => messages[index]?.id || `${cardId}-${index}`,
        estimateSize: (index) => estimateMessageHeight(messages[index]) + ITEM_GAP_PX,
        overscan: DEFAULT_OVERSCAN
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalMessagesHeight = rowVirtualizer.getTotalSize();
    const tailSectionHeight = (isStreaming ? STREAMING_INDICATOR_HEIGHT : 0)
        + (pendingCount > 0 ? PENDING_INDICATOR_HEIGHT : 0)
        + BOTTOM_SENTINEL_HEIGHT;
    const totalHeight = totalMessagesHeight + tailSectionHeight;

    React.useEffect(() => {
        if (!scrollToMessageIndexRef) {
            return undefined;
        }

        scrollToMessageIndexRef.current = (index, options = {}) => {
            rowVirtualizer.scrollToIndex(index, {
                align: options.align || 'center'
            });
        };

        return () => {
            if (scrollToMessageIndexRef.current) {
                scrollToMessageIndexRef.current = null;
            }
        };
    }, [rowVirtualizer, scrollToMessageIndexRef]);

    return (
        <div className="w-full">
            <div
                className="relative w-full"
                style={{ height: `${totalHeight}px` }}
            >
                {virtualRows.map((virtualRow) => {
                    const message = messages[virtualRow.index];
                    const isStreamingMessage = (
                        isStreaming &&
                        virtualRow.index === messages.length - 1 &&
                        message?.role === 'assistant'
                    );

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
                                    isStreaming={isStreamingMessage}
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

                {isStreaming && (
                    <div
                        className="absolute left-0 flex justify-start pt-2"
                        style={{ top: `${totalMessagesHeight}px` }}
                    >
                        <div className="flex gap-2 items-center text-brand-500/40 dark:text-brand-400/30">
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0s]" />
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Streaming Intelligence</span>
                        </div>
                    </div>
                )}

                {pendingCount > 0 && (
                    <div
                        className="absolute left-0"
                        style={{
                            top: `${totalMessagesHeight + (isStreaming ? STREAMING_INDICATOR_HEIGHT : 0)}px`
                        }}
                    >
                        <PendingQueueIndicator pendingMessages={pendingMessages} />
                    </div>
                )}

                <div
                    ref={messagesEndRef}
                    className="absolute left-0 w-full"
                    style={{
                        top: `${totalHeight - BOTTOM_SENTINEL_HEIGHT}px`,
                        height: `${BOTTOM_SENTINEL_HEIGHT}px`
                    }}
                />
            </div>
        </div>
    );
}
