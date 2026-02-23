import React, { useState, useRef, useEffect } from 'react';
import { X, Star, Loader2, StickyNote, Sprout } from 'lucide-react';
// import { generateFollowUpTopics } from '../../services/llm'; // Converted to dynamic import
import { parseModelOutput } from '../../services/llm/parser';
import { isSafari, isIOS } from '../../utils/browser';
import { useStore } from '../../store/useStore';
import useImageUpload from '../../hooks/useImageUpload';
import { htmlToMarkdown } from '../../utils/htmlToMarkdown';
import { aiManager } from '../../services/ai/AIManager';
import { useAISprouting } from '../../hooks/useAISprouting';
import { useLanguage } from '../../contexts/LanguageContext';

import SproutModal from './SproutModal';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import ShareModal from '../share/ShareModal';
import ChatIndexSidebar from './ChatIndexSidebar';
import ChatSelectionMenu from './ChatSelectionMenu';
import ChatHeader from './ChatHeader';


// Stable empty array to prevent infinite re-renders from || [] pattern
const EMPTY_PENDING_MESSAGES = [];

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
    const queueWorkerActiveRef = useRef(false);
    const queueRunIdRef = useRef(0);
    const isMountedRef = useRef(true);

    // Get config from Store
    const activeId = useStore(state => state.activeId);
    const config = useStore(state => state.providers[activeId]);
    const analysisModel = useStore(state => state.getRoleModel('analysis'));

    // Store-based persistent message queue (survives ChatModal close)
    // Use stable empty array constant to prevent infinite re-renders
    const pendingMessages = useStore(state => state.pendingMessages[card.id]) || EMPTY_PENDING_MESSAGES;
    const addPendingMessage = useStore(state => state.addPendingMessage);
    const clearPendingMessages = useStore(state => state.clearPendingMessages);
    const isCardGenerating = useStore(state => state.generatingCardIds.has(card.id));
    const pendingCount = pendingMessages.length;

    const {
        images,
        setImages,
        handleImageUpload,
        handlePaste,
        removeImage,
        clearImages
    } = useImageUpload();

    const [shareContent, setShareContent] = useState(null);
    const [isQueueRunning, setIsQueueRunning] = useState(false);
    const isStreaming = isQueueRunning || isCardGenerating;
    const [isAtBottom, setIsAtBottom] = useState(true);
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const modalRef = useRef(null);

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

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Helper to send a message from Sprout (continue topic in current card)
    const handleSendMessageFromSprout = (text) => {
        if (!text || isReadOnly) return;
        const normalizedText = text.trim();
        if (!normalizedText) return;
        enqueueMessage(normalizedText, []);
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

    const scrollToBottom = (force = false) => {
        if (force || isAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: force ? "smooth" : "auto" });
        }
    };

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Use a threshold (e.g., 100px) to determine if we are at the bottom
        const atBottom = scrollTop + clientHeight >= scrollHeight - 100;
        setIsAtBottom(atBottom);
    };

    useEffect(() => {
        if (isStreaming) {
            scrollToBottom();
        }
    }, [card.data.messages, isStreaming]);

    // Force scroll to bottom on initial open
    useEffect(() => {
        setTimeout(() => scrollToBottom(true), 100);
    }, []);


    // --- Handlers Wrapper ---
    const cloneImagesForSend = (imagesToClone = []) =>
        imagesToClone.map((img) => ({
            base64: img.base64,
            mimeType: img.mimeType
        }));

    const waitForCardIdle = async (runId) => {
        while (queueRunIdRef.current === runId && useStore.getState().generatingCardIds.has(card.id)) {
            await delay(120);
        }
    };

    const runQueueWorker = async (runId) => {
        while (queueRunIdRef.current === runId) {
            await waitForCardIdle(runId);
            if (queueRunIdRef.current !== runId) break;

            const nextMsg = useStore.getState().popPendingMessage(card.id);
            if (!nextMsg) break;

            setIsAtBottom(true);
            setTimeout(() => scrollToBottom(true), 10);

            try {
                await onGenerateResponse(card.id, nextMsg.text || '', nextMsg.images || []);
            } catch (e) {
                console.error('Failed to send queued message:', e);
            }
        }
    };

    const startQueueWorker = () => {
        if (isReadOnly || queueWorkerActiveRef.current) return;

        const runId = queueRunIdRef.current + 1;
        queueRunIdRef.current = runId;
        queueWorkerActiveRef.current = true;
        if (isMountedRef.current) {
            setIsQueueRunning(true);
        }

        runQueueWorker(runId)
            .finally(() => {
                if (queueRunIdRef.current !== runId) return;
                queueWorkerActiveRef.current = false;
                if (isMountedRef.current) {
                    setIsQueueRunning(false);
                }
            });
    };

    const enqueueMessage = (text, imagesToSend = []) => {
        addPendingMessage(card.id, text, imagesToSend);
        startQueueWorker();
    };

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
        queueRunIdRef.current += 1;
        queueWorkerActiveRef.current = false;
        setIsQueueRunning(false);
        aiManager.cancelByTags([`card:${card.id}`]);
        // 清空等待队列 (from persistent store)
        clearPendingMessages(card.id);
    };

    // Resume queued messages after reopen / rerender.
    useEffect(() => {
        if (isReadOnly) return;
        if (pendingCount > 0) {
            startQueueWorker();
        }
    }, [pendingCount, card.id, isReadOnly]);

    // Reset local worker state when switching cards.
    useEffect(() => {
        queueRunIdRef.current += 1;
        queueWorkerActiveRef.current = false;
        setIsQueueRunning(false);
    }, [card.id]);

    // Cancel in-flight queue worker on unmount.
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            queueRunIdRef.current += 1;
            queueWorkerActiveRef.current = false;
        };
    }, []);

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

        // Unified path: always enqueue, then queue worker sends strictly one-by-one.
        enqueueMessage(currentText, currentImages);
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

    return (
        <div
            ref={modalRef}
            className={`w-full h-full flex flex-col lg:flex-row overflow-hidden animate-fade-in relative z-10 transition-all duration-500
                ${isFullScreen
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]'
                }`}
            style={{ willChange: 'transform, opacity' }}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
        >
            {/* Floating Action Menu */}
            {!isReadOnly && (
                <ChatSelectionMenu
                    selection={selection}
                    onCaptureNote={handleCaptureNote}
                    onMarkTopic={addMarkTopic}
                    t={t}
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
                        handleScroll={handleScroll}
                        isStreaming={isStreaming}
                        handleRetry={isReadOnly ? null : handleRetry}
                        parseModelOutput={parseModelOutput}
                        onUpdate={onUpdate}
                        onShare={(content) => setShareContent(content)}
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
                                const el = document.getElementById(`message-${index}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                        />
                    )}
                </div>

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
            />
        </div>
    );
}
