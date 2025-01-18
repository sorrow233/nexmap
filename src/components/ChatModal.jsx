import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { chatCompletion, streamChatCompletion } from '../services/llm';
import { marked } from 'marked';

export default function ChatModal({ card, isOpen, onClose, onUpdate, onGenerateResponse }) {
    if (!isOpen || !card) return null;
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [card.data.messages, card.data.messages.length, isStreaming]);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const userMsg = { role: 'user', content: input };
        const initialAssistantMsg = { role: 'assistant', content: '' };

        const updatedMessages = [...card.data.messages, userMsg, initialAssistantMsg];

        // Optimistic update
        onUpdate(card.id, { ...card.data, messages: updatedMessages });
        setInput('');
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
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="bg-white/80 backdrop-blur-xl w-[900px] max-w-full h-[85vh] rounded-3xl shadow-2xl flex flex-col border border-white/50 overflow-hidden animate-fade-in relative z-10 font-sans">

                {/* Header */}
                <div className="h-20 px-8 border-b border-slate-200/30 flex justify-between items-center bg-white/60 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-xl tracking-tight leading-tight">
                                {card.data.title || 'New Conversation'}
                            </h3>
                            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-600/60 mt-0.5">Neural Canvas Mode</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100/80 hover:text-slate-800 transition-all active:scale-90"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/20">
                    {card.data.messages.map((m, i) => {
                        const isUser = m.role === 'user';
                        const { thoughts, content } = (isUser || !m.content)
                            ? { thoughts: null, content: m.content }
                            : parseModelOutput(m.content);

                        return (
                            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
                                <div className={`
                                    max-w-[85%] sm:max-w-[80%] 
                                    p-5 sm:p-6 
                                    rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-sm sm:text-base leading-relaxed
                                    ${isUser
                                        ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-tr-none shadow-brand-500/20'
                                        : 'bg-white/80 backdrop-blur-md text-slate-800 rounded-tl-none border border-white/60'
                                    }
                                    transition-transform duration-200 hover:scale-[1.005]
                                `}>
                                    {thoughts && (
                                        <details className="mb-4 group/think">
                                            <summary className="text-xs font-bold text-brand-600/50 cursor-pointer list-none flex items-center gap-2 hover:text-brand-600 transition-all uppercase tracking-widest">
                                                <div className="w-1 h-1 rounded-full bg-brand-500 animate-ping"></div>
                                                Thinking Process
                                                <ChevronDown size={10} className="group-open/think:rotate-180 transition-transform" />
                                            </summary>
                                            <div className="mt-3 p-4 bg-slate-50/50 rounded-2xl text-xs font-mono text-slate-500 whitespace-pre-wrap border border-slate-100/50 leading-relaxed italic">
                                                {thoughts}
                                            </div>
                                        </details>
                                    )}
                                    <div
                                        className={`prose max-w-none text-sm sm:text-[15px] font-lxgw ${isUser ? 'user-bubble prose-invert' : 'prose-slate'}`}
                                        dangerouslySetInnerHTML={{
                                            __html: content
                                                ? (marked ? marked.parse(content) : content)
                                                : (!thoughts ? '<span class="opacity-50 italic">Synthesizing...</span>' : '<span class="opacity-50 italic">Finishing execution...</span>')
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {isStreaming && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-brand-50/50 px-5 py-2.5 rounded-full text-xs font-bold text-brand-600 border border-brand-100/50 flex items-center gap-2">
                                <div className="flex gap-1">
                                    <span className="w-1 h-1 bg-brand-600 rounded-full animate-bounce"></span>
                                    <span className="w-1 h-1 bg-brand-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1 h-1 bg-brand-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                                AI is composing...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-6 bg-white/60 border-t border-slate-200/50 backdrop-blur-md">
                    <div className="relative group">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            className="w-full p-4 pr-14 bg-slate-100/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none resize-none h-[80px] text-slate-700 placeholder:text-slate-400"
                            placeholder="Type a message to continue..."
                        />
                        <button
                            onClick={handleSend}
                            disabled={isStreaming || !input.trim()}
                            className="absolute bottom-3 right-3 p-2.5 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all duration-200"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{card.data.model || 'AI Model'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

if (typeof window !== 'undefined') window.ChatModal = ChatModal;
