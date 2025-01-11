import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Loader2, Trash2, RefreshCw } from 'lucide-react';
import Canvas from './components/Canvas';
import ChatModal from './components/ChatModal';
import { getApiKey, setApiKey, getBaseUrl, setBaseUrl, generateTitle, chatCompletion, streamChatCompletion } from './services/llm';

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

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur">
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-200 max-w-2xl shadow-xl">
                        <h2 className="text-xl font-bold text-red-700 mb-4">Something went wrong</h2>
                        <pre className="whitespace-pre-wrap text-sm text-red-600 font-mono bg-red-100 p-4 rounded-lg overflow-auto max-h-[60vh]">
                            {this.state.error?.toString()}
                            {this.state.error?.stack}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}

function AppContent() {

    const [cards, setCards] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [promptInput, setPromptInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        // Removed check for explicit API key since we have a default now, 
        // but still good to keep settings accessible if needed.
    }, []);

    const handleCreateCard = async () => {
        if (!promptInput.trim()) return;

        const newId = Date.now();
        const initialX = window.innerWidth / 2 - 160 + (Math.random() * 40 - 20) - 200;
        const initialY = window.innerHeight / 2 - 100 + (Math.random() * 40 - 20);

        // Initial empty assistant message
        const newCard = {
            id: newId,
            x: Math.max(0, initialX),
            y: Math.max(0, initialY),
            data: {
                title: "Thinking...",
                messages: [
                    { role: 'user', content: promptInput },
                    { role: 'assistant', content: '' } // Placeholder for streaming
                ],
                model: "google/gemini-3-flash-preview"
            }
        };

        setCards(prev => [...prev, newCard]);
        setPromptInput('');
        setIsGenerating(true);

        // Update function for streaming content
        const updateCardContent = (contentChunk) => {
            setCards(prev => prev.map(c => {
                if (c.id === newId) {
                    const msgs = [...c.data.messages];
                    const lastMsg = msgs[msgs.length - 1];
                    let newContent = lastMsg.content + contentChunk;

                    // Simple filter to remove "Thinking" lines (e.g. **Thinking...**) from the START of the message
                    // We only filter if the message is relatively short to avoid false positives later
                    if (newContent.length < 500) {
                        newContent = newContent.replace(/^\*\*.*?\*\*\s*\n?/gm, '').trim();
                    }

                    msgs[msgs.length - 1] = { ...lastMsg, content: newContent };
                    return { ...c, data: { ...c.data, messages: msgs } };
                }
                return c;
            }));
        };

        try {
            // Use user input directly as title (truncated if too long)
            const displayTitle = promptInput.length > 20 ? promptInput.substring(0, 20) + '...' : promptInput;

            setCards(prev => prev.map(c =>
                c.id === newId ? { ...c, data: { ...c.data, title: displayTitle } } : c
            ));

            // Contextual Logic: If cards are selected, use them as context
            let contextMessages = [];
            if (selectedIds.length > 0) {
                const selectedCards = cards.filter(c => selectedIds.includes(c.id));
                const contextText = selectedCards.map(c =>
                    `Context from card "${c.data.title}":\n${c.data.messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
                ).join('\n\n---\n\n');

                contextMessages = [{ role: 'user', content: `[System Note: The user has selected some cards as context. Use the following information to answer the next prompt if relevant.]\n\n${contextText}` }];
            }

            // Stream response with context
            const requestMessages = [...contextMessages, { role: 'user', content: promptInput }];

            await streamChatCompletion(
                requestMessages,
                updateCardContent
            );

        } catch (error) {
            console.error(error);
            setCards(prev => prev.map(c => {
                if (c.id === newId) {
                    const msgs = [...c.data.messages];
                    msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: "Error: " + error.message };
                    return { ...c, data: { ...c.data, messages: msgs } };
                }
                return c;
            }));
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

    const handleRegenerate = async () => {
        const targets = cards.filter(c => selectedIds.includes(c.id));
        if (targets.length === 0) return;

        // Reset selected cards to "Thinking..." state by removing last assistant msg or adding one
        setCards(prev => prev.map(c => {
            if (selectedIds.includes(c.id)) {
                const newMsgs = [...c.data.messages];
                // If last was assistant, remove it to retry. If user, just append.
                if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
                    newMsgs.pop();
                }
                // Add placeholder
                newMsgs.push({ role: 'assistant', content: '' });
                return { ...c, data: { ...c.data, messages: newMsgs } };
            }
            return c;
        }));

        setIsGenerating(true);

        try {
            await Promise.all(targets.map(async (card) => {
                const currentMsgs = [...card.data.messages];
                // Remove the assistant msg if it existed (we want the prompt stack)
                if (currentMsgs.length > 0 && currentMsgs[currentMsgs.length - 1].role === 'assistant') {
                    currentMsgs.pop();
                }

                // Define updater for this specific card
                const updateThisCard = (chunk) => {
                    setCards(prev => prev.map(c => {
                        if (c.id === card.id) {
                            const msgs = [...c.data.messages];
                            const last = msgs[msgs.length - 1];
                            msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
                            return { ...c, data: { ...c.data, messages: msgs } };
                        }
                        return c;
                    }));
                };

                await streamChatCompletion(currentMsgs, updateThisCard);
            }));
        } catch (e) {
            console.error("Regeneration failed", e);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <React.Fragment>
            <Canvas
                cards={cards}
                onUpdateCards={setCards}
                onSelectionChange={setSelectedIds}
                onExpandCard={setExpandedCardId}
            />

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50">
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
                <div className="fixed top-6 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-full flex items-center gap-4 z-50 animate-slide-up shadow-2xl">
                    <span className="text-sm font-semibold text-slate-600">{selectedIds.length} items</span>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <button
                        onClick={handleRegenerate}
                        className="flex items-center gap-2 text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                        title="Regenerate response for selected cards"
                    >
                        <RefreshCw size={16} />
                        <span className="text-sm font-medium">Retry</span>
                    </button>
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
