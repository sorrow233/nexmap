const { useState, useEffect, useRef } = React;
// Imports from global scope
const Canvas = window.Canvas;
const { chatCompletion, generateTitle, getApiKey, setApiKey, getBaseUrl, setBaseUrl } = window; // Assuming these are attached to window by the module script or we adjust the import strategy. 
// actually, ES modules in browser without bundler -> we need to import properly or expose to window.
// In index.html, we used type="module". Components need to export/import. 
// BUT, babel-standalone with type="text/babel" usually runs in global scope unless data-type="module" is set. 
// We attached data-type="module" so they run as modules.
// Issue: React components in separate files need to export/import. 
// To make it ROBUST without a bundler, strict ES modules can be tricky with path resolution.
// FIX: I will use the "Global Window Pattern" for this specific instruction to ensure it works 100% without relative import hell.
// I will update the previous files to attach to window if they haven't (I did for components).
// for 'llm.js', I need to verify how it was written. It used `export`. I should probably change it to `window.LLM = ...` or similar for safety.
// Let's patch llm.js first to be safe, then write App.

// Re-writing llm.js to attach to window for easy access
window.LLM = {
    getApiKey: () => localStorage.getItem('mixboard_llm_key') || '',
    setApiKey: (key) => localStorage.setItem('mixboard_llm_key', key),
    getBaseUrl: () => localStorage.getItem('mixboard_llm_base_url') || 'https://api.openai.com/v1',
    setBaseUrl: (url) => localStorage.setItem('mixboard_llm_base_url', url),

    async chatCompletion(messages, model = 'gpt-3.5-turbo') {
        const apiKey = this.getApiKey();
        const baseUrl = this.getBaseUrl();
        if (!apiKey) throw new Error("API Key is missing.");

        const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages, temperature: 0.7 })
        });
        if (!response.ok) throw new Error((await response.json()).error?.message || 'Error');
        const data = await response.json();
        return data.choices[0].message.content;
    },

    async generateTitle(text) {
        try {
            const msg = `Summarize this (max 5 words, no quotes): ${text.substring(0, 200)}`;
            return (await this.chatCompletion([{ role: 'user', content: msg }])).trim();
        } catch (e) { return "Conversation"; }
    }
};

const SettingsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    const [key, setKey] = useState(window.LLM.getApiKey());
    const [url, setUrl] = useState(window.LLM.getBaseUrl());

    const handleSave = () => {
        window.LLM.setApiKey(key);
        window.LLM.setBaseUrl(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl animate-fade-in">
                <h2 className="text-xl font-bold mb-4">Settings</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">API Key</label>
                        <input
                            type="password"
                            value={key}
                            onChange={e => setKey(e.target.value)}
                            className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="sk-..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Base URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="https://api.openai.com/v1"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChatModal = ({ card, isOpen, onClose, onUpdate }) => {
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

        // Optimistic update
        onUpdate(card.id, { ...card.data, messages: updatedMessages });
        setInput('');
        setLoading(true);

        try {
            const response = await window.LLM.chatCompletion(updatedMessages);
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
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">{card.data.title || 'Chat'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                        <i data-lucide="x" className="w-5 h-5"></i>
                    </button>
                </div>

                {/* Messages */}
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

                {/* Input */}
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
                            <i data-lucide="send" className="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.App = () => {
    const [cards, setCards] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [promptInput, setPromptInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial check for key
    useEffect(() => {
        if (!window.LLM.getApiKey()) {
            setIsSettingsOpen(true);
        }
    }, []);

    // Create a new card from the main input
    const handleCreateCard = async () => {
        if (!promptInput.trim()) return;

        const newId = Date.now();
        // Place in center of view roughly (simplified to random/fixed for now)
        // Ideally we track canvas center. For now, we put it at some offset.
        // Let's assume viewport center + random jitter
        const x = window.innerWidth / 2 - 160 + (Math.random() * 40 - 20) - 200; // Left side mostly
        const y = window.innerHeight / 2 - 100 + (Math.random() * 40 - 20);

        const newCard = {
            id: newId,
            x: Math.max(0, x), // keep positive mostly
            y: Math.max(0, y),
            data: {
                title: "Generating...",
                messages: [{ role: 'user', content: promptInput }],
                model: "gpt-3.5-turbo"
            }
        };

        setCards(prev => [...prev, newCard]);
        setPromptInput('');
        setIsGenerating(true);

        try {
            // 1. Generate Title
            const titlePromise = window.LLM.generateTitle(promptInput);

            // 2. Generate First Response
            const responsePromise = window.LLM.chatCompletion(newCard.data.messages);

            const [title, response] = await Promise.all([titlePromise, responsePromise]);

            setCards(prev => prev.map(c => {
                if (c.id === newId) {
                    return {
                        ...c,
                        data: {
                            ...c.data,
                            title: title,
                            messages: [...c.data.messages, { role: 'assistant', content: response }]
                        }
                    };
                }
                return c;
            }));

        } catch (error) {
            alert("Failed to generate: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUpdateCard = (id, newData) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, data: newData } : c));
    };

    // Batch operations
    const handleBatchDelete = () => {
        setCards(prev => prev.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
    };

    // Render Icons
    useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    });

    return (
        <React.Fragment>
            {/* Main Canvas */}
            <Canvas
                cards={cards}
                onUpdateCards={setCards}
                onSelectionChange={setSelectedIds}
                onExpandCard={setExpandedCardId}
            />

            {/* Top Bar / Prompt Input */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50">
                <div className="glass-panel rounded-2xl p-2 flex gap-2 shadow-xl transition-all duration-300 focus-within:ring-2 ring-brand-500/50">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                        <i data-lucide="settings" className="w-5 h-5"></i>
                    </button>
                    <input
                        type="text"
                        value={promptInput}
                        onChange={e => setPromptInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateCard(); }}
                        className="flex-grow bg-transparent outline-none text-slate-700 placeholder-slate-400 font-medium"
                        placeholder="Type a prompt to create a new board..."
                    />
                    <button
                        onClick={handleCreateCard}
                        disabled={isGenerating || !promptInput.trim()}
                        className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isGenerating ? <i data-lucide="loader-2" className="animate-spin w-5 h-5"></i> : <i data-lucide="sparkles" className="w-5 h-5"></i>}
                    </button>
                </div>
            </div>

            {/* Batch Toolbar (Bottom) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-4 z-50 animate-slide-up shadow-2xl">
                    <span className="text-sm font-semibold text-slate-600">{selectedIds.length} items</span>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <button
                        onClick={handleBatchDelete}
                        className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <i data-lucide="trash-2" className="w-4 h-4"></i>
                        <span className="text-sm font-medium">Delete</span>
                    </button>
                    {/* Placeholder for future batch actions: Merge, Summarize All, etc. */}
                </div>
            )}

            {/* Modals */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {expandedCardId && (
                <ChatModal
                    card={cards.find(c => c.id === expandedCardId)}
                    isOpen={!!expandedCardId}
                    onClose={() => setExpandedCardId(null)}
                    onUpdate={handleUpdateCard}
                />
            )}
        </React.Fragment>
    );
};

// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<window.App />);
