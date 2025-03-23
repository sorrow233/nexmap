import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader2, StickyNote, Sprout } from 'lucide-react';
import { streamChatCompletion, generateFollowUpTopics } from '../services/llm';
import { isSafari, isIOS } from '../utils/browser';
import { uploadImageToS3, getS3Config } from '../services/s3';

import { saveImageToIDB } from '../services/storage';

import SproutModal from './chat/SproutModal';
import ChatInput from './chat/ChatInput';
import MessageList from './chat/MessageList';

export default function ChatModal({ card, isOpen, onClose, onUpdate, onGenerateResponse, onCreateNote, onSprout }) {
    if (!isOpen || !card) return null;
    const [input, setInput] = useState('');
    const [images, setImages] = useState([]);
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
            const topics = await generateFollowUpTopics(card.data.messages);
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

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                setImages(prev => [...prev, {
                    file,
                    previewUrl: URL.createObjectURL(file), // Local preview
                    base64: e.target.result.split(',')[1],
                    mimeType: file.type
                }]);
            };
            reader.readAsDataURL(file);
        });
        // Reset input
        e.target.value = '';
    };

    const removeImage = (index) => {
        setImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].previewUrl);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    setImages(prev => [...prev, {
                        file,
                        previewUrl: URL.createObjectURL(file),
                        base64: event.target.result.split(',')[1],
                        mimeType: file.type
                    }]);
                };
                reader.readAsDataURL(file);
                e.preventDefault();
            }
        }
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

    const parseModelOutput = (text) => {
        if (typeof text !== 'string') return { thoughts: null, content: text };
        const thinkMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
        if (thinkMatch) {
            return {
                thoughts: thinkMatch[1].trim(),
                content: text.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()
            };
        }
        return { thoughts: null, content: text };
    };

    const handleSend = async () => {
        if ((!input.trim() && images.length === 0) || isStreaming) return;

        console.log('[ChatModal] handleSend called. Input:', input.substring(0, 50), 'Images count:', images.length);
        let content = input;

        // Handle Images (S3 or Base64/IDB)
        if (images.length > 0) {
            console.log('[ChatModal] Processing images. First image data length:', images[0]?.base64?.length || 0);
            const s3Config = getS3Config();
            console.log('[S3 Debug] Config loaded:', s3Config); // DEBUG
            // 1. Prepare images: Save to IDB and use reference (Non-blocking to UI but blocking to message creation)
            const processedImages = await Promise.all(images.map(async (img, idx) => {
                const imageId = `chat_${card.id}_img_${Date.now()}_${idx}`;
                console.log('[ChatModal] Saving image to IDB:', imageId);
                await saveImageToIDB(imageId, img.base64);

                return {
                    type: 'image',
                    source: {
                        type: 'idb',
                        id: imageId,
                        media_type: img.mimeType,
                        s3Url: null // Will be updated later if S3 is enabled
                    }
                };
            }));
            console.log('[ChatModal] Processed images count:', processedImages.length);

            // 2. Trigger Background Upload if enabled
            if (s3Config?.enabled) {
                console.log('[S3 Debug] Starting background upload...');
                // Store index to update the correct message later
                const msgIndex = card.data.messages.length;

                // Fire and forget - don't await
                // DON'T REMOVE base64 data - it's our fallback!
                Promise.all(images.map(img => uploadImageToS3(img.file).catch(err => {
                    // Enhanced error logging
                    if (err.isCorsError) {
                        console.warn("⚠️ [S3 Upload] CORS issue detected - images will display via base64 fallback");
                    } else {
                        console.error("❌ [S3 Upload] Upload failed:", err.message);
                    }
                    return null; // Return null for failed uploads
                }))).then(urls => {
                    console.log('[S3 Debug] Background upload complete:', urls);

                    // Check if any uploads succeeded
                    const hasSuccessfulUpload = urls.some(url => url !== null);
                    if (!hasSuccessfulUpload) {
                        console.log('💾 [S3 Debug] All S3 uploads failed, using base64 fallback');
                        return; // Don't update if all failed - base64 will be used
                    }

                    // Update the message with S3 URLs using functional update
                    // This ensures we work with the LATEST card data, avoiding stale closures
                    onUpdate(card.id, (currentData) => {
                        // Safety check: ensure we have data
                        if (!currentData || !currentData.messages) return currentData;

                        // Find the target message
                        const targetMsg = currentData.messages[msgIndex];

                        // With functional updates, this should find it IF the index is stable
                        if (!targetMsg) {
                            console.warn('[S3 Debug] Message not found at index (functional update):', msgIndex, 'Length:', currentData.messages.length);
                            return currentData;
                        }

                        // Only update if content is an array with images
                        if (Array.isArray(targetMsg.content)) {
                            const updatedContent = targetMsg.content.map((part, i) => {
                                // Map image parts. Note: content[0] is text, so images start at index 1
                                if (part.type === 'image' && part.source) {
                                    const urlIndex = i - 1; // Offset for text at index 0
                                    if (urlIndex >= 0 && urlIndex < urls.length && urls[urlIndex]) {
                                        // Only inject S3 URL if upload succeeded
                                        // Keep base64 data for fallback display
                                        return {
                                            ...part,
                                            source: {
                                                ...part.source,
                                                s3Url: urls[urlIndex] // Inject S3 URL (base64 remains)
                                            }
                                        };
                                    }
                                }
                                return part; // No change if upload failed - base64 remains
                            });
                            const updatedMessages = [...currentData.messages];
                            updatedMessages[msgIndex] = {
                                ...targetMsg,
                                content: updatedContent
                            };

                            console.log('[S3 Debug] Successfully injected S3 URLs via functional update');
                            return { ...currentData, messages: updatedMessages };
                        }
                        return currentData;
                    });
                }).catch(err => {
                    console.error("[S3 Background Upload Global Error]", err);
                });
            }

            content = [
                { type: 'text', text: input },
                ...processedImages
            ];
        }

        const userMsg = { role: 'user', content };
        const initialAssistantMsg = { role: 'assistant', content: '' };

        // Use functional update to prevent race conditions when sending multiple messages
        onUpdate(card.id, (currentData) => {
            if (!currentData) return currentData;
            return {
                ...currentData,
                messages: [...(currentData.messages || []), userMsg, initialAssistantMsg]
            };
        });

        setInput('');
        setImages([]);
        setIsStreaming(true);
        setIsAtBottom(true);
        setTimeout(() => scrollToBottom(true), 10);

        // Prepare context messages for generation (exclude the empty assistant message we just added)
        let contextMessages = [...(card.data.messages || []), userMsg];

        // [Fix] Inject card content as system context if available (crucial for Notes)
        if (card.data.content && typeof card.data.content === 'string') {
            contextMessages = [
                { role: 'system', content: `Context (Current Card Content):\n${card.data.content}` },
                ...contextMessages
            ];
        }

        try {
            // Use the parent's generator which handles context/connections
            // onGenerateResponse(card.id, newMessages, onTokenCallback)

            // If parent provided onGenerateResponse, use it. Otherwise fallback (though we should always have it now)
            if (onGenerateResponse) {
                await onGenerateResponse(card.id, contextMessages, (token) => {
                    onUpdate(card.id, (currentData) => {
                        if (!currentData) return currentData;
                        const msgs = [...currentData.messages];
                        const lastMsg = msgs[msgs.length - 1];
                        msgs[msgs.length - 1] = { ...lastMsg, content: lastMsg.content + token };
                        return { ...currentData, messages: msgs };
                    });
                });
            } else {
                // Fallback (legacy)
                await streamChatCompletion(contextMessages, (token) => {
                    onUpdate(card.id, (currentData) => {
                        if (!currentData) return currentData;
                        const msgs = [...currentData.messages];
                        const lastMsg = msgs[msgs.length - 1];
                        msgs[msgs.length - 1] = { ...lastMsg, content: lastMsg.content + token };
                        return { ...currentData, messages: msgs };
                    });
                });
            }

        } catch (error) {
            console.error(error);
            onUpdate(card.id, (currentData) => {
                if (!currentData) return currentData;
                const msgs = [...currentData.messages];
                const lastMsg = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...lastMsg, content: "⚠️ Error: " + error.message };
                return { ...currentData, messages: msgs };
            });
        } finally {
            setIsStreaming(false);
        }
    };

    const handleRetry = async () => {
        if (isStreaming) return;

        // Find the last assistant message (which should be the error)
        const messages = [...card.data.messages];
        if (messages.length < 2) return;

        const lastAssistantIndex = messages.findLastIndex(m => m.role === 'assistant');
        if (lastAssistantIndex === -1) return;

        // Pop all messages after the last user message that caused the error
        // Or just pop the error content
        const truncatedMessages = messages.slice(0, lastAssistantIndex);
        const freshAssistantMsg = { role: 'assistant', content: '' };

        // Update state with functional update
        onUpdate(card.id, (currentData) => {
            if (!currentData) return currentData;
            return {
                ...currentData,
                messages: [...truncatedMessages, freshAssistantMsg]
            };
        });
        setIsStreaming(true);

        const contextForAI = (card.data.content && typeof card.data.content === 'string')
            ? [{ role: 'system', content: `Context (Current Card Content):\n${card.data.content}` }, ...truncatedMessages]
            : truncatedMessages;

        try {
            // Re-trigger the generation logic
            if (onGenerateResponse) {
                await onGenerateResponse(card.id, contextForAI, (token) => {
                    onUpdate(card.id, (currentData) => {
                        if (!currentData) return currentData;
                        const msgs = [...currentData.messages];
                        const lastMsg = msgs[msgs.length - 1];
                        msgs[msgs.length - 1] = { ...lastMsg, content: lastMsg.content + token };
                        return { ...currentData, messages: msgs };
                    });
                });
            } else {
                await streamChatCompletion(contextForAI, (token) => {
                    onUpdate(card.id, (currentData) => {
                        if (!currentData) return currentData;
                        const msgs = [...currentData.messages];
                        const lastMsg = msgs[msgs.length - 1];
                        msgs[msgs.length - 1] = { ...lastMsg, content: lastMsg.content + token };
                        return { ...currentData, messages: msgs };
                    });
                });
            }
        } catch (error) {
            console.error('[Retry Error]', error);
            onUpdate(card.id, (currentData) => {
                if (!currentData) return currentData;
                const msgs = [...currentData.messages];
                const lastMsg = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...lastMsg, content: "⚠️ Error: " + error.message };
                return { ...currentData, messages: msgs };
            });
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
                />

                {/* Premium Input Bar */}
                <ChatInput
                    input={input}
                    setInput={setInput}
                    handleSend={handleSend}
                    handlePaste={handlePaste}
                    handleImageUpload={handleImageUpload}
                    images={images}
                    removeImage={removeImage}
                    fileInputRef={fileInputRef}
                    isStreaming={isStreaming}
                    placeholder={card.type === 'note' ? "Ask AI to refine this note..." : "Refine this thought..."}
                />
            </div>
        </div>
    );
}
