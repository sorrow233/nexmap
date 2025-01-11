import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { chatCompletion } from '../services/llm';

export default function ChatModal({ card, isOpen, onClose, onUpdate }) {
    if (!isOpen || !card) return null;
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [card.data.messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const newMsg = { role: 'user', content: input };
        const updatedMessages = [...card.data.messages, newMsg];

        onUpdate(card.id, { ...card.data, messages: updatedMessages });
        setInput('');
        setLoading(true);

        try {
            const response = await chatCompletion(updatedMessages);
            const withResponse = [...updatedMessages, { role: 'assistant', content: response }];
            onUpdate(card.id, { ...card.data, messages: withResponse });
        } catch (error) {
            alert("Error generating response: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white w-[800px] h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">{card.data.title || 'Chat'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
                    {card.data.messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                                max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed
                                ${m.role === 'user'
                                    ? 'bg-brand-600 text-white rounded-tr-sm'
                                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'}
                            `}>
                                <div className="whitespace-pre-wrap">{m.content}</div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-sm text-slate-500 animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none resize-none h-24"
                            placeholder="Type a message..."
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="absolute bottom-3 right-3 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

if (typeof window !== 'undefined') window.ChatModal = ChatModal;
