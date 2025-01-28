
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Sparkles, Loader2, Trash2, RefreshCw, LayoutGrid, ArrowLeft, ChevronDown, CheckCircle2, AlertCircle, Play, Image as ImageIcon, X, StickyNote, AlignStartHorizontal } from 'lucide-react';
import Canvas from './components/Canvas';
import ChatModal from './components/ChatModal';
import BoardGallery from './components/BoardGallery';
import SettingsModal from './components/SettingsModal';
import { auth, googleProvider } from './services/firebase';
import { saveBoard, loadBoard, loadBoardsMetadata, deleteBoard, createBoard, setCurrentBoardId, getCurrentBoardId, listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud, saveUserSettings, loadUserSettings, loadSettings, saveSettings } from './services/storage';
import {
    chatCompletion,
    streamChatCompletion,
    generateTitle,
    imageGeneration,
    getApiConfig
} from './services/llm';
import { uploadImageToS3, getS3Config } from './services/s3';

// Settings Modal Component

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
    const [isGenerating, setIsGenerating] = useState(false);
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
                unsubDb = listenForBoardUpdates(u.uid, (cloudBoards, updatedIds) => {
                    // Update metadata list
                    setBoardsList(cloudBoards);

                    // If active board was updated by cloud (possibly from another device)
                    // Reload it to hydrate new S3 images to local base64
                    const currentActiveId = localStorage.getItem('mixboard_current_board_id');
                    if (updatedIds && currentActiveId && updatedIds.includes(currentActiveId)) {
                        console.log("[Sync] Active board updated in cloud, reloading cards...");
                        loadBoard(currentActiveId).then(data => {
                            if (data && data.cards) {
                                setCards(data.cards);
                            }
                        });
                    }
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

    // Auto Arrange Logic
    const handleAutoArrange = () => {
        if (cards.length === 0) return;

        const sortedCards = [...cards].sort((a, b) => {
            // Function to extract number from start of text
            const getNum = (card) => {
                let text = card.data.title || "";
                if (card.data.messages && card.data.messages.length > 0) {
                    // Try to get text from first user message if title is generic
                    const firstMsg = card.data.messages[0];
                    if (typeof firstMsg.content === 'string') {
                        text = firstMsg.content;
                    } else if (Array.isArray(firstMsg.content) && firstMsg.content[0]?.text) {
                        text = firstMsg.content[0].text;
                    }
                }

                const match = text.match(/^(\d+)[.、]/);
                return match ? parseInt(match[1], 10) : Infinity; // Non-numbered go to end
            };

            const numA = getNum(a);
            const numB = getNum(b);

            if (numA === numB) return 0;
            return numA - numB;
        });

        // Layout Parameters
        const startX = 100;
        const startY = 200;
        const gap = 50;
        const cardWidth = 320; // Approx card width

        const newCards = sortedCards.map((card, index) => ({
            ...card,
            x: startX + index * (cardWidth + gap),
            y: startY
        }));

        setCards(newCards);
    };

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
    const [generatingCardIds, setGeneratingCardIds] = useState(new Set());
    const globalFileInputRef = React.useRef(null);

    // Connection Mode State
    const [showSelectionBar, setShowSelectionBar] = useState(false);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [availableModels, setAvailableModels] = useState([]);
    const [currentModelName, setCurrentModelName] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStartId, setConnectionStartId] = useState(null);

    // History State for Undo/Redo
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    // Clipboard State
    const [clipboard, setClipboard] = useState(null);

    // Canvas Pan & Zoom State (Lifted from Canvas.jsx)
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

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

        const newCards = clipboard.map((card, index) => {
            const newId = Date.now() + Math.random();
            // Paste near center of viewport
            const centerX = (window.innerWidth / 2 - offset.x) / scale;
            const centerY = (window.innerHeight / 2 - offset.y) / scale;

            return {
                ...card,
                id: newId,
                x: centerX + (index * 20),
                y: centerY + (index * 20),
                data: { ...card.data } // Deep clone data to avoid ref issues
            };
        });

        const newCardState = [...cards, ...newCards];
        setCards(newCardState);
        addToHistory(newCardState, connections);

        // Select newly pasted cards
        setSelectedIds(newCards.map(c => c.id));
    };

    // Load available models for switcher
    useEffect(() => {
        const fetchModels = async () => {
            const settings = await loadSettings();
            const provider = settings.activeProvider || 'gmicloud';
            const config = settings.providers[provider];
            if (config && config.models) {
                // Ensure it's an array
                const modelsArr = typeof config.models === 'string'
                    ? config.models.split(',').map(m => m.trim()).filter(Boolean)
                    : config.models;
                setAvailableModels(modelsArr);
                setCurrentModelName(config.model || modelsArr[0] || '');
            }
        };
        fetchModels();
    }, [isSettingsOpen, isSwitcherOpen]); // Reload when settings close or switcher opens

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
            // If multiple cards are selected, link them in sequence
            if (e.key === 'l' || e.key === 'L') {
                if (selectedIds.length > 1) {
                    // Chain link: 1->2, 2->3, etc.
                    const newConns = [...connections];
                    let added = false;
                    for (let i = 0; i < selectedIds.length - 1; i++) {
                        const from = selectedIds[i];
                        const to = selectedIds[i + 1];
                        // Avoid duplicates
                        if (!newConns.some(c => (c.from === from && c.to === to) || (c.from === to && c.to === from))) {
                            newConns.push({ from, to });
                            added = true;
                        }
                    }
                    if (added) {
                        setConnections(newConns);
                        addToHistory(cards, newConns);
                        console.log(`[Batch Link] Created links for ${selectedIds.length} cards`);
                    }
                } else if (selectedIds.length === 1) {
                    // Original single-card connection mode
                    handleConnect(selectedIds[0]);
                }
            }

            // C -> Cut (Disconnect)
            if (e.key === 'c' || e.key === 'C') {
                // Handle different from Command+C (copy)
                if (e.metaKey || e.ctrlKey) return;

                if (selectedIds.length > 1) {
                    // Remove all connections between selected cards
                    const newConns = connections.filter(c =>
                        !(selectedIds.includes(c.from) && selectedIds.includes(c.to))
                    );
                    if (newConns.length !== connections.length) {
                        setConnections(newConns);
                        addToHistory(cards, newConns);
                        console.log(`[Batch Unlink] Removed internal links for ${selectedIds.length} cards`);
                    }
                } else if (selectedIds.length === 1) {
                    // Remove all connections involving this card
                    const targetId = selectedIds[0];
                    const newConns = connections.filter(c => c.from !== targetId && c.to !== targetId);
                    if (newConns.length !== connections.length) {
                        setConnections(newConns);
                        addToHistory(cards, newConns);
                        console.log(`[Single Unlink] Removed all links for card ${targetId}`);
                    }
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

    // Sync Tab Title
    useEffect(() => {
        if (view === 'canvas' && currentBoardId) {
            const board = boardsList.find(b => b.id === currentBoardId);
            if (board) {
                document.title = `${board.name} | Neural Canvas`;
            } else {
                document.title = 'Neural Canvas';
            }
        } else {
            document.title = 'Neural Canvas';
        }
    }, [view, currentBoardId, boardsList]);

    // 2. Auto-Save Cards & Connections
    const globalPromptInputRef = useRef(null);

    // Auto-resize reset for global input
    useEffect(() => {
        if (globalPromptInputRef.current) {
            globalPromptInputRef.current.style.height = 'auto';
            if (promptInput) {
                globalPromptInputRef.current.style.height = Math.min(globalPromptInputRef.current.scrollHeight, 200) + 'px';
            }
        }
    }, [promptInput]);

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
        const initialX = (window.innerWidth / 2 - offset.x) / scale - 160;
        const initialY = (window.innerHeight / 2 - offset.y) / scale - 100;

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
                model: getApiConfig().model || "google/gemini-2.0-flash-exp"
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
                updateCardContent,
                null
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
            // setIsGenerating(false); // This state is not defined globally, it's likely generatingCardIds
            setGeneratingCardIds(prev => {
                const next = new Set(prev);
                next.delete(newId);
                return next;
            });
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
                // Assuming 'targetId' in the user's snippet refers to 'sourceId' from the function parameter
                // And 'fromCard', 'toCard' are conceptual checks, not actual variables here.
                // The original code already has a duplicate check.
                // We'll integrate the localStorage.setItem into the existing structure.

                // Check for duplicate connection
                const exists = connections.some(c =>
                    (c.from === connectionStartId && c.to === sourceId) ||
                    (c.from === sourceId && c.to === connectionStartId)
                );

                if (!exists) {
                    const newConns = [...connections, { from: connectionStartId, to: sourceId }];
                    setConnections(newConns);
                    addToHistory(cards, newConns);
                    localStorage.setItem('hasUsedConnections', 'true'); // Added this line
                }
            }
            setIsConnecting(false); // This was outside the if (connectionStartId !== sourceId) in original
            setConnectionStartId(null); // This was outside the if (connectionStartId !== sourceId) in original
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

        console.log('[App] handleCreateCard with prompt:', promptInput);

        // Check for Image Generation Command
        if (promptInput.startsWith('/draw ') || promptInput.startsWith('/image ')) {
            const prompt = promptInput.replace(/^\/(draw|image)\s+/, '');
            setPromptInput('');

            const newCardId = Date.now().toString();
            const newCard = {
                id: newCardId,
                type: 'image_gen',
                x: 100 + Math.random() * 200,
                y: 100 + Math.random() * 200,
                data: {
                    prompt: prompt,
                    loading: true,
                    title: `Generating: ${prompt.substring(0, 20)}...`
                }
            };

            setCards(prev => [...prev, newCard]);

            try {
                const imageUrl = await imageGeneration(prompt);
                setCards(prev => prev.map(c => c.id === newCardId ? {
                    ...c,
                    data: {
                        ...c.data,
                        imageUrl: imageUrl,
                        loading: false,
                        title: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '')
                    }
                } : c));
            } catch (err) {
                console.error('Image generation failed:', err);
                setCards(prev => prev.map(c => c.id === newCardId ? {
                    ...c,
                    data: {
                        ...c.data,
                        error: err.message,
                        loading: false,
                        title: 'Generation Failed'
                    }
                } : c));
            }
            return;
        }

        const userPrompt = promptInput;
        const newId = Date.now();
        const initialX = (window.innerWidth / 2 - offset.x) / scale - 160 + (Math.random() * 40 - 20);
        const initialY = (window.innerHeight / 2 - offset.y) / scale - 100 + (Math.random() * 40 - 20);

        // Smart Connect & Context Logic
        let contextPrefix = "";
        const autoConnections = [];

        if (selectedIds.length > 0) {
            const contextCards = cards.filter(c => selectedIds.includes(c.id));

            // 1. Gather Context
            if (contextCards.length > 0) {
                const contextTexts = contextCards.map(c => {
                    let text = c.data.title || "Untitled Card";
                    // Try to get more content
                    if (c.data.messages && c.data.messages.length > 0) {
                        // Simplify: just grab the last assistant response or first user message?
                        // Let's grab the LAST message content as "current state"
                        const lastMsg = c.data.messages[c.data.messages.length - 1];
                        if (typeof lastMsg.content === 'string') {
                            text += `: ${lastMsg.content.substring(0, 500)}...`; // Truncate for sanity
                        }
                    }
                    return `Possible Context from Card [${c.id}]:\n${text}`;
                });
                contextPrefix = `[System: The user has selected the following cards as context. Use this information to inform your response.]\n\n${contextTexts.join('\n\n')}\n\n---\n\n`;
            }

            // 2. Prepare Connections
            contextCards.forEach(c => {
                autoConnections.push({ from: c.id, to: newId });
            });
        }

        // Construct Content with S3 support
        let content = promptInput;
        if (globalImages.length > 0) {
            const s3Config = getS3Config();

            // 1. Prepare images immediately with base64 (Non-blocking)
            let processedImages = globalImages.map(img => ({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: img.mimeType,
                    data: img.base64,
                    s3Url: null // Will be updated later if S3 is enabled
                }
            }));

            // 2. Trigger Background Upload if enabled
            if (s3Config?.enabled) {
                console.log('[S3 Debug] Global card - Starting background upload...');

                // Fire and forget - don't await
                const imagesToUpload = [...globalImages]; // Capture current images
                Promise.all(imagesToUpload.map(img => uploadImageToS3(img.file).catch(err => {
                    console.error("Global card - Single image upload failed", err);
                    return null;
                }))).then(urls => {
                    console.log('[S3 Debug] Global card - Background upload complete:', urls);

                    // Update the card with S3 URLs
                    setCards(prev => prev.map(c => {
                        if (c.id === newId) {
                            const userMsg = c.data.messages[0]; // First message is user message
                            if (Array.isArray(userMsg.content)) {
                                const updatedContent = userMsg.content.map((part, i) => {
                                    if (part.type === 'image' && part.source) {
                                        const urlIndex = i - 1; // Offset for text at index 0
                                        if (urlIndex >= 0 && urlIndex < urls.length && urls[urlIndex]) {
                                            return {
                                                ...part,
                                                source: {
                                                    ...part.source,
                                                    s3Url: urls[urlIndex]
                                                }
                                            };
                                        }
                                    }
                                    return part;
                                });

                                const updatedMessages = [...c.data.messages];
                                updatedMessages[0] = { ...userMsg, content: updatedContent };
                                return { ...c, data: { ...c.data, messages: updatedMessages } };
                            }
                        }
                        return c;
                    }));
                }).catch(err => {
                    console.error("[S3 Global card - Background Upload Error]", err);
                });
            }

            content = [
                { type: 'text', text: promptInput },
                ...processedImages
            ];
        }

        // Resolve default model (v2 config)
        const apiConfig = getApiConfig();
        const defaultModel = apiConfig.model || "google/gemini-2.0-flash-exp";
        const defaultProviderId = "gmicloud"; // Legacy field, keeping for schema compatibility

        // Initial empty assistant message
        const newCard = {
            id: newId,
            x: Math.max(0, initialX),
            y: Math.max(0, initialY),
            data: {
                title: userPrompt.length > 20 ? userPrompt.substring(0, 20) + '...' : (userPrompt || 'Image Input'),
                messages: [
                    { role: 'user', content: contextPrefix + (typeof content === 'string' ? content : "") }, // Handle string vs array content later
                    { role: 'assistant', content: '' } // Placeholder for streaming
                ],
                model: defaultModel,
                providerId: defaultProviderId
            }
        };

        // If content was array (images), we need to inject context into the text part
        if (Array.isArray(content)) {
            // Find text part or add one
            const textPart = content.find(p => p.type === 'text');
            if (textPart) {
                textPart.text = contextPrefix + textPart.text;
            } else {
                content.unshift({ type: 'text', text: contextPrefix });
            }
            newCard.data.messages[0].content = content;
        }

        const newCardState = [...cards, newCard];
        setCards(newCardState);
        const finalConnections = [...connections, ...autoConnections];
        setConnections(finalConnections);
        addToHistory(newCardState, finalConnections);
        setPromptInput('');
        setGlobalImages([]); // Clear images
        setGeneratingCardIds(prev => new Set(prev).add(newId));
        setPromptInput('');
        setGlobalImages([]); // Clear images
        setGeneratingCardIds(prev => new Set(prev).add(newId));

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
                updateCardContent,
                null, // Use global config model
                { providerId: defaultProviderId }
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
            setGeneratingCardIds(prev => {
                const next = new Set(prev);
                next.delete(newId);
                return next;
            });
        }
    };

    const handleCreateNote = (initialContent = '', initialX = null, initialY = null) => {
        // Find if there is already a note card
        const existingNote = cards.find(c => c.type === 'note');

        if (existingNote) {
            // Append to existing note
            const currentContent = existingNote.data.content || '';

            // Determine next sequence number
            // Look for patterns like "01.", "02." to find the max
            const matches = currentContent.match(/^(\d+)[.、]/gm);
            let nextNum = 1;
            if (matches && matches.length > 0) {
                const numbers = matches.map(m => parseInt(m, 10));
                nextNum = Math.max(...numbers) + 1;
            } else if (currentContent.trim()) {
                // If content exists but no numbers, start at 2 (assuming 1 is implicit or messy)
                nextNum = 2;
            }

            const sequence = String(nextNum).padStart(2, '0');
            const newEntry = initialContent
                ? `\n\n${sequence}. ${initialContent}`
                : `\n\n${sequence}. `;

            const updatedNote = {
                ...existingNote,
                data: {
                    ...existingNote.data,
                    content: currentContent + newEntry
                }
            };

            const newCardState = cards.map(c => c.id === existingNote.id ? updatedNote : c);
            setCards(newCardState);
            addToHistory(newCardState, connections);

        } else {
            // Create new note
            const newId = Date.now();
            const sequence = "01";
            const prefixedContent = initialContent
                ? `${sequence}. ${initialContent}`
                : `${sequence}. `;

            // Calculate center position using current pan and zoom
            const centerX = (window.innerWidth / 2 - offset.x) / scale - 140;
            const centerY = (window.innerHeight / 2 - offset.y) / scale - 140;

            const posX = initialX !== null ? initialX : (centerX + (Math.random() * 40 - 20));
            const posY = initialY !== null ? initialY : (centerY + (Math.random() * 40 - 20));

            const newNote = {
                id: newId,
                type: 'note',
                x: Math.max(0, posX),
                y: Math.max(0, posY),
                data: {
                    content: prefixedContent,
                    image: null
                }
            };

            const newCardState = [...cards, newNote];
            setCards(newCardState);
            addToHistory(newCardState, connections);
        }
    };

    const handleUpdateBoardTitle = async (newTitle) => {
        if (!newTitle.trim() || !currentBoardId) return;

        console.log('[App] handleUpdateBoardTitle:', newTitle);

        // 1. Update metadata list immediately for UI sync
        setBoardsList(prev => prev.map(b => b.id === currentBoardId ? { ...b, name: newTitle } : b));

        // 2. Save to storage
        const boardData = await loadBoard(currentBoardId);
        if (boardData) {
            await saveBoard(currentBoardId, { ...boardData, name: newTitle });
            if (user) await saveBoardToCloud(user.uid, currentBoardId, { ...boardData, name: newTitle });
        }
    };

    const handleExpandTopics = async (sourceCardId) => {
        const sourceCard = cards.find(c => c.id === sourceCardId);
        if (!sourceCard || !sourceCard.data.marks || sourceCard.data.marks.length === 0) return;

        const marks = sourceCard.data.marks;
        const newCardsState = [...cards];
        const newConnectionsState = [...connections];

        for (let i = 0; i < marks.length; i++) {
            const mark = marks[i];
            const newId = Date.now() + i;
            // Simple circular/offset layout
            const angle = (i / marks.length) * Math.PI * 2;
            const dist = 400;
            const newX = sourceCard.x + Math.cos(angle) * dist;
            const newY = sourceCard.y + Math.sin(angle) * dist;

            const apiConfig = getApiConfig();
            const defaultModel = sourceCard.data.model || apiConfig.model || "google/gemini-2.0-flash-exp";
            const defaultProviderId = sourceCard.data.providerId || "gmicloud";

            const newCard = {
                id: newId,
                x: newX,
                y: newY,
                data: {
                    title: mark.length > 20 ? mark.substring(0, 20) + '...' : mark,
                    messages: [
                        { role: 'user', content: mark },
                        { role: 'assistant', content: '' }
                    ],
                    model: defaultModel,
                    providerId: defaultProviderId
                }
            };

            newCardsState.push(newCard);
            newConnectionsState.push({ from: sourceCardId, to: newId });

            // Trigger generation (Async)
            // We need to use handleChatGenerate but it wants messages.
            // Let's call it manually for each
            setTimeout(() => {
                handleChatGenerate(newId, [{ role: 'user', content: mark }], (token) => {
                    setCards(prev => prev.map(c => {
                        if (c.id === newId) {
                            const msgs = [...c.data.messages];
                            msgs[1] = { ...msgs[1], content: msgs[1].content + token };
                            return { ...c, data: { ...c.data, messages: msgs } };
                        }
                        return c;
                    }));
                });
            }, 100 * i);
        }

        setCards(newCardsState);
        setConnections(newConnectionsState);
        addToHistory(newCardsState, newConnectionsState);
    };

    const handleDeleteCard = (id) => {
        const newCards = cards.filter(c => c.id !== id);
        const newConnections = connections.filter(c => c.from !== id && c.to !== id);
        setCards(newCards);
        setConnections(newConnections);
        setSelectedIds(prev => prev.filter(sid => sid !== id));
        addToHistory(newCards, newConnections);
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
                contextMessages.push({ role: 'user', content: `[System Note: This card is connected to others. Here is their recent context:]\n\n${contextText} ` });
            }
        }

        // Pure Gemini - No System Prompt
        return [...contextMessages, ...newMessages];
    };

    const handleChatGenerate = async (cardId, messages, onToken) => {
        setGeneratingCardIds(prev => new Set(prev).add(cardId));
        try {
            const fullMessages = await generateResponseForCard(cardId, messages);
            const card = cards.find(c => c.id === cardId);
            const model = card?.data?.model;
            const providerId = card?.data?.providerId;
            await streamChatCompletion(fullMessages, onToken, model, { providerId });
        } finally {
            setGeneratingCardIds(prev => {
                const next = new Set(prev);
                next.delete(cardId);
                return next;
            });
        }
    };

    const handleUpdateCard = (id, newData) => {
        console.log('[App] handleUpdateCard called for card:', id, 'newData type:', typeof newData);
        setCards(prev => prev.map(c => {
            if (c.id === id) {
                const resolvedData = typeof newData === 'function' ? newData(c.data) : newData;
                console.log('[App] Updating card. Messages count:', resolvedData.messages?.length || 0, 'Data stringify size:', JSON.stringify(resolvedData).length);
                return { ...c, data: resolvedData };
            }
            return c;
        }));
    };

    // Group Drag Logic
    const handleCardMove = (id, newX, newY) => {
        setCards(prev => {
            const sourceCard = prev.find(c => c.id === id);
            if (!sourceCard) return prev;

            const dx = newX - sourceCard.x;
            const dy = newY - sourceCard.y;

            if (dx === 0 && dy === 0) return prev;

            // Determine which IDs to move:
            // 1. If the card being dragged is selected, move all selected cards
            // 2. Otherwise, move the connected graph
            const isSelected = selectedIds.includes(id);
            const moveIds = isSelected ? new Set(selectedIds) : getConnectedGraph(id);

            return prev.map(c => {
                if (moveIds.has(c.id)) {
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

        // setIsGenerating(true); // This state is not defined globally, it's likely generatingCardIds

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
            // setIsGenerating(false); // This state is not defined globally, it's likely generatingCardIds
            setGeneratingCardIds(prev => {
                const next = new Set(prev);
                targets.forEach(card => next.delete(card.id));
                return next;
            });
        }
    };

    if (view === 'gallery') {
        return (
            <React.Fragment>
                <div className="bg-slate-50 dark:bg-slate-950 h-screen text-slate-900 dark:text-slate-200 p-8 font-lxgw relative overflow-y-auto transition-colors duration-500 custom-scrollbar">
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
                onDeleteCard={handleDeleteCard}
                isConnecting={isConnecting}
                connectionStartId={connectionStartId}
                offset={offset}
                setOffset={setOffset}
                scale={scale}
                setScale={setScale}
            />

            {/* Teaching Bubble for Connections */}
            {/* Teaching Bubble for Connections */}
            {cards.length > 1 && !localStorage.getItem('hasUsedConnections') && connections.length === 0 && (
                <div className="fixed bottom-48 left-1/2 -translate-x-1/2 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium animate-fade-in pointer-events-none opacity-80 z-40">
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

                    <input
                        type="text"
                        key={currentBoardId} // Add key to force re-render on board change
                        defaultValue={boardsList.find(b => b.id === currentBoardId)?.name || 'Untitled Board'}
                        onBlur={(e) => handleUpdateBoardTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateBoardTitle(e.target.value); e.target.blur(); } }}
                        className="bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 font-bold tracking-tight text-sm select-none hover:bg-slate-50 dark:hover:bg-white/5 px-2 py-0.5 rounded transition-colors"
                    />
                </div>
            </div>

            {/* Chat Input Bar */}
            <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
                {/* Global Image Previews */}
                {globalImages.length > 0 && (
                    <div className="flex gap-3 mb-2 overflow-x-auto pb-2 custom-scrollbar justify-center pointer-events-auto">
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

                {/* Floating Gemini Input Bar */}
                <div className="fixed bottom-8 inset-x-0 mx-auto w-full max-w-3xl z-50 px-4 pointer-events-auto">
                    <div className="bg-[#1e1e1e]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col gap-2 p-2 transition-all duration-300 hover:shadow-brand-500/10 ring-1 ring-white/5">

                        <div className="flex items-end gap-2 px-2">
                            {/* Left Actions */}
                            <div className="flex gap-1 pb-2">
                                <button
                                    onClick={() => globalFileInputRef.current?.click()}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                    title="Upload Image"
                                >
                                    <ImageIcon size={20} />
                                </button>
                                {/* Input for file upload */}
                                <input
                                    type="file"
                                    ref={globalFileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleGlobalImageUpload}
                                />
                                <button
                                    onClick={handleCreateNote}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                    title="Add Sticky Note"
                                >
                                    <StickyNote size={20} />
                                </button>
                            </div>

                            {/* Input Area */}
                            <div className="flex-1 relative">
                                <textarea
                                    ref={globalPromptInputRef}
                                    value={promptInput}
                                    onInput={(e) => {
                                        setPromptInput(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                            e.preventDefault();
                                            handleCreateCard();
                                        }
                                    }}
                                    placeholder={
                                        cards.length === 0
                                            ? "Start a new board..."
                                            : selectedIds.length > 0
                                                ? `Ask about ${selectedIds.length} selected items...`
                                                : "Type to create or ask..."
                                    }
                                    className="w-full bg-transparent text-slate-200 placeholder-slate-500 text-base p-3 focus:outline-none resize-none overflow-y-auto max-h-[200px] min-h-[44px] scrollbar-hide"
                                    rows={1}
                                />
                                {/* Image Previews in Input */}
                                {globalImages.length > 0 && (
                                    <div className="flex gap-2 p-2 overflow-x-auto">
                                        {globalImages.map((img, index) => (
                                            <div key={index} className="relative group shrink-0">
                                                <img
                                                    src={img.previewUrl}
                                                    alt="Upload preview"
                                                    className="w-16 h-16 object-cover rounded-lg border border-white/10"
                                                />
                                                <button
                                                    onClick={() => removeGlobalImage(index)}
                                                    className="absolute -top-1 -right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right Actions & Submit */}
                            <div className="flex gap-1 pb-2 items-center">
                                {/* Auto Arrange (Mini) */}
                                <button
                                    onClick={handleAutoArrange}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                    title="Auto Arrange"
                                >
                                    <AlignStartHorizontal size={20} />
                                </button>

                                <div className="w-px h-6 bg-white/10 mx-1" />

                                <button
                                    onClick={handleCreateCard}
                                    disabled={(!promptInput.trim() && globalImages.length === 0)}
                                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center transform hover:-translate-y-0.5"
                                >
                                    {isGenerating ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={20} className="fill-white" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="fixed top-6 inset-x-0 mx-auto w-fit glass-panel px-6 py-3 rounded-full flex items-center gap-4 z-50 animate-slide-up shadow-2xl">
                    <span className="text-sm font-semibold text-slate-300">{selectedIds.length} items</span>

                    {selectedIds.length === 1 && cards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0 && (
                        <>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <button
                                onClick={() => handleExpandTopics(selectedIds[0])}
                                className="flex items-center gap-2 text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors"
                                title="Expand marked topics into new cards"
                            >
                                <Sparkles size={16} />
                                <span className="text-sm font-medium">Expand Topic</span>
                            </button>
                        </>
                    )}

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
                    isGenerating={generatingCardIds.has(expandedCardId)}
                    onCreateNote={handleCreateNote}
                />
            )}
        </React.Fragment>
    );
}


if (typeof window !== 'undefined') window.App = App;
