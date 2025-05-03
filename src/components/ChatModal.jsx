import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader2, StickyNote, Sprout, Star } from 'lucide-react';
import { generateFollowUpTopics } from '../services/llm';
import { parseModelOutput } from '../services/llm/parser';
import { isSafari, isIOS } from '../utils/browser';
import { useStore } from '../store/useStore';

import useImageUpload from '../hooks/useImageUpload';

import SproutModal from './chat/SproutModal';
import ChatInput from './chat/ChatInput';
import MessageList from './chat/MessageList';
import ShareModal from './share/ShareModal';

export default function ChatModal({ card, isOpen, onClose, onUpdate, onGenerateResponse, onCreateNote, onSprout, onToggleFavorite }) {
    if (!isOpen || !card) return null;
    const [input, setInput] = useState('');

    // Get config from Store
    const activeId = useStore(state => state.activeId);
    const providers = useStore(state => state.providers);
    const config = providers[activeId];
    const analysisModel = useStore(state => state.getRoleModel('analysis'));

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

    const handleSproutClick = async () => {
        if (isSprouting) return;
        setIsSprouting(true);
        try {
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
        if (isOpen) {
            setTimeout(() => scrollToBottom(true), 100);
        }
    }, [isOpen]);


    // --- Handlers Wrapper ---
    const onSendClick = async () => {
        if ((!input.trim() && images.length === 0)) return;
        const currentInput = input;
        const currentImages = [...images];
        setInput(''); // Immediate UI clear
        clearImages();
        setIsAtBottom(true);
        setIsStreaming(true);
        setTimeout(() => scrollToBottom(true), 10);

        try {
            await onGenerateResponse(card.id, currentInput, currentImages);
        } catch (e) {
            console.error('Failed to send message:', e);
        } finally {
            setIsStreaming(false);
        }
    };

    const handleRetry = async () => {
        const lastUserMessage = card.data.messages?.filter(m => m.sender === 'user').pop();
        if (!lastUserMessage) return;

        setIsStreaming(true);
        try {
            await onGenerateResponse(card.id, lastUserMessage.text, lastUserMessage.images || []);
        } catch (e) {
            console.error('Failed to retry:', e);
        } finally {
            setIsStreaming(false);
        }
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
        if (!isOpen) return;

        const handleSelectionChange = () => {
            if (selection) {
                // If we already have a selection UI, re-validate it
                // This helps if the user adjusts handle bars on iPad
                handleTextSelection();
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [isOpen, selection]);

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

        onCreateNote(selection.text, true);

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setSelection(null);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4"
            style={{ perspective: '1000px' }}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
        >
            <div
                className={`absolute inset-0 transition-opacity-blur ${isSafari || isIOS ? 'bg-slate-950/90' : 'bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md'}`}
                onClick={onClose}
            />

            <div
                ref={modalRef}
                className={`w-full max-w-[1100px] h-full sm:h-[92vh] sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-fade-in relative z-10 transition-all duration-500
                    ${isSafari || isIOS ? 'bg-white dark:bg-slate-900 border-slate-300' : 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border-slate-200 dark:border-white/10'} border`}
                style={{ willChange: 'transform, opacity' }}
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
                            Capture as Note
                        </button>
                        <button
                            onClick={addMarkTopic}
                            className="bg-brand-600 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 hover:bg-brand-500 transition-all hover:scale-105 active:scale-95 border border-white/10"
                        >
                            <Sparkles size={14} />
                            Mark Topic
                        </button>
                    </div>
                )}

                {/* Minimal Header */}
                <div className="h-20 px-10 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-6 flex-grow">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 ${card.type === 'note' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/20' : 'bg-gradient-to-br from-brand-600 to-brand-700 shadow-brand-500/20'}`}>
                            {card.type === 'note' ? <StickyNote size={24} className="text-white" /> : <Sparkles size={24} className="text-white" />}
                        </div>
                        <div className="flex-grow min-w-0">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-2xl tracking-tight leading-tight truncate font-sans">
                                {card.data.title || (card.type === 'note' ? 'Insight Archive' : 'Conversation')}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-600 dark:text-brand-400">
                                    {card.type === 'note' ? 'Neural Notepad' : 'Neural Reader'}
                                </span>
                                {card.type === 'note' && (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Captured Insight</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {card.data.marks?.length > 0 && (
                            <button
                                onClick={() => onUpdate(card.id, (currentData) => ({ ...currentData, marks: [] }))}
                                className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full"
                            >
                                Clear Marks ({card.data.marks.length})
                            </button>
                        )}
                        {/* Sprout Button */}
                        <button
                            onClick={handleSproutClick}
                            disabled={isSprouting || isStreaming}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all
                                ${isSprouting
                                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20'
                                }`}
                        >
                            {isSprouting ? <Loader2 size={14} className="animate-spin" /> : <Sprout size={14} />}
                            {isSprouting ? 'Thinking...' : 'Sprout Ideas'}
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

                {/* Reader Layout Area */}
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
                />

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
                    placeholder={card.type === 'note' ? "Ask AI to refine this note..." : "Refine this thought..."}
                />

                {/* Share Modal */}
                <ShareModal
                    isOpen={!!shareContent}
                    onClose={() => setShareContent(null)}
                    content={shareContent}
                />
            </div>
        </div>
    );
}
