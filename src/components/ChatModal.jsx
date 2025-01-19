import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, ChevronDown, Image as ImageIcon, Paperclip, StickyNote, RefreshCw } from 'lucide-react';
import { chatCompletion, streamChatCompletion } from '../services/llm';
import { marked } from 'marked';

import { uploadImageToS3, getS3Config } from '../services/s3';

export default function ChatModal({ card, isOpen, onClose, onUpdate, onGenerateResponse, onCreateNote }) {
    if (!isOpen || !card) return null;
    const [input, setInput] = useState('');
    const [images, setImages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        scrollToBottom();
    }, [card.data.messages, card.data.messages.length, isStreaming]);

    const handleSend = async () => {
        if ((!input.trim() && images.length === 0) || isStreaming) return;

        console.log('[ChatModal] handleSend called. Input:', input.substring(0, 50), 'Images count:', images.length);
        let content = input;

        // Handle Images (S3 or Base64)
        if (images.length > 0) {
            console.log('[ChatModal] Processing images. First image data length:', images[0]?.base64?.length || 0);
            const s3Config = getS3Config();
            console.log('[S3 Debug] Config loaded:', s3Config); // DEBUG
            // 1. Prepare images immediately with base64 (Non-blocking)
            let processedImages = images.map(img => {
                console.log('[ChatModal] Processing image:', img.mimeType, 'base64 length:', img.base64?.length || 0);
                return {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mimeType,
                        data: img.base64,
                        s3Url: null // Will be updated later if S3 is enabled
                    }
                };
            });
            console.log('[ChatModal] Processed images count:', processedImages.length);

            // 2. Trigger Background Upload if enabled
            if (s3Config?.enabled) {
                console.log('[S3 Debug] Starting background upload...');
                // Store index to update the correct message later
                const msgIndex = card.data.messages.length;

                // Fire and forget - don't await
                Promise.all(images.map(img => uploadImageToS3(img.file).catch(err => {
                    console.error("Single image upload failed", err);
                    return null;
                }))).then(urls => {
                    console.log('[S3 Debug] Background upload complete:', urls);

                    // Update the message with S3 URLs
                    // Note: onUpdate expects an object, not a function
                    // We need to construct the updated data structure directly
                    const msgIndex = card.data.messages.length;

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
                                        return {
                                            ...part,
                                            source: {
                                                ...part.source,
                                                s3Url: urls[urlIndex] // Inject S3 URL
                                            }
                                        };
                                    }
                                }
                                return part;
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

        const updatedMessages = [...card.data.messages, userMsg, initialAssistantMsg];

        // Optimistic update
        onUpdate(card.id, { ...card.data, messages: updatedMessages });
        setInput('');
        setImages([]);
        setIsStreaming(true);

        // Helper to update the last message in the card
        const appendToken = (token) => {
            onUpdate(card.id, (currentData) => {
                if (!currentData) return currentData; // safety
                const msgs = [...currentData.messages];
                const lastMsg = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...lastMsg, content: lastMsg.content + token };
                return { ...currentData, messages: msgs };

            });
        };

        const parseModelOutput = (text) => {
            // Simple parsing to separate thoughts from content if needed
            // For now just return as is or implement thinking tag parsing
            const thinkMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
            if (thinkMatch) {
                return {
                    thoughts: thinkMatch[1].trim(),
                    content: text.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()
                };
            }
            return { thoughts: null, content: text };
        };

        try {
            // Use the parent's generator which handles context/connections
            // onGenerateResponse(card.id, newMessages, onTokenCallback)
            const contextMessages = updatedMessages.slice(0, -1);

            // If parent provided onGenerateResponse, use it. Otherwise fallback (though we should always have it now)
            if (onGenerateResponse) {
                let accumulatedContent = "";
                await onGenerateResponse(card.id, contextMessages, (token) => {
                    accumulatedContent += token;
                    const newMessages = [...contextMessages, { role: 'assistant', content: accumulatedContent }];
                    onUpdate(card.id, { ...card.data, messages: newMessages });
                });
            } else {
                // Fallback (legacy)
                let accumulatedContent = "";
                await streamChatCompletion(contextMessages, (token) => {
                    accumulatedContent += token;
                    const newMessages = [...contextMessages, { role: 'assistant', content: accumulatedContent }];
                    onUpdate(card.id, { ...card.data, messages: newMessages });
                });
            }

        } catch (error) {
            console.error(error);
            const errorMessages = [...updatedMessages];
            errorMessages[errorMessages.length - 1].content = "⚠️ Error: " + error.message;
            onUpdate(card.id, { ...card.data, messages: errorMessages });
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
        const newMessages = [...truncatedMessages, freshAssistantMsg];

        // Update state
        onUpdate(card.id, { ...card.data, messages: newMessages });
        setIsStreaming(true);

        try {
            // Re-trigger the generation logic
            if (onGenerateResponse) {
                let accumulatedContent = "";
                await onGenerateResponse(card.id, truncatedMessages, (token) => {
                    accumulatedContent += token;
                    const updatedWithStream = [...truncatedMessages, { role: 'assistant', content: accumulatedContent }];
                    onUpdate(card.id, { ...card.data, messages: updatedWithStream });
                });
            } else {
                let accumulatedContent = "";
                await streamChatCompletion(truncatedMessages, (token) => {
                    accumulatedContent += token;
                    const updatedWithStream = [...truncatedMessages, { role: 'assistant', content: accumulatedContent }];
                    onUpdate(card.id, { ...card.data, messages: updatedWithStream });
                });
            }
        } catch (error) {
            console.error('[Retry Error]', error);
            const errorMessages = [...newMessages];
            errorMessages[errorMessages.length - 1].content = "⚠️ Error: " + error.message;
            onUpdate(card.id, { ...card.data, messages: errorMessages });
        } finally {
            setIsStreaming(false);
        }
    };

    const [selection, setSelection] = useState(null);
    const modalRef = useRef(null);

    const handleTextSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0 && !isStreaming) {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            // Ensure the selection is within our messages container
            const container = modalRef.current?.querySelector('.messages-container');
            if (container && container.contains(range.commonAncestorContainer)) {
                setSelection({
                    text: sel.toString().trim(), // Added trim here
                    rect: {
                        top: rect.top,
                        left: rect.left + rect.width / 2
                    }
                });
                return;
            }
        }
        setSelection(null);
    };

    const addMarkTopic = (e) => {
        e.stopPropagation();
        if (!selection) return;

        const text = selection.text;
        const currentMarks = card.data.marks || [];
        if (text && !currentMarks.includes(text)) {
            onUpdate(card.id, {
                ...card.data,
                marks: [...currentMarks, text]
            });
        }

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setSelection(null);
    };

    const handleCaptureNote = (e) => {
        e.stopPropagation();
        if (!selection || !onCreateNote) return;

        onCreateNote(selection.text);

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setSelection(null);
    };

    // Helper to render content with highlights safely
    const renderContent = (content) => {
        if (!content) return '';
        let html = marked ? marked.parse(content) : content;

        if (!card.data.marks || card.data.marks.length === 0) return html;

        // Sort marks by length descending to match longest phrases first (prevents substring issues)
        const sortedMarks = [...card.data.marks].sort((a, b) => b.length - a.length);

        // Create a temporary element to process text nodes without breaking HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const container = doc.body.firstChild;

        const highlightNode = (node) => {
            if (node.nodeType === 3) { // Text node
                let text = node.nodeValue;
                let hasChange = false;

                // We use a simple string replace for now but we could be more careful.
                // To avoid recursive marking, we'll process each text node once.
                let newHtml = text;

                sortedMarks.forEach(mark => {
                    const escapedMark = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(${escapedMark})`, 'gi');
                    // Check if mark exists in text
                    if (regex.test(newHtml)) {
                        newHtml = newHtml.replace(regex, '___MARK_START___$1___MARK_END___');
                        hasChange = true;
                    }
                });

                if (hasChange) {
                    const span = doc.createElement('span');
                    // Escape HTML in the text before inserting placeholders
                    const escapedText = newHtml
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/___MARK_START___/g, '<mark class="bg-yellow-200/60 dark:bg-yellow-500/30 text-inherit px-1 rounded-sm border-b border-yellow-400/50">')
                        .replace(/___MARK_END___/g, '</mark>');
                    span.innerHTML = escapedText;
                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === 1 && node.tagName !== 'MARK') {
                Array.from(node.childNodes).forEach(highlightNode);
            }
        };

        Array.from(container.childNodes).forEach(highlightNode);
        return container.innerHTML;
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4"
            style={{ perspective: '1000px' }}
            onMouseUp={handleTextSelection}
        >
            <div
                className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            <div
                ref={modalRef}
                className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl w-full max-w-[1100px] h-full sm:h-[92vh] sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col border border-slate-200 dark:border-white/10 overflow-hidden animate-fade-in relative z-10 transition-all duration-500"
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
                                onClick={() => onUpdate(card.id, { ...card.data, marks: [] })}
                                className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full"
                            >
                                Clear Marks ({card.data.marks.length})
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Reader Layout Area */}
                <div className="messages-container flex-grow overflow-y-auto px-6 sm:px-10 py-12 custom-scrollbar transition-colors">
                    <div className="reader-width">
                        {card.type === 'note' ? (
                            <div className="animate-fade-in">
                                <textarea
                                    value={card.data.content || ''}
                                    onChange={(e) => onUpdate(card.id, { ...card.data, content: e.target.value })}
                                    className="w-full bg-transparent border-none outline-none font-lxgw leading-[2.5] text-[1.1rem] text-slate-800 dark:text-slate-100 resize-none h-[calc(100vh-320px)] custom-scrollbar"
                                    placeholder="Start writing..."
                                />
                            </div>
                        ) : (
                            <div className="space-y-16">
                                {card.data.messages.map((m, i) => {
                                    const isUser = m.role === 'user';
                                    let textContent = "";
                                    let msgImages = [];

                                    if (Array.isArray(m.content)) {
                                        m.content.forEach(part => {
                                            if (part.type === 'text') textContent += part.text;
                                            if (part.type === 'image') msgImages.push(part);
                                        });
                                    } else {
                                        textContent = m.content || "";
                                    }

                                    const { thoughts, content } = (isUser || !textContent)
                                        ? { thoughts: null, content: textContent }
                                        : parseModelOutput(textContent);

                                    if (isUser) {
                                        return (
                                            <div key={i} className="animate-fade-in group">
                                                <div className="user-prompt">
                                                    {/* Image Rendering for User */}
                                                    {msgImages.length > 0 && (
                                                        <div className="flex flex-wrap gap-4 mb-6">
                                                            {msgImages.map((img, idx) => {
                                                                let imgSrc = img.source.type === 'base64'
                                                                    ? `data:${img.source.media_type};base64,${img.source.data}`
                                                                    : (img.source.s3Url || img.source.url);
                                                                return imgSrc ? (
                                                                    <img key={idx} src={imgSrc} alt="Input" className="h-32 w-auto rounded-2xl border border-white/10 shadow-lg" />
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
                                                    <p className="text-lg leading-relaxed">{textContent}</p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={i} className="animate-slide-up group relative">
                                            {thoughts && (
                                                <div className="mb-10">
                                                    <details className="group/think">
                                                        <summary className="text-[10px] font-black text-brand-500/60 dark:text-brand-400/40 cursor-pointer list-none flex items-center gap-3 hover:text-brand-500 transition-all uppercase tracking-[0.3em]">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                                                            Monologue
                                                            <ChevronDown size={12} className="group-open/think:rotate-180 transition-transform opacity-50" />
                                                        </summary>
                                                        <div className="mt-4 p-8 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] text-sm font-sans text-slate-500 dark:text-slate-400 whitespace-pre-wrap border border-slate-200 dark:border-white/5 leading-relaxed italic overflow-hidden">
                                                            {thoughts}
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                            <div
                                                className="prose dark:prose-invert"
                                                dangerouslySetInnerHTML={{
                                                    __html: content
                                                        ? renderContent(content)
                                                        : (!thoughts ? '<span class="opacity-30 italic font-sans">Synthesizing...</span>' : '<span class="opacity-30 italic font-sans">Deep thoughts complete. Formulating...</span>')
                                                }}
                                            />
                                            {/* Retry Button for Errors */}
                                            {!isStreaming && content && (content.includes('⚠️ Error:') || content.includes('Error: Native API Error')) && (
                                                <div className="mt-6 animate-fade-in">
                                                    <button
                                                        onClick={handleRetry}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-brand-600/10 hover:bg-brand-600/20 text-brand-600 dark:text-brand-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border border-brand-500/20"
                                                    >
                                                        <RefreshCw size={14} className={isStreaming ? 'animate-spin' : ''} />
                                                        Retry Generation
                                                    </button>
                                                    <p className="text-[10px] text-slate-400 mt-2 ml-1 italic">
                                                        If error persists, check your API key or try another model in settings.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {isStreaming && (
                                    <div className="pt-8 flex justify-start">
                                        <div className="flex gap-2 items-center text-brand-500/40 dark:text-brand-400/30">
                                            <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0s]" />
                                            <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] ml-2">Streaming Intelligence</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} className="h-32" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Premium Input Bar */}
                <div className="p-8 pb-10 sm:px-10 shrink-0">
                    <div className="reader-width relative group">
                        {images.length > 0 && (
                            <div className="flex gap-4 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative shrink-0 group/img">
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                        <img src={img.previewUrl} alt="Preview" className="h-24 w-auto rounded-2xl border-2 border-brand-500 shadow-xl" />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="relative bg-slate-100/50 dark:bg-white/5 backdrop-blur-md rounded-[2rem] p-4 flex gap-4 items-center focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-4 ring-brand-500/10 border border-transparent focus-within:border-brand-500/20 transition-all duration-300">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                onPaste={handlePaste}
                                className="flex-grow bg-transparent outline-none resize-none h-12 py-3 px-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans text-lg"
                                placeholder={card.type === 'note' ? "Ask AI to refine this note..." : "Refine this thought..."}
                            />

                            <div className="flex items-center gap-2 pr-2">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isStreaming}
                                    className="p-3 text-slate-400 hover:text-brand-500 hover:bg-brand-500/5 rounded-2xl transition-all"
                                >
                                    <ImageIcon size={22} />
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={isStreaming || (!input.trim() && images.length === 0)}
                                    className="w-14 h-14 bg-brand-600 text-white rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-500 hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-30 disabled:scale-100 transition-all flex items-center justify-center shrink-0"
                                >
                                    <Send size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

if (typeof window !== 'undefined') window.ChatModal = ChatModal;
