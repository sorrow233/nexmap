
import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Loader2, Trash2, RefreshCw, LayoutGrid, ArrowLeft, ChevronDown, CheckCircle2, AlertCircle, Play, Image as ImageIcon, X } from 'lucide-react';
import Canvas from './components/Canvas';
import ChatModal from './components/ChatModal';
import BoardGallery from './components/BoardGallery';
import { auth, googleProvider } from './services/firebase';
import { saveBoard, loadBoard, loadBoardsMetadata, deleteBoard, createBoard, setCurrentBoardId, getCurrentBoardId, listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud, saveUserSettings, loadUserSettings } from './services/storage';
import { getApiKey, setApiKey, getBaseUrl, setBaseUrl, getModel, setModel, generateTitle, chatCompletion, streamChatCompletion } from './services/llm';

// Settings Modal Component
function SettingsModal({ isOpen, onClose, user }) {
    if (!isOpen) return null;

    // Provider Presets
    const PROVIDERS = [
        { id: 'custom', name: 'Custom (自定义)', baseUrl: '', model: '' },
        { id: 'gmicloud', name: 'GMI Cloud (Inference)', baseUrl: 'https://api.gmi-serving.com/v1', model: 'google/gemini-3-flash-preview' },
        { id: 'siliconflow', name: 'SiliconFlow (硅基流动)', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V2.5' },
        { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
        { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
        { id: 'gemini', name: 'Google Gemini (OpenAI Compatible)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash-exp' },
        { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'auto' },
    ];

    const [providerId, setProviderId] = useState(() => {
        // Try to guess provider based on URL
        const currentUrl = getBaseUrl();
        const found = PROVIDERS.find(p => p.id !== 'custom' && p.baseUrl === currentUrl);
        return found ? found.id : 'custom';
    });


    const [url, setUrl] = useState(getBaseUrl());
    const [model, setModelState] = useState(getModel());
    const [key, setKey] = useState(() => {
        // Load key for current provider
        const currentUrl = getBaseUrl();
        const found = PROVIDERS.find(p => p.id !== 'custom' && p.baseUrl === currentUrl);
        const pid = found ? found.id : 'custom';
        return localStorage.getItem(`mixboard_llm_key_${pid}`) || '';
    });



    const handleProviderChange = (e) => {
        const pid = e.target.value;
        setProviderId(pid);
        const p = PROVIDERS.find(x => x.id === pid);
        if (p && p.id !== 'custom') {
            setUrl(p.baseUrl);
            if (p.model) setModelState(p.model);
            // Load the API key for this provider
            const providerKey = localStorage.getItem(`mixboard_llm_key_${pid}`) || '';
            setKey(providerKey);
        }
    };

    const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
    const [testMessage, setTestMessage] = useState('');

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            await chatCompletion(
                [{ role: 'user', content: 'Hi' }],
                model,
                { apiKey: key, baseUrl: url }
            );
            setTestStatus('success');
            setTestMessage('Connection Successful!');
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error.message || 'Connection Failed');
        }
    };

    const handleSave = async () => {
        // Save to provider-specific key
        localStorage.setItem(`mixboard_llm_key_${providerId}`, key);

        // Also save to global storage for backwards compatibility
        setApiKey(key);
        setBaseUrl(url);
        setModel(model);

        if (user) {
            // Save all provider keys to cloud
            const allKeys = {};
            PROVIDERS.forEach(p => {
                const k = localStorage.getItem(`mixboard_llm_key_${p.id}`);
                if (k) allKeys[p.id] = k;
            });

            await saveUserSettings(user.uid, {
                apiKeys: allKeys, // Store all keys
                baseUrl: url,
                model: model,
                updatedAt: Date.now()
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-sans">
            <div className="bg-white p-8 rounded-3xl w-[500px] shadow-2xl animate-fade-in border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                        <Settings size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Connection Settings</h2>
                        <p className="text-slate-500 text-sm">Configure your LLM provider</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Provider Selector */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Provider (服务商)</label>
                        <div className="relative">
                            <select
                                value={providerId}
                                onChange={handleProviderChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none font-medium text-slate-700 transition-all hover:bg-slate-100"
                            >
                                {PROVIDERS.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">API Key</label>
                        <input
                            type="password"
                            value={key}
                            onChange={e => setKey(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm"
                            placeholder="sk-..."
                        />
                    </div>

                    {/* Advanced Fields (URL & Model) */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Base URL</label>
                            <input
                                type="text"
                                value={url}
                                onChange={e => {
                                    setUrl(e.target.value);
                                    setProviderId('custom'); // Switch to custom if edited
                                }}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-xs text-slate-600"
                                placeholder="https://api..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Model Name</label>
                            <input
                                type="text"
                                value={model}
                                onChange={e => setModelState(e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm"
                                placeholder="e.g. gpt-4o, deepseek-chat"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all"
                        >
                            Save Settings
                        </button>
                    </div>

                    {/* Test Status Indicator */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={handleTestConnection}
                            disabled={!key || !url || testStatus === 'testing'}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                ${testStatus === 'testing' ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}
                            `}
                        >
                            {testStatus === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            Test Connection
                        </button>

                        {testStatus === 'success' && (
                            <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-fade-in">
                                <CheckCircle2 size={16} />
                                <span>{testMessage}</span>
                            </div>
                        )}

                        {testStatus === 'error' && (
                            <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-fade-in max-w-[200px] truncate" title={testMessage}>
                                <AlertCircle size={16} />
                                <span>{testMessage}</span>
                            </div>
                        )}
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
    // Inject global font style & Theme Detection
    useEffect(() => {
        // Font
        const style = document.createElement('style');
        style.innerHTML = `
            body, #root, .font-lxgw, .prose, .prose * {
                font-family: "LXGW WenKai", "楷体", "KaiTi", serif !important;
            }
            .font-mono {
                font-family: inherit !important; /* Force override even monos if user hates them */
            }
        `;
        document.head.appendChild(style);

        // System Theme Handler
        const mm = window.matchMedia('(prefers-color-scheme: dark)');
        const updateTheme = e => {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        // Init
        updateTheme(mm);
        mm.addEventListener('change', updateTheme);

        return () => {
            style.remove();
            mm.removeEventListener('change', updateTheme);
        };
    }, []);


    const [view, setView] = useState('gallery'); // 'gallery' | 'canvas'
    const [boardsList, setBoardsList] = useState([]);

    // Track initialization to avoid first history push being empty
    const [isInitialized, setIsInitialized] = useState(false);

    // Auth State
    const [user, setUser] = useState(null);
    useEffect(() => {
        if (!auth) return;
        let unsubDb = null;

        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);

            // Clean up previous listener if switching users (rare but safe)
            if (unsubDb) {
                unsubDb();
                unsubDb = null;
            }

            if (u) {
                // Sync from cloud
                unsubDb = listenForBoardUpdates(u.uid, (cloudBoards) => {
                    // Update state. 
                    // Note: This replaces local list. If offline creation happened, it might be lost unless we merge.
                    // For now, cloud is truth.
                    setBoardsList(cloudBoards);
                });

                // Load User Settings
                loadUserSettings(u.uid).then(settings => {
                    if (settings) {
                        // Restore all provider keys
                        if (settings.apiKeys) {
                            Object.entries(settings.apiKeys).forEach(([providerId, key]) => {
                                localStorage.setItem(`mixboard_llm_key_${providerId}`, key);
                            });
                        }
                        // Backwards compatibility: single apiKey
                        if (settings.apiKey) setApiKey(settings.apiKey);

                        if (settings.baseUrl) setBaseUrl(settings.baseUrl);
                        if (settings.model) setModel(settings.model);
                        console.log("Settings synced from cloud");
                    }
                });
            }
        });

        return () => {
            unsubscribe();
            if (unsubDb) unsubDb();
        };
    }, []);

    const handleLogin = async () => {
        try {
            await auth.signInWithPopup(googleProvider);
        } catch (e) {
            console.error("Login failed", e);
            alert("Login failed: " + e.message);
        }
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const [currentBoardId, setCurrentBoardId] = useState(null);

    const [cards, setCards] = useState([]);
    const [connections, setConnections] = useState([]); // Array<{ from: id, to: id }>
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [promptInput, setPromptInput] = useState('');
    const [globalImages, setGlobalImages] = useState([]); // Global input images
    const [isGenerating, setIsGenerating] = useState(false);
    const globalFileInputRef = React.useRef(null);

    // Connection Mode State
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStartId, setConnectionStartId] = useState(null);

    // History State for Undo/Redo
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    // Clipboard State
    const [clipboard, setClipboard] = useState(null);

    // Helper to add state to history
    const addToHistory = (newCards, newConnections) => {
        // If we are in the middle of history, discard future
        const currentHistory = history.slice(0, historyIndex + 1);
        const newState = { cards: newCards, connections: newConnections, timestamp: Date.now() };

        // Limit history size to 50
        const updatedHistory = [...currentHistory, newState].slice(-50);

        setHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const previousState = history[newIndex];
            setCards(previousState.cards);
            setConnections(previousState.connections);
            setHistoryIndex(newIndex);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const nextState = history[newIndex];
            setCards(nextState.cards);
            setConnections(nextState.connections);
            setHistoryIndex(newIndex);
        }
    };

    const handleCopy = async () => {
        if (selectedIds.length === 0) return;
        const selectedCards = cards.filter(c => selectedIds.includes(c.id));
        setClipboard(selectedCards);

        // Also copy text content to system clipboard for external pasting with Cmd+C
        try {
            const textContent = selectedCards.map(c => {
                const lastMsg = c.data.messages[c.data.messages.length - 1];
                return lastMsg ? lastMsg.content : '';
            }).join('\n\n---\n\n');

            if (textContent) {
                await navigator.clipboard.writeText(textContent);
                console.log("Copied to system clipboard");
            }
        } catch (e) {
            console.error("Failed to copy to system clipboard", e);
        }
    };

    const handlePaste = () => {
        if (!clipboard || clipboard.length === 0) return;

        // Calculate center of clipboard group to offset nicely
        // For simplicity, just offset by 20px from original position for now
        // Or better: Paste at mouse cursor? Hard without mouse tracking in this scope.
        // Let's offset by 20px.

        const newCards = clipboard.map(card => {
            const newId = Date.now() + Math.random();
            return {
                ...card,
                id: newId,
                x: card.x + 20,
                y: card.y + 20,
                data: { ...card.data } // Deep clone data to avoid ref issues
            };
        });

        const newCardState = [...cards, ...newCards];
        setCards(newCardState);
        addToHistory(newCardState, connections);

        // Select newly pasted cards
        setSelectedIds(newCards.map(c => c.id));
    };

    // 1. Initial Load
    useEffect(() => {
        const init = async () => {
            const list = loadBoardsMetadata();
            setBoardsList(list);

            const lastId = getCurrentBoardId();
            if (lastId && list.some(b => b.id === lastId)) {
                await handleSelectBoard(lastId);
            }
            setIsInitialized(true);
        };
        init();
    }, []);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input or textarea
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;

            // Delete / Backspace -> Delete selected
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIds.length > 0) {
                    handleBatchDelete();
                }
            }

            // R -> Regenerate selected
            if (e.key === 'r' || e.key === 'R') {
                if (selectedIds.length > 0) {
                    handleRegenerate();
                }
            }


            // L -> Link (Connect)
            // If one card is selected, start connection from it
            if (e.key === 'l' || e.key === 'L') {
                if (selectedIds.length === 1) {
                    handleConnect(selectedIds[0]);
                }
            }

            // Command/Ctrl + Z -> Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }

            // Command/Ctrl + Shift + Z -> Redo
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                handleRedo();
            }

            // Command/Ctrl + C -> Copy
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                // If text is selected, allow default browser copy behavior
                if (window.getSelection()?.toString()) return;

                e.preventDefault();
                handleCopy();
            }

            // Command/Ctrl + V -> Paste
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                e.preventDefault();
                handlePaste();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, cards, connections, history, historyIndex, clipboard]); // Include dependencies

    // 2. Auto-Save Cards & Connections
    useEffect(() => {
        if (view === 'canvas' && currentBoardId && cards.length > 0) {
            // Save connections too!
            saveBoard(currentBoardId, { cards, connections });

            // Cloud Save (Debounced ideally, but here direct)
            if (user) {
                // We use a timeout to debounce slightly to avoid hammering Firestore on every keystroke/drag
                const timeoutId = setTimeout(() => {
                    saveBoardToCloud(user.uid, currentBoardId, { cards, connections });
                }, 1000);
                return () => clearTimeout(timeoutId);
            }

            // Sync metadata in list without full re-fetch
            setBoardsList(prev => prev.map(b =>
                b.id === currentBoardId ? { ...b, updatedAt: Date.now(), cardCount: cards.length } : b
            ));
        }
    }, [cards, connections, currentBoardId, view, user]);

    const handleCreateBoard = async (customName = null, initialPrompt = null, initialImages = []) => {
        let name = customName;
        // If not custom name provided (e.g. from gallery input), fallback to prompt
        if (!name) {
            name = prompt('Name your board:', `Board ${boardsList.length + 1} `);
            if (!name) return;
        }

        const newBoard = await createBoard(name);
        setBoardsList(prev => [newBoard, ...prev]);

        // Cloud Sync
        if (user) {
            saveBoardToCloud(user.uid, newBoard.id, { cards: [], connections: [] });
        }

        // Optimize: Set state immediately to switch view
        await handleSelectBoard(newBoard.id);

        // If there's an initial prompt (Quick Start), trigger card creation immediately
        if (initialPrompt || initialImages.length > 0) {
            // Slight delay to ensure canvas is ready
            setTimeout(() => {
                setPromptInput(initialPrompt || '');
                // We need to trigger handleCreateCard but state might not be fully flushed ???
                // Actually better to just directly call logic or set useEffect trigger.
                // Let's call a helper to avoid duplication, but we need updated 'cards' reference...
                // Simplify: Just set the input and let user hit enter? No, they want "Start".
                // We will manually trigger a card creation with a hack or refactor.
                // Refactor: handleCreateCardWithText(text)
                createCardWithText(initialPrompt, newBoard.id, initialImages);
            }, 100);
        }
    };

    // Refactored helper to create card without depending on state 'promptInput'
    const createCardWithText = async (text, boardId, images = []) => {
        if (!text.trim() && images.length === 0) return;

        const newId = Date.now();
        const initialX = window.innerWidth / 2 - 200;
        const initialY = window.innerHeight / 2 - 150;

        // Construct Content
        let content = text;
        if (images.length > 0) {
            content = [
                { type: 'text', text: text },
                ...images.map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mimeType,
                        data: img.base64
                    }
                }))
            ];
        }

        const newCard = {
            id: newId,
            x: Math.max(0, initialX),
            y: Math.max(0, initialY),
            data: {
                title: text.length > 20 ? text.substring(0, 20) + '...' : (text || 'Image Input'),
                messages: [
                    { role: 'user', content: content },
                    { role: 'assistant', content: '' }
                ],
                model: "google/gemini-3-flash-preview"
            }
        };

        setCards(prev => [...prev, newCard]);
        setIsGenerating(true);

        // ... logic for streaming ...
        try {
            const updateCardContent = (contentChunk) => {
                setCards(prev => prev.map(c => {
                    if (c.id === newId) {
                        const msgs = [...c.data.messages];
                        const lastMsg = msgs[msgs.length - 1];
                        let newContent = lastMsg.content + contentChunk;
                        msgs[msgs.length - 1] = { ...lastMsg, content: newContent };
                        return { ...c, data: { ...c.data, messages: msgs } };
                    }
                    return c;
                }));
            };

            // Allow thinking, but we'll parse it out in UI if needed.
            // const systemInstruction = { role: 'system', content: "You are a helpful assistant." };

            await streamChatCompletion(
                [{ role: 'user', content: content }],
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

    const handleSelectBoard = async (id) => {
        const data = await loadBoard(id);
        setCards(data.cards || []);
        setConnections(data.connections || []);
        setCurrentBoardId(id);
        // setCurrentBoardId(id); // Duplicate remove
        setView('canvas');
    };

    const handleLoadBoard = async (id) => { // Renamed from handleSelectBoard for clarity in gallery
        const data = await loadBoard(id);
        setCards(data.cards || []);
        setConnections(data.connections || []);
        setCurrentBoardId(id);
        // setCurrentBoardId(id); // Duplicate remove
        setView('canvas');
    };

    const handleDeleteBoard = async (id) => {
        if (!confirm('Are you sure? All chat history in this board will be gone.')) return;
        await deleteBoard(id);
        if (user) {
            deleteBoardFromCloud(user.uid, id);
        }
        setBoardsList(prev => prev.filter(b => b.id !== id));
    };

    const handleBackToGallery = async () => {
        if (currentBoardId) {
            await saveBoard(currentBoardId, { cards, connections });
            setCurrentBoardId(null);
        }
        setView('gallery');
        setCurrentBoardId(null);
        setCards([]);
        setConnections([]);
    };

    // --- Connection Logic ---
    const getConnectedGraph = (startId, visited = new Set()) => {
        if (visited.has(startId)) return visited;
        visited.add(startId);

        // Find all direct neighbors
        const neighbors = connections
            .filter(c => c.from === startId || c.to === startId)
            .map(c => c.from === startId ? c.to : c.from);

        neighbors.forEach(nid => getConnectedGraph(nid, visited));
        return visited;
    };

    const handleConnect = (sourceId) => {
        if (isConnecting && connectionStartId) {
            if (connectionStartId !== sourceId) {
                // Create connection
                // Avoid duplicates
                if (!connections.some(c =>
                    (c.from === connectionStartId && c.to === sourceId) ||
                    (c.from === sourceId && c.to === connectionStartId)
                )) {
                    const newConnections = [...connections, { from: connectionStartId, to: sourceId }];
                    setConnections(newConnections);
                    addToHistory(cards, newConnections);
                }
            }
            setIsConnecting(false);
            setConnectionStartId(null);
        } else {
            setIsConnecting(true);
            setConnectionStartId(sourceId);
        }
    };

    const handleGlobalImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                setGlobalImages(prev => [...prev, {
                    file,
                    previewUrl: URL.createObjectURL(file),
                    base64: e.target.result.split(',')[1],
                    mimeType: file.type
                }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const removeGlobalImage = (index) => {
        setGlobalImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].previewUrl);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const handleGlobalPaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    setGlobalImages(prev => [...prev, {
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

    const handleCreateCard = async () => {
        if (!promptInput.trim() && globalImages.length === 0) return;

        const newId = Date.now();
        const initialX = window.innerWidth / 2 - 160 + (Math.random() * 40 - 20) - 200;
        const initialY = window.innerHeight / 2 - 100 + (Math.random() * 40 - 20);

        // Construct Content
        let content = promptInput;
        if (globalImages.length > 0) {
            content = [
                { type: 'text', text: promptInput },
                ...globalImages.map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: img.mimeType,
                        data: img.base64
                    }
                }))
            ];
        }

        // Initial empty assistant message
        const newCard = {
            id: newId,
            x: Math.max(0, initialX),
            y: Math.max(0, initialY),
            data: {
                title: "Thinking...",
                messages: [
                    { role: 'user', content: content },
                    { role: 'assistant', content: '' } // Placeholder for streaming
                ],
                model: "google/gemini-3-flash-preview"
            }
        };

        const newCardState = [...cards, newCard];
        setCards(newCardState);
        addToHistory(newCardState, connections);
        setPromptInput('');
        setGlobalImages([]); // Clear images
        setIsGenerating(true);

        // Update function for streaming content
        const updateCardContent = (contentChunk) => {
            setCards(prev => prev.map(c => {
                if (c.id === newId) {
                    const msgs = [...c.data.messages];
                    const lastMsg = msgs[msgs.length - 1];
                    const newContent = lastMsg.content + contentChunk;

                    // Keep original content - ChatModal will handle thinking tag display
                    msgs[msgs.length - 1] = { ...lastMsg, content: newContent };
                    return { ...c, data: { ...c.data, messages: msgs } };
                }
                return c;
            }));
        };

        try {
            // Use user input directly as title (truncated if too long)
            const displayTitle = promptInput.length > 20 ? promptInput.substring(0, 20) + '...' : (promptInput || 'Image Input');

            setCards(prev => prev.map(c =>
                c.id === newId ? { ...c, data: { ...c.data, title: displayTitle } } : c
            ));

            // Contextual Logic: If cards are selected, use them as context
            // PLUS: Check connected cards
            let contextMessages = [];

            // 1. Explicitly selected cards
            let contextSourceIds = [...selectedIds];

            // Logic for manual selections:
            if (contextSourceIds.length > 0) {
                const selectedCards = cards.filter(c => contextSourceIds.includes(c.id));
                const contextText = selectedCards.map(c =>
                    `Context from card "${c.data.title}": \n${c.data.messages.map(m => `${m.role}: ${m.content}`).join('\n')} `
                ).join('\n\n---\n\n');
                contextMessages = [{ role: 'user', content: `[System Note: The user has selected some cards as context.]\n\n${contextText} ` }];
            }

            // Stream response with context + "No Internal Monologue" instruction
            // Revert suppression. Allow model to think.
            // Pure Gemini - No System Prompt pollution
            // Ensure content is passed correctly (if string or array)
            const requestMessages = [...contextMessages, { role: 'user', content: content }];

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

    // Chat completion wrapper for existing cards (ChatModal) to use connections
    const generateResponseForCard = async (cardId, newMessages) => {
        // Find connected context
        const connectedIds = Array.from(getConnectedGraph(cardId));
        // Filter out self
        const neighborIds = connectedIds.filter(id => id !== cardId);

        let contextMessages = [];
        if (neighborIds.length > 0) {
            const neighbors = cards.filter(c => neighborIds.includes(c.id));
            const contextText = neighbors.map(c =>
                `Context from linked card "${c.data.title}": \n${c.data.messages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')} `
            ).join('\n\n---\n\n');

            if (contextText.trim()) {
                contextMessages.push({ role: 'user', content: `[System Note: This card is connected to others.Here is their recent context:]\n\n${contextText} ` });
            }
        }

        // Pure Gemini - No System Prompt
        return [...contextMessages, ...newMessages];
    };

    const handleChatGenerate = async (cardId, messages, onToken) => {
        const fullMessages = await generateResponseForCard(cardId, messages);
        await streamChatCompletion(fullMessages, onToken);
    };

    const handleUpdateCard = (id, newData) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, data: newData } : c));
    };

    // Group Drag Logic
    const handleCardMove = (id, newX, newY) => {
        setCards(prev => {
            const sourceCard = prev.find(c => c.id === id);
            if (!sourceCard) return prev;

            const dx = newX - sourceCard.x;
            const dy = newY - sourceCard.y;

            if (dx === 0 && dy === 0) return prev;

            // Find all connected cards
            const connectedIds = getConnectedGraph(id);

            return prev.map(c => {
                if (connectedIds.has(c.id)) {
                    return { ...c, x: c.x + dx, y: c.y + dy };
                }
                return c;
            });
        });
    };

    const handleCardMoveEnd = () => {
        addToHistory(cards, connections);
    };

    const handleBatchDelete = () => {
        const newCards = cards.filter(c => !selectedIds.includes(c.id));
        // Also remove connections involving deleted cards
        const newConnections = connections.filter(c =>
            !selectedIds.includes(c.from) && !selectedIds.includes(c.to)
        );

        setCards(newCards);
        setConnections(newConnections);
        setSelectedIds([]);
        addToHistory(newCards, newConnections);
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

                // Pure Gemini - No System Prompt
                await streamChatCompletion(currentMsgs, updateThisCard);
            }));
        } catch (e) {
            console.error("Regeneration failed", e);
        } finally {
            setIsGenerating(false);
        }
    };

    if (view === 'gallery') {
        return (
            <React.Fragment>
                <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-200 p-8 font-lxgw relative overflow-hidden transition-colors duration-500">
                    {/* Ambient Background */}
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="flex justify-between items-center mb-12">
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Neural Canvas
                            </h1>
                            <div className="flex items-center gap-4">
                                {user ? (
                                    <div className="flex items-center gap-3 bg-slate-800 rounded-full pl-2 pr-4 py-1.5 border border-slate-700">
                                        {user.photoURL && <img src={user.photoURL} className="w-6 h-6 rounded-full" alt="User avatar" />}
                                        <span className="text-sm font-medium">{user.displayName}</span>
                                        <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white ml-2">Sign Out</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleLogin}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-blue-500/25"
                                    >
                                        Sign In with Google
                                    </button>
                                )}
                            </div>
                        </div>
                        <BoardGallery
                            boards={boardsList}
                            onCreateBoard={handleCreateBoard}
                            onSelectBoard={handleLoadBoard}
                            onDeleteBoard={handleDeleteBoard}
                        />
                    </div>
                </div>
                <div className="fixed bottom-10 right-10">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-4 bg-white shadow-2xl rounded-2xl text-slate-400 hover:text-brand-600 hover:scale-110 transition-all border border-slate-100"
                        title="Settings"
                    >
                        <Settings size={24} />
                    </button>
                </div>
                {isSettingsOpen && (
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        user={user}
                    />
                )}</React.Fragment>
        );
    }

    return (
        <React.Fragment>
            <Canvas
                cards={cards} // Pass all cards
                connections={connections} // New prop
                selectedIds={selectedIds} // Pass selection state
                onUpdateCards={setCards} // This is for what? Canvas uses local state? Canvas needs refactoring for group drag.
                onCardMove={handleCardMove} // Use our new group move handler
                onDragEnd={handleCardMoveEnd} // Handle history on drag end
                onSelectionChange={setSelectedIds}
                onExpandCard={setExpandedCardId}
                onConnect={handleConnect} // New handler
                isConnecting={isConnecting}
                connectionStartId={connectionStartId}
            />

            {/* Teaching Bubble for Connections */}
            {cards.length > 1 && connections.length === 0 && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium animate-fade-in pointer-events-none opacity-80">
                    💡 Tip: Click the "Link" icon on cards to connect them together!
                </div>
            )}

            {/* Premium Top Navigation */}
            {/* Premium Top Navigation */}
            <div className="fixed top-6 left-6 z-50 animate-slide-down">
                <div className="flex items-center gap-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 group hover:scale-[1.02] transition-transform duration-300">
                    <button
                        onClick={handleBackToGallery}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-white/10 hover:text-brand-500 dark:hover:text-brand-300 transition-all active:scale-95"
                    >
                        <LayoutGrid size={18} className="text-brand-500 dark:text-brand-400 group-hover:scale-110 transition-transform" />
                        <span>Gallery</span>
                    </button>

                    <div className="h-6 w-[1px] bg-slate-200 dark:bg-white/10 mx-2" />

                    <div className="px-4 py-2 text-slate-800 dark:text-slate-200 font-bold tracking-tight text-sm select-none">
                        {boardsList.find(b => b.id === currentBoardId)?.name || 'Untitled Board'}
                    </div>
                </div>
            </div>

            {/* Chat Input Bar */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50">
                {/* Global Image Previews */}
                {globalImages.length > 0 && (
                    <div className="flex gap-3 mb-2 overflow-x-auto pb-2 custom-scrollbar justify-center">
                        {globalImages.map((img, idx) => (
                            <div key={idx} className="relative shrink-0 group/img">
                                <div className="absolute top-1 right-1 z-10 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => removeGlobalImage(idx)}
                                        className="bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <img
                                    src={img.previewUrl}
                                    alt="Preview"
                                    className="h-16 w-auto rounded-xl border border-slate-200 dark:border-white/10 shadow-sm bg-white"
                                />
                            </div>
                        ))}
                    </div>
                )}

                <div className="glass-panel rounded-2xl p-2 flex gap-2 shadow-xl transition-all duration-300 focus-within:ring-2 ring-brand-500/50">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 text-slate-500 hover:bg-slate-100 rounded-xl"
                    >
                        <Settings size={20} />
                    </button>

                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={promptInput}
                            onChange={e => setPromptInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreateCard(); }}
                            onPaste={handleGlobalPaste}
                            className="w-full h-full bg-transparent outline-none text-slate-200 placeholder-slate-500 font-medium px-2"
                            placeholder="Type a prompt to create a new card..."
                        />
                    </div>

                    <input
                        type="file"
                        ref={globalFileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleGlobalImageUpload}
                    />
                    <button
                        onClick={() => globalFileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:text-brand-400 hover:bg-slate-800/50 rounded-xl transition-all"
                        title="Upload Image"
                    >
                        <ImageIcon size={20} />
                    </button>

                    <button
                        onClick={handleCreateCard}
                        disabled={isGenerating || (!promptInput.trim() && globalImages.length === 0)}
                        className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    </button>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="fixed top-6 inset-x-0 mx-auto w-fit glass-panel px-6 py-3 rounded-full flex items-center gap-4 z-50 animate-slide-up shadow-2xl">
                    <span className="text-sm font-semibold text-slate-300">{selectedIds.length} items</span>
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
                    onGenerateResponse={handleChatGenerate}
                />
            )}
        </React.Fragment>
    );
}


if (typeof window !== 'undefined') window.App = App;
