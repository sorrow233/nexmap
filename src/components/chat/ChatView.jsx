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
    const isQueueProcessingRef = useRef(false);

    // Get config from Store
    const activeId = useStore(state => state.activeId);
    const config = useStore(state => state.providers[activeId]);
    const analysisModel = useStore(state => state.getRoleModel('analysis'));

    // Store-based persistent message queue (survives ChatModal close)
    // Use stable empty array constant to prevent infinite re-renders
    const pendingMessages = useStore(state => state.pendingMessages[card.id]) || EMPTY_PENDING_MESSAGES;
    const addPendingMessage = useStore(state => state.addPendingMessage);
    const popPendingMessage = useStore(state => state.popPendingMessage);
    const clearPendingMessages = useStore(state => state.clearPendingMessages);
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
    const [isStreaming, setIsStreaming] = useState(false);
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

    // Helper to send a message from Sprout (continue topic in current card)
    const handleSendMessageFromSprout = (text) => {
        if (!text || isReadOnly) return;
        const normalizedText = text.trim();
        if (!normalizedText) return;

        if (isStreaming || isQueueProcessingRef.current) {
            addPendingMessage(card.id, normalizedText, []);
            return;
        }

        sendMessageInternal(normalizedText, []);
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

    // 核心发送逻辑（内部使用）
    const sendMessageInternal = async (textToSend, imagesToSend) => {
        if (isReadOnly) return;
        isQueueProcessingRef.current = true;
        const currentInput = textToSend;
        const currentImages = [...imagesToSend];
        setIsAtBottom(true);
        setIsStreaming(true);
        setTimeout(() => scrollToBottom(true), 10);

        try {
            await onGenerateResponse(card.id, currentInput, currentImages);
        } catch (e) {
            console.error('Failed to send message:', e);
        } finally {
            // 处理队列中的下一条消息 (from persistent store)
            const nextMsg = popPendingMessage(card.id);
            if (nextMsg) {
                // 延迟一点调用，让UI有时间更新
                setTimeout(() => {
                    sendMessageInternal(nextMsg.text, nextMsg.images || []);
                }, 100);
                return;
            }

            isQueueProcessingRef.current = false;
            setIsStreaming(false);
        }
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

        setIsStreaming(true);
        try {
            await onGenerateResponse(card.id, textContent, imageContent);
        } catch (e) {
            console.error('Failed to retry:', e);
        } finally {
            setIsStreaming(false);
        }
    };

    // 停止生成
    const handleStop = () => {
        if (isReadOnly) return;
        console.log('[ChatView] Stopping generation for card:', card.id);
        aiManager.cancelByTags([`card:${card.id}`]);
        isQueueProcessingRef.current = false;
        setIsStreaming(false);
        // 清空等待队列 (from persistent store)
        clearPendingMessages(card.id);
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

    const onSendClick = async (overrideText) => {
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

        // If currently streaming, queue it and auto-send after current response.
        if (isStreaming || isQueueProcessingRef.current) {
            addPendingMessage(card.id, currentText, currentImages);
            return;
        }

        // Send message in background (handled by internal streaming state)
        await sendMessageInternal(currentText, currentImages);
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
