import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader2, StickyNote, Sprout } from 'lucide-react';
// import { generateFollowUpTopics } from '../../services/llm'; // Converted to dynamic import
import { parseModelOutput } from '../../services/llm/parser';
import { isSafari, isIOS } from '../../utils/browser';
import { useStore } from '../../store/useStore';
import useImageUpload from '../../hooks/useImageUpload';
import { htmlToMarkdown } from '../../utils/htmlToMarkdown';
import { aiManager } from '../../services/ai/AIManager';
import { useAISprouting } from '../../hooks/useAISprouting';
import { useLanguage } from '../../contexts/LanguageContext';

import SproutModal from '../chat/SproutModal';
import ChatInput from '../chat/ChatInput';
import MessageList from '../chat/MessageList';
import ShareModal from '../share/ShareModal';
import ChatIndexSidebar from '../chat/ChatIndexSidebar';

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
    isFullScreen = false
}) {
    const [input, setInput] = useState('');

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
        if (!text) return;
        // Trigger the normal message flow
        onGenerateResponse(card.id, text, []);
    };

    const handleSproutClick = async () => {
        if (isSprouting) return;
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
        setSelectedTopics(prev =>
            prev.includes(topic)
                ? prev.filter(t => t !== topic)
                : [...prev, topic]
        );
    };

    const handleConfirmSprout = () => {
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
    // 核心发送逻辑（内部使用）
    const sendMessageInternal = async (textToSend, imagesToSend) => {
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
            setIsStreaming(false);

            // 处理队列中的下一条消息 (from persistent store)
            const nextMsg = popPendingMessage(card.id);
            if (nextMsg) {
                // 延迟一点调用，让UI有时间更新
                setTimeout(() => {
                    sendMessageInternal(nextMsg.text, nextMsg.images);
                }, 100);
            }
        }
    };

    const onSendClick = async () => {
        if ((!input.trim() && images.length === 0)) return;

        const currentInput = input;
        const currentImages = [...images];
        console.log('[ChatView] onSendClick - clearing', images.length, 'images');
        setInput(''); // Immediate UI clear
        clearImages();

        // 如果正在 streaming，将消息加入等待队列 (persistent store)
        if (isStreaming) {
            addPendingMessage(card.id, currentInput, currentImages);
            return;
        }

        // 否则立即发送
        await sendMessageInternal(currentInput, currentImages);
    };

    const handleRetry = async () => {
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
        console.log('[ChatView] Stopping generation for card:', card.id);
        aiManager.cancelByTags([`card:${card.id}`]);
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

    const addMarkTopic = (e) => {
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
                // Avoid duplicates to keep array clean (check against raw text to allow repeated structure if content diff? 
                // actually stick with text check for simplicitly or rely on id)
                if (currentNotes.indexOf(text) === -1) {
                    return {
                        ...currentData,
                        capturedNotes: [...currentNotes, text] // Keep raw text for highlight matching?
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
            {selection && (
                <div
                    className="fixed z-[110] flex gap-2 -translate-x-1/2 -translate-y-[130%] animate-bounce-in transition-all"
                    style={{
                        top: selection.rect.top,
                        left: selection.rect.left
                    }}
                >
                    <button
                        onClick={handleCaptureNote}
                        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95"
                    >
                        <StickyNote size={14} className="text-brand-500" />
                        {t.chat.captureAsNote}
                    </button>
                    <button
                        onClick={addMarkTopic}
                        className="bg-brand-600 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 hover:bg-brand-500 transition-all hover:scale-105 active:scale-95 border border-white/10"
                    >
                        <Sparkles size={14} />
                        {t.chat.markTopic}
                    </button>
                </div>
            )}

            {/* Minimal Header (Top on Mobile, Left Sidebar on Desktop) */}
            <div className="shrink-0 z-20 w-full h-20 px-6 flex flex-row items-center justify-between border-b border-slate-100 dark:border-white/5
                lg:w-16 lg:h-full lg:flex-col lg:justify-between lg:py-8 lg:px-0 lg:border-none transition-all group/sidebar">

                {/* Top/Left Section: Icon & Title */}
                <div className="flex items-center gap-4 lg:flex-col lg:gap-8 opacity-40 group-hover/sidebar:opacity-100 transition-all duration-500">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 shrink-0 ${card.type === 'note' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/20' : 'bg-gradient-to-br from-brand-600 to-brand-700 shadow-brand-500/20'}`}>
                        {card.type === 'note' ? <StickyNote size={24} className="text-white" /> : <Sparkles size={24} className="text-white" />}
                    </div>

                    <div className="flex flex-col min-w-0 lg:hidden">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight leading-tight truncate font-sans">
                            {card.data.title || (card.type === 'note' ? t.chat.insightArchive : t.chat.conversation)}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-600 dark:text-brand-400">
                                {card.type === 'note' ? t.chat.neuralNotepad : t.chat.neuralReader}
                            </span>
                        </div>
                    </div>

                    {/* Desktop Vertical Title */}
                    <div className="hidden lg:block [writing-mode:vertical-rl] text-center font-bold text-slate-300 dark:text-slate-600 tracking-[0.4em] text-xs select-none cursor-default opacity-0 group-hover/sidebar:opacity-100 transition-all duration-700 max-h-[50vh] overflow-hidden whitespace-nowrap">
                        {card.data.title || (card.type === 'note' ? t.chat.insightArchive : t.chat.conversation)}
                    </div>
                </div>

                {/* Bottom/Right Section: Actions */}
                <div className="flex items-center gap-3 lg:flex-col lg:gap-4 lg:mb-2 opacity-30 group-hover/sidebar:opacity-100 transition-all duration-500">
                    {card.data.marks?.length > 0 && (
                        <button
                            onClick={() => onUpdate(card.id, (currentData) => ({ ...currentData, marks: [] }))}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            title="Clear Marks"
                        >
                            <span className="text-[10px] font-bold">{card.data.marks.length}</span>
                        </button>
                    )}

                    {/* Sprout Button */}
                    <button
                        onClick={handleSproutClick}
                        disabled={isSprouting || isStreaming}
                        className={`group flex items-center justify-center gap-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all
                            ${isSprouting
                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 w-10 h-10 lg:w-12 lg:h-12'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 h-10 px-4 lg:px-0 lg:w-12 lg:h-12'
                            }`}
                        title="Sprout Ideas"
                    >
                        {isSprouting ? <Loader2 size={18} className="animate-spin" /> : <Sprout size={18} />}
                        <span className="lg:hidden">{isSprouting ? 'Thinking...' : 'Sprout'}</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Sprout Modal Overlay */}
            <SproutModal
                isOpen={showSproutModal}
                onClose={() => setShowSproutModal(false)}
                topics={sproutTopics}
                selectedTopics={selectedTopics}
                onToggleTopic={toggleTopicSelection}
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
                        handleRetry={handleRetry}
                        parseModelOutput={parseModelOutput}
                        onUpdate={onUpdate}
                        onShare={(content) => setShareContent(content)}
                        onToggleFavorite={onToggleFavorite}
                        pendingCount={pendingCount}
                        onContinueTopic={() => handleContinueTopic(card.id, handleSendMessageFromSprout)}
                        onBranch={() => handleBranch(card.id)}
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

