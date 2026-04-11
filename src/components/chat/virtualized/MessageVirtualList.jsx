import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ErrorBoundary from '../../ErrorBoundary';
import MessageItem from '../MessageItem';
import PendingQueueIndicator from '../PendingQueueIndicator';
import QueuedUserMessagePreview from '../QueuedUserMessagePreview';
import favoritesService from '../../../services/favoritesService';
import { useStore } from '../../../store/useStore';
import {
    getActiveStreamRouteDebug,
    logStreamRouteDebug
} from '../../../utils/streamRouteDebug';

const ITEM_GAP_PX = 64;
const DEFAULT_OVERSCAN = 4;
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
    isResponseStreaming,
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
    useStore((state) => state.favoritesLastUpdate);

    const activeRoute = isResponseStreaming && cardId
        ? getActiveStreamRouteDebug(cardId)
        : null;
    const expectedAssistantMessageId = activeRoute?.assistantMessageId || null;
    const detachedStreamingMessageIndex = expectedAssistantMessageId
        ? messages.findIndex((message) => (
            message?.id === expectedAssistantMessageId && message?.role === 'assistant'
        ))
        : -1;
    const hasDetachedStreamingMessage = detachedStreamingMessageIndex >= 0;
    const detachedStreamingMessage = hasDetachedStreamingMessage
        ? messages[detachedStreamingMessageIndex]
        : null;
    const virtualizedMessages = hasDetachedStreamingMessage
        ? messages.filter((_, index) => index !== detachedStreamingMessageIndex)
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
    const showStreamingIndicator = isResponseStreaming && !hasDetachedStreamingMessage;
    const renderTargetLogSignatureRef = React.useRef('');

    React.useEffect(() => {
        if (!scrollToMessageIndexRef) {
            return undefined;
        }

        const resolveVirtualizedIndex = (index) => {
            if (!hasDetachedStreamingMessage) {
                return index;
            }

            if (index === detachedStreamingMessageIndex) {
                return null;
            }

            return index > detachedStreamingMessageIndex
                ? index - 1
                : index;
        };

        scrollToMessageIndexRef.current = (index, options = {}) => {
            const virtualizedIndex = resolveVirtualizedIndex(index);
            if (virtualizedIndex === null) {
                messagesEndRef.current?.scrollIntoView({
                    behavior: options.behavior || 'smooth',
                    block: options.align || 'end'
                });
                return;
            }

            rowVirtualizer.scrollToIndex(virtualizedIndex, {
                align: options.align || 'center'
            });
        };

        return () => {
            if (scrollToMessageIndexRef.current) {
                scrollToMessageIndexRef.current = null;
            }
        };
    }, [
        detachedStreamingMessageIndex,
        hasDetachedStreamingMessage,
        messagesEndRef,
        rowVirtualizer,
        scrollToMessageIndexRef,
        virtualizedMessages.length
    ]);

    React.useEffect(() => {
        if (!isResponseStreaming || !cardId) {
            return;
        }

        const traceId = activeRoute?.traceId || 'unknown';
        const detachedStreamingMessageId = detachedStreamingMessage?.id || null;
        const lastMessage = messages[messages.length - 1] || null;
        const signature = [
            traceId,
            detachedStreamingMessageId || 'none',
            expectedAssistantMessageId || 'none',
            messages.length,
            hasDetachedStreamingMessage ? 'detached' : 'indicator'
        ].join(':');

        if (renderTargetLogSignatureRef.current === signature) {
            return;
        }

        renderTargetLogSignatureRef.current = signature;
        logStreamRouteDebug(traceId, 'streaming_render_target', () => ({
            cardId,
            expectedAssistantMessageId,
            detachedStreamingMessageId,
            detachedStreamingMessageIndex,
            hasDetachedStreamingMessage,
            showStreamingIndicator,
            messageCount: messages.length,
            lastMessageId: lastMessage?.id || null,
            lastMessageRole: lastMessage?.role || null,
            detachedMessageMismatch: Boolean(
                expectedAssistantMessageId &&
                detachedStreamingMessageId &&
                expectedAssistantMessageId !== detachedStreamingMessageId
            )
        }));
    }, [
        activeRoute?.traceId,
        cardId,
        detachedStreamingMessage?.id,
        detachedStreamingMessageIndex,
        expectedAssistantMessageId,
        hasDetachedStreamingMessage,
        isResponseStreaming,
        messages,
        showStreamingIndicator
    ]);

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
                                    isFavorite={favoritesService.isFavorite(
                                        cardId,
                                        message?.id || null,
                                        virtualRow.index,
                                        message?.content
                                    )}
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
                            index={detachedStreamingMessageIndex}
                            marks={marks}
                            capturedNotes={capturedNotes}
                            parseModelOutput={parseModelOutput}
                            isStreaming
                            handleRetry={handleRetry}
                            onShare={onShare}
                            onToggleFavorite={onToggleFavorite}
                            isFavorite={favoritesService.isFavorite(
                                cardId,
                                detachedStreamingMessage?.id || null,
                                detachedStreamingMessageIndex,
                                detachedStreamingMessage?.content
                            )}
                            onContinueTopic={onContinueTopic}
                            onBranch={onBranch}
                        />
                    </ErrorBoundary>
                </div>
            )}

            {pendingMessages.length > 0 && (
                <div className="space-y-4 pb-6">
                    {pendingMessages.map((pendingMessage, index) => (
                        <QueuedUserMessagePreview
                            key={`queued-${cardId}-${index}-${pendingMessage?.text || ''}-${pendingMessage?.images?.length || 0}`}
                            pendingMessage={pendingMessage}
                        />
                    ))}
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
