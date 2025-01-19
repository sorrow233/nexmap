import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, ChevronDown, Image as ImageIcon, Paperclip } from 'lucide-react';
import { chatCompletion, streamChatCompletion } from '../services/llm';
import { marked } from 'marked';

import { uploadImageToS3, getS3Config } from '../services/s3';

export default function ChatModal({ card, isOpen, onClose, onUpdate, onGenerateResponse }) {
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

        let content = input;

        // Handle Images (S3 or Base64)
        if (images.length > 0) {
            const s3Config = getS3Config();
            let processedImages = [];

            if (s3Config?.enabled) {
                // S3 Upload Mode
                try {
                    // TODO: Show upload progress UI
                    const uploads = await Promise.all(images.map(img => uploadImageToS3(img.file)));
                    processedImages = uploads.map((url, i) => ({
                        type: 'image',
                        source: {
                            type: 'url',
                            url: url,
                            media_type: images[i].mimeType
                        }
                    }));
                } catch (error) {
                    console.error("S3 Upload Failed:", error);
                    alert(`Failed to upload images to S3: ${error.message}\nPlease check your settings or disable S3 storage.`);
                    return; // Abort send
                }
            } else {
                // Legacy Base64 Mode
                processedImages = images.map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mimeType,
                        data: img.base64
                    }
                }));
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ perspective: '1000px', fontFamily: '"LXGW WenKai", "楷体", "KaiTi", serif' }}>
            <div
                className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl w-[900px] max-w-full h-[85vh] rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-white/10 overflow-hidden animate-fade-in relative z-10 font-sans transition-colors duration-500">

                {/* Header */}
                <div className="h-20 px-8 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight leading-tight">
                                {card.data.title || 'New Conversation'}
                            </h3>
                            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-600 dark:text-brand-400/60 mt-0.5">Neural Canvas Mode</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/30">
                    {card.data.messages.map((m, i) => {
                        const isUser = m.role === 'user';

                        // Handle multimodal content (array) vs string
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

                        return (
                            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
                                <div className={`
                                    max-w-[85%] sm:max-w-[80%] 
                                    p-5 sm:p-6 
                                    rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.05)] text-sm sm:text-base leading-relaxed
                                    ${isUser
                                        ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-none shadow-brand-500/10'
                                        : 'bg-white dark:bg-slate-800/80 backdrop-blur-md text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-white/5'
                                    }
                                    transition-transform duration-200 hover:scale-[1.005]
                                `}>
                                    {/* Image Rendering */}
                                    {msgImages.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {msgImages.map((img, idx) => (
                                                <img
                                                    key={idx}
                                                    src={`data:${img.source.media_type};base64,${img.source.data}`}
                                                    alt="User Upload"
                                                    className="max-w-full h-auto max-h-[300px] rounded-xl border border-white/20"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {thoughts && (
                                        <details className="mb-4 group/think">
                                            <summary className="text-xs font-bold text-brand-600 dark:text-brand-400/50 cursor-pointer list-none flex items-center gap-2 hover:text-brand-700 dark:hover:text-brand-400 transition-all uppercase tracking-widest">
                                                <div className="w-1 h-1 rounded-full bg-brand-400 animate-ping"></div>
                                                Thinking Process
                                                <ChevronDown size={10} className="group-open/think:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="mt-3 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-2xl text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap border border-slate-200 dark:border-white/5 leading-relaxed italic">
                                                {thoughts}
                                            </div>
                                        </details>
                                    )}
                                    <div
                                        className={`prose max-w-none text-sm sm:text-[15px] font-lxgw ${isUser ? 'user-bubble prose-invert' : 'dark:prose-invert prose-slate'}`}
                                        dangerouslySetInnerHTML={{
                                            __html: content
                                                ? (marked ? marked.parse(content) : content)
                                                : (isUser ? '' : (!thoughts ? '<span class="opacity-50 italic">Synthesizing...</span>' : '<span class="opacity-50 italic">Finishing execution...</span>'))
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {isStreaming && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-brand-50 dark:bg-brand-900/20 px-5 py-2.5 rounded-full text-xs font-bold text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-1 h-1 bg-brand-500 dark:bg-brand-400 rounded-full animate-bounce"></span>
                                    <span className="w-1 h-1 bg-brand-500 dark:bg-brand-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1 h-1 bg-brand-500 dark:bg-brand-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                                AI is composing...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200 dark:border-white/5 backdrop-blur-md">
                    {/* Image Previews */}
                    {images.length > 0 && (
                        <div className="flex gap-3 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative shrink-0 group/img">
                                    <div className="absolute top-1 right-1 z-10 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className="bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <img
                                        src={img.previewUrl}
                                        alt="Preview"
                                        className="h-20 w-auto rounded-xl border border-slate-200 dark:border-white/10 shadow-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative group">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            onPaste={handlePaste}
                            className="w-full p-4 pl-4 pr-24 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:bg-slate-50 dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 transition-all outline-none resize-none h-[80px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Type a message or paste an image..."
                        />

                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isStreaming}
                                className="p-2.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                                title="Upload Image"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isStreaming || (!input.trim() && images.length === 0)}
                                className="p-2.5 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all duration-200"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600 font-semibold">{card.data.model || 'AI Model'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

if (typeof window !== 'undefined') window.ChatModal = ChatModal;
