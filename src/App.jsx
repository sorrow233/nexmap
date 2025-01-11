import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Loader2, Trash2 } from 'lucide-react';
import Canvas from './components/Canvas';
import ChatModal from './components/ChatModal';
import { getApiKey, setApiKey, getBaseUrl, setBaseUrl, generateTitle, chatCompletion } from './services/llm';

// Settings Modal Component
function SettingsModal({ isOpen, onClose }) {
    if (!isOpen) return null;
    const [key, setKey] = useState(getApiKey());
    const [url, setUrl] = useState(getBaseUrl());

    const handleSave = () => {
        setApiKey(key);
        setBaseUrl(url);
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
}

export default function App() {
    const [cards, setCards] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [promptInput, setPromptInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!getApiKey()) {
            setIsSettingsOpen(true);
        }
    }, []);

    const handleCreateCard = async () => {
        if (!promptInput.trim()) return;

        const newId = Date.now();
        const x = window.innerWidth / 2 - 160 + (Math.random() * 40 - 20) - 200;
        const y = window.innerHeight / 2 - 100 + (Math.random() * 40 - 20);

        const newCard = {
            id: newId,
            x: Math.max(0, x),
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
            const titlePromise = generateTitle(promptInput);
            const responsePromise = chatCompletion(newCard.data.messages);

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

    const handleBatchDelete = () => {
        setCards(prev => prev.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
    };

    return (
        <React.Fragment>
            <Canvas
                cards={cards}
                onUpdateCards={setCards}
                onSelectionChange={setSelectedIds}
                onExpandCard={setExpandedCardId}
            />

            <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50">
                <div className="glass-panel rounded-2xl p-2 flex gap-2 shadow-xl transition-all duration-300 focus-within:ring-2 ring-brand-500/50">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                        <Settings size={20} />
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
                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    </button>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-4 z-50 animate-slide-up shadow-2xl">
                    <span className="text-sm font-semibold text-slate-600">{selectedIds.length} items</span>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <button
                        onClick={handleBatchDelete}
                        className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} />
                        <span className="text-sm font-medium">Delete</span>
                    </button>
                </div>
            )}

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
}

if (typeof window !== 'undefined') window.App = App;
