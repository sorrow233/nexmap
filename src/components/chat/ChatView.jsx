import React, { useState, useRef, useEffect } from 'react';
// import { generateFollowUpTopics } from '../../services/llm'; // Converted to dynamic import
import { parseModelOutput } from '../../services/llm/parser';
import { useStore } from '../../store/useStore';
import useImageUpload from '../../hooks/useImageUpload';
import { htmlToMarkdown } from '../../utils/htmlToMarkdown';
import { aiManager } from '../../services/ai/AIManager';
import { useAISprouting } from '../../hooks/useAISprouting';
import { useLanguage } from '../../contexts/LanguageContext';
import { ensureLatestBuildOrRefresh } from '../../utils/buildVersion';
import { usePendingMessageQueue } from './usePendingMessageQueue';
import {
    capturePerfSnapshot,
    endPerfMeasure,
    markPerfEvent
} from '../../utils/perfProbe';

import SproutModal from './SproutModal';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import ShareModal from '../share/ShareModal';
import ChatIndexSidebar from './ChatIndexSidebar';
import ChatSelectionMenu from './ChatSelectionMenu';
import ChatHeader from './ChatHeader';

export default function ChatView({
    card,
    onClose,
    onUpdate,
    onGenerateResponse,
    onCreateNote,
    onSprout,
    onToggleFavorite,
    isFullScreen = false,
    instructions = [],
    isReadOnly = false // NEW
}) {
    const [input, setInput] = useState('');
    const [showQueueDispatchNotice, setShowQueueDispatchNotice] = useState(false);

    // Get config from Store
    const activeId = useStore(state => state.activeId);
    const config = useStore(state => state.providers[activeId]);
    const analysisModel = useStore(state => state.getRoleModel('analysis'));

    const generatingTaskCount = useStore(state => state.generatingCardTaskCounts?.[card.id] || 0);
    const hasGeneratingCardFlag = useStore(state => state.generatingCardIds.has(card.id));
    const streamingCardVersion = useStore(state => state.streamingCardVersions?.[card.id] || 0);
    const isCardGenerating = hasGeneratingCardFlag || generatingTaskCount > 0;

    const {
        images,
        handleImageUpload,
        handlePaste,
        removeImage,
        clearImages
    } = useImageUpload();

    const [shareContent, setShareContent] = useState(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const isAtBottomRef = useRef(true);
    const scrollRequestRef = useRef(null);
    const scrollCommitRef = useRef(null);
    const queueDispatchNoticeTimerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const scrollToMessageIndexRef = useRef(null);
    const fileInputRef = useRef(null);
    const modalRef = useRef(null);
    const perfMountedCardIdRef = useRef('');
    const perfInteractiveCardIdRef = useRef('');

    // Sprout Feature State
    const [isSprouting, setIsSprouting] = useState(false);
    const [sproutTopics, setSproutTopics] = useState([]);
    const [showSproutModal, setShowSproutModal] = useState(false);
    const [selectedTopics, setSelectedTopics] = useState([]);
    // Text Selection State
    const [selection, setSelection] = useState(null);
    const { t } = useLanguage();

    // Quick Sprout Hook (for one-click topic decomposition)
    const { handleContinueTopic, handleBranch } = useAISprouting();

    const dispatchMessage = async (text, imagesToSend = []) => {
        try {
            await onGenerateResponse(card.id, text, imagesToSend);
        } catch (error) {
            console.error('Failed to dispatch message:', error);
        }
    };

    const scrollToBottom = React.useCallback((force = false) => {
        if ((!force && !isAtBottomRef.current) || !scrollContainerRef.current) {
            return;
        }

        const container = scrollContainerRef.current;
        container.scrollTop = container.scrollHeight;
    }, []);

    const cancelScheduledScrollToBottom = React.useCallback(() => {
        if (scrollRequestRef.current) {
            cancelAnimationFrame(scrollRequestRef.current);
            scrollRequestRef.current = null;
        }
        if (scrollCommitRef.current) {
            cancelAnimationFrame(scrollCommitRef.current);
            scrollCommitRef.current = null;
        }
    }, []);

    const scheduleScrollToBottom = React.useCallback((force = false) => {
        cancelScheduledScrollToBottom();
        scrollRequestRef.current = requestAnimationFrame(() => {
            scrollRequestRef.current = null;
            scrollCommitRef.current = requestAnimationFrame(() => {
                scrollCommitRef.current = null;
                scrollToBottom(force);
            });
        });
    }, [cancelScheduledScrollToBottom, scrollToBottom]);

    const clearQueueDispatchHint = React.useCallback(() => {
        if (queueDispatchNoticeTimerRef.current) {
            clearTimeout(queueDispatchNoticeTimerRef.current);
            queueDispatchNoticeTimerRef.current = null;
        }
        setShowQueueDispatchNotice(false);
    }, []);

    const showQueueDispatchHint = React.useCallback(() => {
        clearQueueDispatchHint();
        setShowQueueDispatchNotice(true);
        queueDispatchNoticeTimerRef.current = setTimeout(() => {
            queueDispatchNoticeTimerRef.current = null;
            setShowQueueDispatchNotice(false);
        }, 2600);
    }, [clearQueueDispatchHint]);

    const commitIsAtBottomState = React.useCallback((nextAtBottom) => {
        if (isAtBottomRef.current === nextAtBottom) {
            return;
        }

        isAtBottomRef.current = nextAtBottom;
        setIsAtBottom(nextAtBottom);
    }, []);

    const {
        isDispatching,
        isQueueRunning,
        pendingMessages,
        pendingCount,
        resetQueue,
        sendMessage
    } = usePendingMessageQueue({
        cardId: card.id,
        isReadOnly,
        isCardGenerating,
        onDispatch: dispatchMessage,
        onBeforeDispatch: ({ source }) => {
            if (source === 'direct') {
                clearQueueDispatchHint();
                scheduleScrollToBottom(true);
                return;
            }

            if (isAtBottomRef.current) {
                clearQueueDispatchHint();
                scheduleScrollToBottom();
                return;
            }

            showQueueDispatchHint();
        }
    });

    const isStreaming = isDispatching || isQueueRunning || isCardGenerating;

    // Helper to send a message from Sprout (continue topic in current card)
    const handleSendMessageFromSprout = (text) => {
        if (!text || isReadOnly) return;
        const normalizedText = text.trim();
        if (!normalizedText) return;
        sendMessage(normalizedText, []);
    };

    const handleSproutClick = async () => {
        if (isSprouting || isReadOnly) return;
        setIsSprouting(true);
        try {
            const { generateFollowUpTopics } = await import('../../services/llm');
            const topics = await generateFollowUpTopics(card.data.messages, config, analysisModel);
            setSproutTopics(topics);
            setSelectedTopics(topics.slice(0, 3)); // Default select first 3
            setShowSproutModal(true);
        } catch (e) {
            console.error("Sprout failed", e);
        } finally {
            setIsSprouting(false);
        }
    };

    const toggleTopicSelection = (topic) => {
        if (isReadOnly) return;
        setSelectedTopics(prev =>
            prev.includes(topic)
                ? prev.filter(t => t !== topic)
                : [...prev, topic]
        );
    };

    const handleConfirmSprout = () => {
        if (isReadOnly) return;
        if (onSprout && selectedTopics.length > 0) {
            onSprout(card.id, selectedTopics);
            setShowSproutModal(false);
            setSproutTopics([]);
        }
    };

    useEffect(() => {
        const root = scrollContainerRef.current;
        const bottomSentinel = messagesEndRef.current;

        if (!root || !bottomSentinel) {
            return undefined;
        }

        if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
            const syncBottomState = () => {
                const nextAtBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 100;
                commitIsAtBottomState(nextAtBottom);
            };

            syncBottomState();
            root.addEventListener('scroll', syncBottomState, { passive: true });

            return () => {
                root.removeEventListener('scroll', syncBottomState);
            };
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                commitIsAtBottomState(Boolean(entry?.isIntersecting));
            },
            {
                root,
                threshold: 0,
                rootMargin: '0px 0px 120px 0px'
            }
        );

        observer.observe(bottomSentinel);

        return () => {
            observer.disconnect();
        };
    }, [card.id, card.type, commitIsAtBottomState]);

    useEffect(() => {
        if (!isStreaming) return;
        scheduleScrollToBottom();
    }, [isStreaming, scheduleScrollToBottom, streamingCardVersion]);

    // Force scroll to bottom on initial open
    useEffect(() => {
        scheduleScrollToBottom(true);
        return () => cancelScheduledScrollToBottom();
    }, [cancelScheduledScrollToBottom, scheduleScrollToBottom]);

    useEffect(() => () => {
        cancelScheduledScrollToBottom();
        clearQueueDispatchHint();
    }, [cancelScheduledScrollToBottom, clearQueueDispatchHint]);

    useEffect(() => {
        if (isAtBottom || !isStreaming) {
            clearQueueDispatchHint();
        }
    }, [clearQueueDispatchHint, isAtBottom, isStreaming]);

    useEffect(() => {
        if (perfMountedCardIdRef.current === card.id) {
            return;
        }

        perfMountedCardIdRef.current = card.id;
        endPerfMeasure(`card-open:${card.id}`, {
            cardId: card.id,
            messageCount: card.data.messages?.length || 0,
            cardType: card.type || 'chat'
        });
        markPerfEvent('chat-view-mounted', {
            cardId: card.id,
            messageCount: card.data.messages?.length || 0,
            cardType: card.type || 'chat'
        });
        capturePerfSnapshot('chat-view-mounted', {
            cardId: card.id,
            messageCount: card.data.messages?.length || 0,
            renderedMessageNodes: modalRef.current?.querySelectorAll?.('.chat-message-frame').length || 0
        });
    }, [card.id, card.data.messages?.length, card.type]);

    useEffect(() => {
        if (perfInteractiveCardIdRef.current === card.id) {
            return undefined;
        }

        let cancelled = false;
        const markInteractive = () => {
            if (cancelled) return;
            const textarea = modalRef.current?.querySelector('textarea');
            if (!textarea) return;

            perfInteractiveCardIdRef.current = card.id;
            endPerfMeasure(`chat-interactive:${card.id}`, {
                cardId: card.id,
                messageCount: card.data.messages?.length || 0
            });
            capturePerfSnapshot('chat-input-ready', {
                cardId: card.id,
                messageCount: card.data.messages?.length || 0,
                renderedMessageNodes: modalRef.current?.querySelectorAll?.('.chat-message-frame').length || 0
            });
        };

        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(markInteractive);
        });

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [card.id, card.data.messages?.length]);

    useEffect(() => {
        capturePerfSnapshot('chat-render-snapshot', {
            cardId: card.id,
            messageCount: card.data.messages?.length || 0,
            renderedMessageNodes: modalRef.current?.querySelectorAll?.('.chat-message-frame').length || 0,
            streaming: isStreaming
        });
    }, [card.id, card.data.messages?.length, isStreaming]);


    // --- Handlers Wrapper ---
    const cloneImagesForSend = (imagesToClone = []) =>
        imagesToClone.map((img) => ({
            base64: img.base64,
            mimeType: img.mimeType
        }));

    const handleRetry = async () => {
        if (isReadOnly) return;
        const lastUserMessage = card.data.messages?.filter(m => m.role === 'user').pop();
        if (!lastUserMessage) return;

        // BUG FIX: content可能是字符串或数组（包含图片），需要正确提取
        let textContent = '';
        let imageContent = [];

        if (typeof lastUserMessage.content === 'string') {
            textContent = lastUserMessage.content;
        } else if (Array.isArray(lastUserMessage.content)) {
            // 多部分内容：提取文本和图片
            lastUserMessage.content.forEach(part => {
                if (part.type === 'text') textContent += part.text;
                if (part.type === 'image') imageContent.push(part);
            });
        }

        if (!textContent.trim() && imageContent.length === 0) return;

        try {
            await onGenerateResponse(card.id, textContent, imageContent);
        } catch (e) {
            console.error('Failed to retry:', e);
        }
    };

    // 停止生成
    const handleStop = () => {
        if (isReadOnly) return;
        console.log('[ChatView] Stopping generation for card:', card.id);
        aiManager.cancelByTags([`card:${card.id}`]);
        resetQueue();
    };

    const handleTextSelection = () => {
        // Use a small timeout to let the selection stabilize (crucial for iOS)
        setTimeout(() => {
            const sel = window.getSelection();
            if (sel && sel.toString().trim().length > 0 && !isStreaming) {
                try {
                    const range = sel.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    // Ensure the selection is within our messages container
                    const container = modalRef.current?.querySelector('.messages-container');
                    if (container && container.contains(range.commonAncestorContainer)) {
                        setSelection({
                            text: sel.toString().trim(),
                            html: range.cloneContents(), // Store fragment
                            rect: {
                                top: rect.top,
                                left: rect.left + rect.width / 2
                            }
                        });
                        return;
                    }
                } catch (e) {
                    console.warn('[Selection] Failed to get range/rect', e);
                }
            }
            setSelection(null);
        }, 10);
    };

    // Global selection change listener for iPad/Safari stability
    useEffect(() => {
        const handleSelectionChange = () => {
            if (selection) {
                // If we already have a selection UI, re-validate it
                // This helps if the user adjusts handle bars on iPad
                handleTextSelection();
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [selection]);

    const onSendClick = (overrideText) => {
        if (isReadOnly) return;
        const textToSend = typeof overrideText === 'string' ? overrideText : input;
        const hasText = Boolean(textToSend && textToSend.trim());
        const hasImages = images.length > 0;
        if (!hasText && !hasImages) return;

        const currentText = textToSend || '';
        const currentImages = cloneImagesForSend(images);

        // Clear UI immediately for instant feedback
        setInput('');
        clearImages();

        sendMessage(currentText, currentImages);
    };

    const addMarkTopic = (e) => {
        if (isReadOnly) return;
        e.stopPropagation();
        if (!selection) return;

        const text = selection.text;
        if (text) {
            onUpdate(card.id, (currentData) => {
                if (!currentData) return currentData;
                const currentMarks = currentData.marks || [];
                if (currentMarks.indexOf(text) === -1) {
                    return {
                        ...currentData,
                        marks: [...currentMarks, text]
                    };
                }
                return currentData;
            });
        }

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setSelection(null);
    };

    const handleCaptureNote = (e) => {
        if (isReadOnly) return;
        e.stopPropagation();
        if (!selection || !onCreateNote) return;

        const text = selection.text;

        // Convert captured HTML to Markdown if available
        let processedText = text;
        if (selection.html) {
            const div = document.createElement('div');
            div.appendChild(selection.html.cloneNode(true));
            const md = htmlToMarkdown(div);
            if (md) processedText = md;
        }

        if (processedText) {
            // 1. Create the note (existing logic)
            onCreateNote(processedText, true);

            // 2. Persist the highlight (New logic)
            onUpdate(card.id, (currentData) => {
                if (!currentData) return currentData;
                const currentNotes = currentData.capturedNotes || [];
                // Avoid duplicates to keep array clean
                if (currentNotes.indexOf(text) === -1) {
                    return {
                        ...currentData,
                        capturedNotes: [...currentNotes, text]
                    };
                }
                return currentData;
            });
        }

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setSelection(null);
    };

    const handleShareOpen = async (content) => {
        const isLatestBuild = await ensureLatestBuildOrRefresh({ force: true });
        if (isLatestBuild) {
            setShareContent(content);
        }
    };

    return (
        <div
            ref={modalRef}
            className={`w-full h-full flex flex-col lg:flex-row overflow-hidden relative z-10
                ${isFullScreen
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]'
                }`}
            style={{ willChange: 'auto' }}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
        >
            {/* Floating Action Menu */}
            {!isReadOnly && (
                <ChatSelectionMenu
                    selection={selection}
                    onCaptureNote={handleCaptureNote}
                    onMarkTopic={addMarkTopic}
                />
            )}

            {/* Minimal Header (Top on Mobile, Left Sidebar on Desktop) */}
            <ChatHeader
                card={card}
                onClose={onClose}
                onUpdate={onUpdate}
                onSprout={handleSproutClick}
                isSprouting={isSprouting}
                t={t}
                isReadOnly={isReadOnly}
            />

            {/* Sprout Modal Overlay */}
            <SproutModal
                isOpen={showSproutModal}
                onClose={() => setShowSproutModal(false)}
                topics={sproutTopics}
                selectedTopics={selectedTopics}
                onToggleTopic={topic => !isReadOnly && toggleTopicSelection(topic)}
                onConfirm={handleConfirmSprout}
            />

            {/* Main Content Column */}
            <div className="flex flex-col flex-grow min-w-0 h-full overflow-hidden relative">
                {/* Reader Layout Area - Flex container for content + sidebar */}
                <div className="flex flex-grow overflow-hidden relative">

                    {/* Main Content Area */}
                    <MessageList
                        card={card}
                        messagesEndRef={messagesEndRef}
                        scrollContainerRef={scrollContainerRef}
                        scrollToMessageIndexRef={scrollToMessageIndexRef}
                        isStreaming={isStreaming}
                        handleRetry={isReadOnly ? null : handleRetry}
                        parseModelOutput={parseModelOutput}
                        onUpdate={onUpdate}
                        onShare={handleShareOpen}
                        onToggleFavorite={onToggleFavorite}
                        pendingCount={pendingCount}
                        pendingMessages={pendingMessages}
                        onContinueTopic={isReadOnly ? null : () => handleContinueTopic(card.id, handleSendMessageFromSprout)}
                        onBranch={isReadOnly ? null : (msgId) => handleBranch(card.id, msgId)}
                    />

                    {/* Sidebar Index for Quick Navigation */}
                    {card.type !== 'note' && (
                        <ChatIndexSidebar
                            messages={card.data.messages || []}
                            onScrollTo={(index) => {
                                if (scrollToMessageIndexRef.current) {
                                    scrollToMessageIndexRef.current(index, { align: 'center' });
                                    return;
                                }

                                const el = document.getElementById(`message-${index}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                        />
                    )}
                </div>

                {showQueueDispatchNotice && (
                    <div className="pointer-events-none px-6 sm:px-10 pb-2">
                        <div className="mx-auto w-fit rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-[11px] font-medium text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                            {t.chat?.queueStartedHint || '队列已开始发送'}
                        </div>
                    </div>
                )}

                {/* Premium Input Bar */}
                <ChatInput
                    input={input}
                    setInput={setInput}
                    handleSend={onSendClick}
                    handlePaste={handlePaste}
                    handleImageUpload={handleImageUpload}
                    images={images}
                    removeImage={removeImage}
                    fileInputRef={fileInputRef}
                    isStreaming={isStreaming}
                    onStop={handleStop}
                    placeholder={card.type === 'note' ? t.chat.refineNote : t.chat.refineThought}
                    instructions={instructions}
                    onClearInstructions={() => { }}
                    isReadOnly={isReadOnly}
                />
            </div>

            {/* Share Modal */}
            <ShareModal
                isOpen={!!shareContent}
                onClose={() => setShareContent(null)}
                content={shareContent}
            />
        </div>
    );
}
