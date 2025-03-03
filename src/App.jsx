
import React, { useState, useEffect, useRef } from 'react';
import { useStore, undo, redo } from './store/useStore';
import { Settings, Sparkles, Loader2, Trash2, RefreshCw, LayoutGrid, ArrowLeft, ChevronDown, CheckCircle2, AlertCircle, Play, Image as ImageIcon, X, StickyNote, Plus } from 'lucide-react';
import Canvas from './components/Canvas';
import ChatModal from './components/ChatModal';
import BoardGallery from './components/BoardGallery';
import SettingsModal from './components/SettingsModal';
import { auth, googleProvider } from './services/firebase';
import { saveBoard, loadBoard, loadBoardsMetadata, deleteBoard, createBoard, setCurrentBoardId, getCurrentBoardId, listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud, saveUserSettings, loadUserSettings } from './services/storage';
import {
    chatCompletion,
    streamChatCompletion,
    generateTitle,
    imageGeneration,
    getApiConfig, // Keep for legacy if needed, or better use getActiveConfig
    getActiveConfig
} from './services/llm';
import { uploadImageToS3, getS3Config } from './services/s3';

import { ONBOARDING_DATA } from './utils/onboarding';

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
    // const [isGenerating, setIsGenerating] = useState(false); // Legacy - using generatingCardIds
    const [boardsList, setBoardsList] = useState([]);

    // Track initialization to avoid first history push being empty
    const [isInitialized, setIsInitialized] = useState(false);

    // 0. Global Paste Listener
    useEffect(() => {
        const handlePaste = (e) => handleGlobalPaste(e);
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

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
                    if (updatedIds && currentActiveId && updatedIds.indexOf(currentActiveId) !== -1) {
                        console.log("[Sync] Active board updated in cloud, reloading cards...");
                        loadBoard(currentActiveId).then(data => {
                            if (data && data.cards) {
                                setCards(data.cards);
                            }
                        });
                    }
                });

                // User settings sync is handled by SettingsModal and llm.js provider registry
                loadUserSettings(u.uid).then(settings => {
                    if (settings) {
                        console.log("[Sync] User settings loaded from cloud:", settings);
                        if (settings.providers) {
                            localStorage.setItem('mixboard_providers_v3', JSON.stringify({
                                providers: settings.providers,
                                activeId: settings.activeId || 'google'
                            }));
                        }
                        if (settings.s3Config) {
                            localStorage.setItem('mixboard_s3_config', JSON.stringify(settings.s3Config));
                        }
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
    // Auto Arrange Logic

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

    const {
        cards, setCards,
        connections, setConnections,
        selectedIds, setSelectedIds,
        offset, setOffset,
        scale, setScale,
        isSettingsOpen, setIsSettingsOpen,
        undo, redo
    } = useStore();

    // Persist canvas state
    useEffect(() => {
        const saveState = () => {
            localStorage.setItem('canvas_offset', JSON.stringify(offset));
            localStorage.setItem('canvas_scale', scale.toString());
        };
        saveState();
    }, [offset, scale]);

    // Local UI state (not in global store)
    const [currentBoardId, setCurrentBoardId] = useState(null);
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [promptInput, setPromptInput] = useState('');
    const [globalImages, setGlobalImages] = useState([]);
    const { generatingCardIds, setGeneratingCardIds, createAICard, updateCardContent, setCardGenerating } = useStore();
    const globalFileInputRef = React.useRef(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStartId, setConnectionStartId] = useState(null);
    const [clipboard, setClipboard] = useState(null);

    // Keyboard shortcuts for undo/redo are handled in the global listener

    const handleCopy = async () => {
        if (selectedIds.length === 0) return;
        const selectedCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);
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
        // History is now automatically tracked by zundo

        // Select newly pasted cards
        setSelectedIds(newCards.map(c => c.id));
    };



    const handleCreateOnboardingBoard = async () => {
        const newBoard = await createBoard(ONBOARDING_DATA.name);
        await saveBoard(newBoard.id, {
            cards: ONBOARDING_DATA.cards,
            connections: ONBOARDING_DATA.connections
        });
        setBoardsList([newBoard]);
        await handleSelectBoard(newBoard.id);
    };

    // 1. Initial Load
    useEffect(() => {
        const init = async () => {
            const list = loadBoardsMetadata();
            setBoardsList(list);

            const lastId = getCurrentBoardId();
            if (lastId && list.some(b => b.id === lastId)) {
                await handleSelectBoard(lastId);
            } else if (list.length === 0) {
                // Auto create onboarding for new users
                console.log("[Init] No boards found, creating onboarding guide...");
                await handleCreateOnboardingBoard();
            }
            setIsInitialized(true);
        };
        init();
    }, []);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input or textarea
            if (['INPUT', 'TEXTAREA'].indexOf(e.target.tagName) !== -1 || e.target.isContentEditable) return;

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
                        // History automatically tracked by zundo
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
                        !(selectedIds.indexOf(c.from) !== -1 && selectedIds.indexOf(c.to) !== -1)
                    );
                    if (newConns.length !== connections.length) {
                        setConnections(newConns);
                        // History automatically tracked by zundo
                        console.log(`[Batch Unlink] Removed internal links for ${selectedIds.length} cards`);
                    }
                } else if (selectedIds.length === 1) {
                    // Remove all connections involving this card
                    const targetId = selectedIds[0];
                    const newConns = connections.filter(c => c.from !== targetId && c.to !== targetId);
                    if (newConns.length !== connections.length) {
                        setConnections(newConns);
                        // History automatically tracked by zundo
                        console.log(`[Single Unlink] Removed all links for card ${targetId}`);
                    }
                }
            }

            // Command/Ctrl + Z -> Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }

            // Command/Ctrl + Shift + Z -> Redo
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                redo();
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
    }, [selectedIds, cards, connections, clipboard]); // Include dependencies

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

    const createCardWithText = async (text, boardId, images = []) => {
        if (!text.trim() && images.length === 0) return;

        const initialX = (window.innerWidth / 2 - offset.x) / scale - 160;
        const initialY = (window.innerHeight / 2 - offset.y) / scale - 100;

        const activeConfig = getActiveConfig();

        try {
            const newId = await createAICard({
                text,
                x: Math.max(0, initialX),
                y: Math.max(0, initialY),
                images,
                model: activeConfig.model,
                providerId: activeConfig.id
            });

            await streamChatCompletion(
                [{ role: 'user', content: text }],
                (chunk) => updateCardContent(newId, chunk),
                activeConfig.model,
                { providerId: activeConfig.id }
            );
        } catch (error) {
            console.error("Quick Start Error:", error);
        } finally {
            setCardGenerating(null, false);
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
                setConnections(prevConns => {
                    const exists = prevConns.some(c =>
                        (c.from === connectionStartId && c.to === sourceId) ||
                        (c.from === sourceId && c.to === connectionStartId)
                    );

                    if (!exists) {
                        const newConns = [...prevConns, { from: connectionStartId, to: sourceId }];
                        // History automatically tracked by zundo
                        localStorage.setItem('hasUsedConnections', 'true');
                        return newConns;
                    }
                    return prevConns;
                });
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

        const activeConfig = getActiveConfig();
        const currentPrompt = promptInput; // Capture current input
        setPromptInput('');

        if (currentPrompt.startsWith('/draw ') || currentPrompt.startsWith('/image ')) {
            const promptText = currentPrompt.replace(/^\/(draw|image)\s+/, '');
            const newCardId = Date.now().toString();

            setCards(prev => [...prev, {
                id: newCardId,
                type: 'image_gen',
                x: (window.innerWidth / 2 - offset.x) / scale - 160 + (Math.random() * 40 - 20),
                y: (window.innerHeight / 2 - offset.y) / scale - 100 + (Math.random() * 40 - 20),
                data: { prompt: promptText, loading: true, title: `Generating: ${promptText.substring(0, 20)}...` }
            }]);

            try {
                const imageUrl = await imageGeneration(promptText);
                setCards(prev => prev.map(c => c.id === newCardId ? {
                    ...c, data: { ...c.data, imageUrl, loading: false, title: promptText.substring(0, 30) + (promptText.length > 30 ? '...' : '') }
                } : c));
            } catch (err) {
                console.error('Image generation failed:', err);
                setCards(prev => prev.map(c => c.id === newCardId ? {
                    ...c, data: { ...c.data, error: err.message, loading: false, title: 'Generation Failed' }
                } : c));
            }
            return;
        }

        // AI Chat Card Creation
        const initialX = (window.innerWidth / 2 - offset.x) / scale - 160 + (Math.random() * 40 - 20);
        const initialY = (window.innerHeight / 2 - offset.y) / scale - 100 + (Math.random() * 40 - 20);

        // Gather Context from FRESH state
        let contextPrefix = "";
        const contextCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);
        if (contextCards.length > 0) {
            const contextTexts = contextCards.map(c => {
                let text = c.data.title || "Untitled Card";
                if (c.data.messages?.length > 0) {
                    const lastMsg = c.data.messages[c.data.messages.length - 1];
                    const contentText = typeof lastMsg.content === 'string' ? lastMsg.content : (Array.isArray(lastMsg.content) ? lastMsg.content.map(p => p.type === 'text' ? p.text : '[Image]').join(' ') : '');
                    text += `: ${contentText.substring(0, 500)}...`;
                }
                return `Possible Context from Card [${c.id}]:\n${text}`;
            });
            contextPrefix = `[System: Context from selected cards]\n\n${contextTexts.join('\n\n')}\n\n---\n\n`;
        }

        const targetImages = [...globalImages];
        setGlobalImages([]);

        try {
            const newId = await createAICard({
                text: currentPrompt,
                x: Math.max(0, initialX),
                y: Math.max(0, initialY),
                images: targetImages,
                contextPrefix,
                autoConnections: selectedIds.map(sid => ({ from: sid, to: Date.now() })),
                model: activeConfig.model,
                providerId: activeConfig.id
            });

            // Start Streaming
            const requestMessages = [{ role: 'user', content: currentPrompt }];
            // If there's context, the store already put it in the card's data.messages[0].
            // But we need to pass the FULL context to the API. 
            // Let's refine the store or App logic to pass the correct prompt.

            await streamChatCompletion(
                [{ role: 'user', content: contextPrefix + currentPrompt }],
                (chunk) => updateCardContent(newId, chunk),
                activeConfig.model,
                { providerId: activeConfig.id }
            );
        } catch (error) {
            console.error(error);
        } finally {
            setCardGenerating(null, false); // Clear via store if needed or just handle finishes
        }
    };

    const handleCreateNote = (initialContent = '', initialX = null, initialY = null) => {
        setCards(prevCards => {
            const existingNote = prevCards.find(c => c.type === 'note');

            if (existingNote) {
                const currentContent = existingNote.data.content || '';
                const matches = currentContent.match(/^(\d+)[.、]/gm);
                let nextNum = 1;
                if (matches && matches.length > 0) {
                    const numbers = matches.map(m => parseInt(m, 10));
                    nextNum = Math.max(...numbers) + 1;
                } else if (currentContent.trim()) {
                    nextNum = 2;
                }

                const sequence = String(nextNum).padStart(2, '0');
                const newEntry = initialContent ? `\n\n${sequence}. ${initialContent} ` : `\n\n${sequence}.`;

                const updatedNote = {
                    ...existingNote,
                    data: { ...existingNote.data, content: currentContent + newEntry }
                };
                const newCardsState = prevCards.map(c => c.id === existingNote.id ? updatedNote : c);
                // History automatically tracked by zundo
                return newCardsState;
            } else {
                const newId = Date.now();
                const sequence = "01";
                const prefixedContent = initialContent ? `${sequence}. ${initialContent} ` : `${sequence}.`;
                const centerX = (window.innerWidth / 2 - offset.x) / scale - 140;
                const centerY = (window.innerHeight / 2 - offset.y) / scale - 140;
                const posX = initialX !== null ? initialX : (centerX + (Math.random() * 40 - 20));
                const posY = initialY !== null ? initialY : (centerY + (Math.random() * 40 - 20));

                const newNote = {
                    id: newId,
                    type: 'note',
                    x: Math.max(0, posX),
                    y: Math.max(0, posY),
                    data: { content: prefixedContent, image: null }
                };
                const newCardsState = [...prevCards, newNote];
                // History automatically tracked by zundo
                return newCardsState;
            }
        });
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

        const activeConfig = getActiveConfig();
        const defaultModel = activeConfig.model;
        const marks = sourceCard.data.marks;

        setCards(prevCards => {
            const nextCards = [...prevCards];
            const nextConnections = [...connections];

            for (let i = 0; i < marks.length; i++) {
                const mark = marks[i];
                const newId = Date.now() + i;
                const angle = (i / marks.length) * Math.PI * 2;
                const dist = 400;
                const newX = sourceCard.x + Math.cos(angle) * dist;
                const newY = sourceCard.y + Math.sin(angle) * dist;

                const newCard = {
                    id: newId, x: newX, y: newY,
                    data: {
                        title: mark.length > 20 ? mark.substring(0, 20) + '...' : mark,
                        messages: [{ role: 'user', content: mark }, { role: 'assistant', content: '' }],
                        model: defaultModel,
                        providerId: activeConfig.id
                    }
                };

                nextCards.push(newCard);
                nextConnections.push({ from: sourceCardId, to: newId });

                setTimeout(() => {
                    handleChatGenerate(newId, [{ role: 'user', content: mark }], (token) => {
                        updateCardContent(newId, token);
                    });
                }, 100);
            }
            setConnections(nextConnections);
            // History automatically tracked
            return nextCards;
        });
    };

    const handleDeleteCard = (id) => {
        const newCards = cards.filter(c => c.id !== id);
        const newConnections = connections.filter(c => c.from !== id && c.to !== id);
        setCards(newCards);
        setConnections(newConnections);
        setSelectedIds(prev => prev.filter(sid => sid !== id));
        // History automatically tracked by zundo
    };

    // Chat completion wrapper for existing cards (ChatModal) to use connections
    const generateResponseForCard = async (cardId, newMessages) => {
        // Find connected context
        const connectedIds = Array.from(getConnectedGraph(cardId));
        // Filter out self
        const neighborIds = connectedIds.filter(id => id !== cardId);

        let contextMessages = [];
        if (neighborIds.length > 0) {
            const neighbors = cards.filter(c => neighborIds.indexOf(c.id) !== -1);
            const contextText = neighbors.map(c =>
                `Context from linked card "${c.data.title}": \n${c.data.messages.slice(-3).map(m => {
                    const contentStr = typeof m.content === 'string'
                        ? m.content
                        : (Array.isArray(m.content)
                            ? m.content.map(p => p.type === 'text' ? p.text : '[Image]').join(' ')
                            : '');
                    return `${m.role}: ${contentStr}`;
                }).join('\n')} `
            ).join('\n\n---\n\n');

            if (contextText.trim()) {
                contextMessages.push({ role: 'user', content: `[System Note: This card is connected to others.Here is their recent context:]\n\n${contextText} ` });
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
        setCards(prev => prev.map(c => {
            if (c.id === id) {
                const resolvedData = typeof newData === 'function' ? newData(c.data) : newData;
                return { ...c, data: resolvedData };
            }
            return c;
        }));
    };

    // Group Drag Logic
    const handleCardMove = (id, newX, newY) => {
        setCards(prevCards => {
            const sourceCard = prevCards.find(c => c.id === id);
            if (!sourceCard) return prevCards;

            const dx = newX - sourceCard.x;
            const dy = newY - sourceCard.y;
            if (dx === 0 && dy === 0) return prevCards;

            const isSelected = selectedIds.indexOf(id) !== -1;
            const moveIds = isSelected ? new Set(selectedIds) : getConnectedGraph(id);

            return prevCards.map(c => {
                if (moveIds.has(c.id)) {
                    return { ...c, x: c.x + dx, y: c.y + dy };
                }
                return c;
            });
        });
    };

    const handleCardMoveEnd = () => {
        // History automatically tracked by zundo
    };

    const handleBatchDelete = () => {
        setCards(prevCards => {
            const newCards = prevCards.filter(c => selectedIds.indexOf(c.id) === -1);
            setConnections(prevConns => {
                const newConnections = prevConns.filter(c =>
                    selectedIds.indexOf(c.from) === -1 && selectedIds.indexOf(c.to) === -1
                );
                // History automatically tracked
                return newConnections;
            });
            setSelectedIds([]);
            return newCards;
        });
    };

    const handleRegenerate = async () => {
        const targets = cards.filter(c => selectedIds.indexOf(c.id) !== -1);
        if (targets.length === 0) return;

        setCards(prev => prev.map(c => {
            if (selectedIds.indexOf(c.id) !== -1) {
                const newMsgs = [...c.data.messages];
                if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'assistant') {
                    newMsgs.pop();
                }
                newMsgs.push({ role: 'assistant', content: '' });
                return { ...c, data: { ...c.data, messages: newMsgs } };
            }
            return c;
        }));

        try {
            await Promise.all(targets.map(async (card) => {
                const currentMsgs = [...card.data.messages];
                if (currentMsgs.length > 0 && currentMsgs[currentMsgs.length - 1].role === 'assistant') {
                    currentMsgs.pop();
                }

                await streamChatCompletion(currentMsgs, (chunk) => updateCardContent(card.id, chunk));
            }));
        } catch (e) {
            console.error("Regeneration failed", e);
        } finally {
            targets.forEach(card => setCardGenerating(card.id, false));
        }
    };

    if (view === 'gallery') {
        return (
            <React.Fragment>
                <div className="bg-[#FBFBFC] dark:bg-slate-950 h-screen text-slate-900 dark:text-slate-200 p-8 font-lxgw relative overflow-y-auto overflow-x-hidden transition-colors duration-500 custom-scrollbar">
                    {/* Ambient Background - Softened for light mode */}
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/30 dark:bg-blue-600/20 blur-[120px] pointer-events-none"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-100/30 dark:bg-purple-600/20 blur-[120px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto relative z-10">
                        {/* Premium Glass Header */}
                        <div className="sticky top-0 z-50 flex justify-between items-center mb-16 py-6 border-b border-slate-200/50 dark:border-white/5 bg-[#FBFBFC]/70 dark:bg-slate-950/70 backdrop-blur-xl -mx-8 px-8">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-purple-400">Neural</span> Canvas
                            </h1>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleCreateBoard("New Board")}
                                    className="p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl border border-slate-200/60 dark:border-white/10 shadow-premium transition-all hover:scale-110"
                                    title="New Empty Board"
                                >
                                    <Plus size={20} />
                                </button>

                                {user ? (
                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl pl-2 pr-5 py-2 border border-slate-200/60 dark:border-white/10 shadow-premium">
                                        {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-xl shadow-sm" alt="User avatar" />}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user.displayName}</span>
                                            <button onClick={handleLogout} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-wider mt-1 text-left transition-colors">Sign Out</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleLogin}
                                        className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Sign In
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
                cards={cards}
                connections={connections}
                onUpdateCards={setCards}
                onCardMove={handleCardMove}
                onDragEnd={handleCardMoveEnd}
                onExpandCard={setExpandedCardId}
                onConnect={handleConnect}
                onDeleteCard={handleDeleteCard}
                isConnecting={isConnecting}
                connectionStartId={connectionStartId}
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

                                {/* Expand Topic Action (Conditional) */}
                                {selectedIds.length === 1 && cards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0 && (
                                    <button
                                        onClick={() => handleExpandTopics(selectedIds[0])}
                                        className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-full transition-all flex items-center gap-1 animate-pulse"
                                        title="Expand marked topics"
                                    >
                                        <Sparkles size={20} />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Topics</span>
                                    </button>
                                )}
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

                                <div className="w-px h-6 bg-white/10 mx-1" />

                                <button
                                    onClick={handleCreateCard}
                                    disabled={!promptInput.trim() && globalImages.length === 0}
                                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center transform hover:-translate-y-0.5"
                                >
                                    {generatingCardIds.size > 0 ? (
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

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

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
