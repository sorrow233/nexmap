import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { chatCompletion } from '../services/llm';

export default function ChatModal({ card, isOpen, onClose, onUpdate }) {
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

        try {
            // We pass the messages EXCEPT the empty assistant one we just added for context
            const contextMessages = updatedMessages.slice(0, -1);

            await window.LLM.streamChatCompletion(contextMessages, (token) => {
                // Due to closure, we need to be careful. But since we use functional state update in appendToken (via parent), it technically requires onUpdate to support functional updates.
                // However, onUpdate in App.jsx currently takes (id, newData). 
                // We need to fix this interaction. 
                // For now, let's implement a ref-based approach or assume App.jsx logic allows getting current state? 
                // Actually, let's just re-implement a localized state updater for the stream and sync once at the end? 
                // No, user wants to see it stream.
                // Let's modify onUpdate to simply pass the accumulated string.

                // WAIT: The App.jsx onUpdateCard is: setCards(prev => prev.map(c => c.id === id ? { ...c, data: newData } : c));
                // It doesn't support functional updates for 'newData'.
                // We might need to handle this carefully.
                // Actually, we can use a local mutable variable for the accumulation during the stream and call onUpdate with the full new object.
            });

            // Re-implementation with correct closure handling:
            let accumulatedContent = "";
            await window.LLM.streamChatCompletion(contextMessages, (token) => {
                accumulatedContent += token;

                // We need to construct the FULL new messages array every time for onUpdate
                const newMessages = [...contextMessages, { role: 'assistant', content: accumulatedContent }];
                onUpdate(card.id, { ...card.data, messages: newMessages });
            });

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ perspective: '1000px' }}>
            <div
                className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="bg-white/80 backdrop-blur-xl w-[900px] max-w-full h-[85vh] rounded-3xl shadow-2xl flex flex-col border border-white/50 overflow-hidden animate-fade-in relative z-10 font-sans">

                {/* Header */}
                <div className="h-16 px-6 border-b border-slate-200/50 flex justify-between items-center bg-white/40 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                            <window.Sparkles size={16} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                            {card.data.title || 'New Conversation'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                    {card.data.messages.map((m, i) => {
                        const isUser = m.role === 'user';
                        const { thoughts, content } = (isUser || !m.content)
                            ? { thoughts: null, content: m.content }
                            : (window.parseModelOutput ? window.parseModelOutput(m.content) : { thoughts: null, content: m.content });

                        return (
                            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                <div className={`
                                    max-w-[85%] sm:max-w-[75%] 
                                    p-4 sm:p-5 
                                    rounded-2xl shadow-sm text-sm sm:text-base leading-relaxed
                                    ${isUser
                                        ? 'bg-brand-600 text-white rounded-tr-sm shadow-brand-500/20'
                                        : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100 shadow-slate-200/50'
                                    }
                                `}>
                                    {thoughts && (
                                        <details className="mb-3 group">
                                            <summary className="text-xs font-semibold text-slate-400 cursor-pointer list-none flex items-center gap-1 hover:text-brand-600 transition-colors">
                                                <window.Sparkles size={10} className="opacity-50" />
                                                Thinking Process
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] ml-1">(Click to expand)</span>
                                            </summary>
                                            <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-500 whitespace-pre-wrap border border-slate-100 leading-normal">
                                                {thoughts}
                                            </div>
                                        </details>
                                    )}
                                    <div
                                        className={`prose max-w-none text-sm sm:text-base ${isUser ? 'user-bubble' : ''}`}
                                        dangerouslySetInnerHTML={{
                                            __html: content
                                                ? (window.marked ? window.marked.parse(content) : content)
                                                : (!thoughts ? '<span class="opacity-50 italic">Generating...</span>' : '<span class="opacity-50 italic">Finishing thought...</span>')
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {isStreaming && (
                        <div className="flex justify-start">
                            <div className="bg-white/50 px-4 py-2 rounded-full text-xs font-medium text-brand-600 border border-brand-100 animate-pulse flex items-center gap-2">
                                <window.Loader2 size={12} className="animate-spin" />
                                Typing...
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
