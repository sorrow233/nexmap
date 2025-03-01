import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate, useParams, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore, undo, redo } from './store/useStore';
import { Settings, Sparkles, Loader2, Trash2, RefreshCw, LayoutGrid, ArrowLeft, ChevronDown, CheckCircle2, AlertCircle, Play, Image as ImageIcon, X, StickyNote, Plus } from 'lucide-react';
import Canvas from './components/Canvas';
import ChatModal from './components/ChatModal';
import BoardGallery from './components/BoardGallery';
import SettingsModal from './components/SettingsModal';
import ChatBar from './components/ChatBar';
import { auth, googleProvider } from './services/firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { saveBoard, loadBoard, loadBoardsMetadata, deleteBoard, createBoard, setCurrentBoardId as storageSetCurrentBoardId, getCurrentBoardId, listenForBoardUpdates, saveBoardToCloud, deleteBoardFromCloud, saveUserSettings, loadUserSettings } from './services/storage';
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
    const navigate = useNavigate();
    const location = useLocation();

    const { id: boardIdFromParams } = useParams();
    const currentBoardId = boardIdFromParams || null;
    const view = currentBoardId ? 'canvas' : 'gallery';

    const [boardsList, setBoardsList] = useState([]);
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

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (unsubDb) { unsubDb(); unsubDb = null; }

            if (u) {
                unsubDb = listenForBoardUpdates(u.uid, (cloudBoards, updatedIds) => {
                    setBoardsList(cloudBoards);
                    const currentActiveId = localStorage.getItem('mixboard_current_board_id');
                    if (updatedIds && currentActiveId && updatedIds.indexOf(currentActiveId) !== -1) {
                        loadBoard(currentActiveId).then(data => {
                            if (data && data.cards) setCards(data.cards);
                        });
                    }
                });

                loadUserSettings(u.uid).then(settings => {
                    if (settings) {
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

        return () => { unsubscribe(); if (unsubDb) unsubDb(); };
    }, []);

    const handleLogin = async () => {
        try { await signInWithPopup(auth, googleProvider); }
        catch (e) { alert("Login failed: " + e.message); }
    };

    const handleLogout = async () => {
        try { await signOut(auth); }
        catch (e) { console.error(e); }
    };

    const {
        cards, setCards,
        connections, setConnections,
        selectedIds, setSelectedIds,
        offset, setOffset,
        scale, setScale,
        isSettingsOpen, setIsSettingsOpen,
        generatingCardIds, setGeneratingCardIds,
        expandedCardId, setExpandedCardId,
        isConnecting, setIsConnecting,
        connectionStartId, setConnectionStartId,
        createAICard, updateCardContent, setCardGenerating,
        handleCardMove, handleCardMoveEnd,
        handleConnect, handleBatchDelete, handleRegenerate, handleChatGenerate,
        updateCard, updateCardFull, deleteCard, addCard,
        undo, redo
    } = useStore();

    // Persist canvas state
    useEffect(() => {
        localStorage.setItem('canvas_offset', JSON.stringify(offset));
        localStorage.setItem('canvas_scale', scale.toString());
    }, [offset, scale]);

    const [globalImages, setGlobalImages] = useState([]);
    const [clipboard, setClipboard] = useState(null);

    const handleCopy = async () => {
        if (selectedIds.length === 0) return;
        const selectedCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);
        setClipboard(selectedCards);
        try {
            const textContent = selectedCards.map(c => {
                const lastMsg = c.data.messages[c.data.messages.length - 1];
                return lastMsg ? lastMsg.content : '';
            }).join('\n\n---\n\n');
            if (textContent) await navigator.clipboard.writeText(textContent);
        } catch (e) { console.error(e); }
    };

    const handlePaste = () => {
        if (!clipboard || clipboard.length === 0) return;
        const newCards = clipboard.map((card, index) => {
            const newId = (Date.now() + Math.random()).toString();
            return {
                ...card, id: newId,
                x: (window.innerWidth / 2 - offset.x) / scale + (index * 20),
                y: (window.innerHeight / 2 - offset.y) / scale + (index * 20),
                data: { ...card.data }
            };
        });
        setCards([...cards, ...newCards]);
        setSelectedIds(newCards.map(c => c.id));
    };

    const handleCreateOnboardingBoard = async () => {
        const newBoard = await createBoard(ONBOARDING_DATA.name);
        await saveBoard(newBoard.id, { cards: ONBOARDING_DATA.cards, connections: ONBOARDING_DATA.connections });
        setBoardsList([newBoard]);
        handleSelectBoard(newBoard.id);
    };

    useEffect(() => {
        const init = async () => {
            const list = loadBoardsMetadata();
            setBoardsList(list);
            if (location.pathname === '/' && list.length === 0) {
                await handleCreateOnboardingBoard();
            }
            setIsInitialized(true);
        };
        init();
    }, []);

    useEffect(() => {
        if (currentBoardId) handleLoadBoard(currentBoardId);
    }, [currentBoardId]);

    // Delete / Backspace -> Delete selected
    useHotkeys('delete, backspace', () => {
        if (selectedIds.length > 0) handleBatchDelete();
    }, [selectedIds]);

    // R -> Regenerate selected
    useHotkeys('r', () => {
        if (selectedIds.length > 0) handleRegenerate();
    }, [selectedIds]);

    // L -> Link (Connect)
    useHotkeys('l', () => {
        if (selectedIds.length > 1) {
            const newConns = [...connections];
            let added = false;
            for (let i = 0; i < selectedIds.length - 1; i++) {
                const from = selectedIds[i];
                const to = selectedIds[i + 1];
                if (!newConns.some(c => (c.from === from && c.to === to) || (c.from === to && c.to === from))) {
                    newConns.push({ from, to });
                    added = true;
                }
            }
            if (added) setConnections(newConns);
        } else if (selectedIds.length === 1) {
            handleConnect(selectedIds[0]);
        }
    }, [selectedIds, connections]);

    // C -> Disconnect
    useHotkeys('c', (e) => {
        // Handled below if mod is pressed
        if (e.metaKey || e.ctrlKey) return;
        if (selectedIds.length > 1) {
            setConnections(connections.filter(c =>
                !(selectedIds.indexOf(c.from) !== -1 && selectedIds.indexOf(c.to) !== -1)
            ));
        } else if (selectedIds.length === 1) {
            setConnections(connections.filter(c => c.from !== selectedIds[0] && c.to !== selectedIds[0]));
        }
    }, [selectedIds, connections]);

    // Undo / Redo
    useHotkeys('mod+z', (e) => {
        e.preventDefault();
        undo();
    }, []);

    useHotkeys('mod+shift+z', (e) => {
        e.preventDefault();
        redo();
    }, []);

    // Copy / Paste
    useHotkeys('mod+c', (e) => {
        if (window.getSelection()?.toString()) return;
        e.preventDefault();
        handleCopy();
    }, [clipboard, selectedIds, cards]);

    useHotkeys('mod+v', (e) => {
        e.preventDefault();
        handlePaste();
    }, [clipboard]);

    useEffect(() => {
        if (view === 'canvas' && currentBoardId) {
            const board = boardsList.find(b => b.id === currentBoardId);
            document.title = board ? `${board.name} | Neural Canvas` : 'Neural Canvas';
        } else {
            document.title = 'Neural Canvas';
        }
    }, [view, currentBoardId, boardsList]);

    useEffect(() => {
        if (view === 'canvas' && currentBoardId && cards.length > 0) {
            saveBoard(currentBoardId, { cards, connections });
            if (user) {
                const timeoutId = setTimeout(() => {
                    saveBoardToCloud(user.uid, currentBoardId, { cards, connections });
                }, 1000);
                return () => clearTimeout(timeoutId);
            }
            setBoardsList(prev => prev.map(b =>
                b.id === currentBoardId ? { ...b, updatedAt: Date.now(), cardCount: cards.length } : b
            ));
        }
    }, [cards, connections, currentBoardId, view, user]);

    const handleCreateBoard = async (customName = null, initialPrompt = null, initialImages = []) => {
        let name = customName || prompt('Name your board:', `Board ${boardsList.length + 1}`);
        if (!name) return;

        const newBoard = await createBoard(name);
        setBoardsList(prev => [newBoard, ...prev]);
        if (user) saveBoardToCloud(user.uid, newBoard.id, { cards: [], connections: [] });
        await handleSelectBoard(newBoard.id);

        if (initialPrompt || initialImages.length > 0) {
            setTimeout(() => createCardWithText(initialPrompt, newBoard.id, initialImages), 100);
        }
    };

    const createCardWithText = async (text, boardId, images = []) => {
        if (!text.trim() && images.length === 0) return;
        const activeConfig = getActiveConfig();
        try {
            const newId = await createAICard({
                text,
                x: Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 160),
                y: Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 100),
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
        } catch (e) { console.error(e); } finally { setCardGenerating(null, false); }
    };

    const handleSelectBoard = (id) => navigate(`/board/${id}`);
    const handleLoadBoard = async (id) => {
        const data = await loadBoard(id);
        setCards(data.cards || []);
        setConnections(data.connections || []);
        storageSetCurrentBoardId(id);
    };

    const handleDeleteBoard = async (id) => {
        if (!confirm('Are you sure?')) return;
        await deleteBoard(id);
        if (user) deleteBoardFromCloud(user.uid, id);
        setBoardsList(prev => prev.filter(b => b.id !== id));
    };

    const handleBackToGallery = async () => {
        if (currentBoardId) await saveBoard(currentBoardId, { cards, connections });
        navigate('/gallery');
        setCards([]);
        setConnections([]);
    };

    const handleGlobalImageUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => setGlobalImages(prev => [...prev, {
                file, previewUrl: URL.createObjectURL(file), base64: e.target.result.split(',')[1], mimeType: file.type
            }]);
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const removeGlobalImage = (index) => {
        setGlobalImages(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[index].previewUrl);
            next.splice(index, 1);
            return next;
        });
    };

    const handleGlobalPaste = (e) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => setGlobalImages(prev => [...prev, {
                    file, previewUrl: URL.createObjectURL(file), base64: event.target.result.split(',')[1], mimeType: file.type
                }]);
                reader.readAsDataURL(file);
                e.preventDefault();
            }
        }
    };

    const handleCreateCard = async (text, images = []) => {
        if (!text.trim() && images.length === 0) return;
        const activeConfig = getActiveConfig();

        if (text.startsWith('/draw ') || text.startsWith('/image ')) {
            const promptText = text.replace(/^\/(draw|image)\s+/, '');
            const newId = Date.now().toString();
            setCards(prev => [...prev, {
                id: newId, type: 'image_gen',
                x: (window.innerWidth / 2 - offset.x) / scale - 160 + (Math.random() * 40 - 20),
                y: (window.innerHeight / 2 - offset.y) / scale - 100 + (Math.random() * 40 - 20),
                data: { prompt: promptText, loading: true, title: `Generating: ${promptText.substring(0, 20)}...` }
            }]);
            try {
                const imageUrl = await imageGeneration(promptText);
                setCards(prev => prev.map(c => c.id === newId ? { ...c, data: { ...c.data, imageUrl, loading: false, title: promptText.substring(0, 30) } } : c));
            } catch (e) {
                console.error(e);
                setCards(prev => prev.map(c => c.id === newId ? { ...c, data: { ...c.data, error: e.message, loading: false, title: 'Failed' } } : c));
            }
            return;
        }

        const initialX = (window.innerWidth / 2 - offset.x) / scale - 160 + (Math.random() * 40 - 20);
        const initialY = (window.innerHeight / 2 - offset.y) / scale - 100 + (Math.random() * 40 - 20);

        let contextPrefix = "";
        const contextCards = cards.filter(c => selectedIds.indexOf(c.id) !== -1);
        if (contextCards.length > 0) {
            contextPrefix = `[System: Context]\n\n${contextCards.map(c => `Card [${c.id}]: ${c.data.title}`).join('\n')}\n\n---\n\n`;
        }

        const targetImages = [...images];
        setGlobalImages([]);
        const newId = Date.now().toString();

        try {
            await createAICard({
                id: newId, text, x: Math.max(0, initialX), y: Math.max(0, initialY),
                images: targetImages, contextPrefix,
                autoConnections: selectedIds.map(sid => ({ from: sid, to: newId })),
                model: activeConfig.model, providerId: activeConfig.id
            });
            await streamChatCompletion([{ role: 'user', content: contextPrefix + text }], (chunk) => updateCardContent(newId, chunk), activeConfig.model, { providerId: activeConfig.id });
        } catch (e) { console.error(e); } finally { setCardGenerating(newId, false); }
    };

    const handleCreateNote = (text = '') => {
        addCard({
            id: Date.now().toString(), type: 'sticky',
            x: Math.max(0, (window.innerWidth / 2 - offset.x) / scale - 80),
            y: Math.max(0, (window.innerHeight / 2 - offset.y) / scale - 80),
            data: { content: text || '', color: 'yellow' }
        });
    };

    const handleUpdateBoardTitle = async (newTitle) => {
        if (!currentBoardId || !newTitle.trim()) return;
        setBoardsList(prev => prev.map(b => b.id === currentBoardId ? { ...b, name: newTitle } : b));
        if (user) saveBoardToCloud(user.uid, currentBoardId, { name: newTitle }, true);
    };

    const handleExpandTopics = async (sourceId) => {
        const source = cards.find(c => c.id === sourceId);
        if (!source || !source.data.marks) return;
        const activeConfig = getActiveConfig();
        for (const mark of source.data.marks) {
            try {
                const newId = await createAICard({
                    text: mark, x: source.x + 350, y: source.y,
                    autoConnections: [{ from: sourceId, to: Date.now().toString() }],
                    model: activeConfig.model, providerId: activeConfig.id
                });
                await streamChatCompletion([{ role: 'user', content: mark }], (chunk) => updateCardContent(newId, chunk), activeConfig.model, { providerId: activeConfig.id });
            } catch (e) { console.error(e); }
        }
    };

    return (
        <React.Fragment>
            <Routes>
                <Route path="/gallery" element={
                    <div className="bg-[#FBFBFC] dark:bg-slate-950 h-screen text-slate-900 dark:text-slate-200 p-8 font-lxgw relative overflow-y-auto">
                        <div className="max-w-7xl mx-auto relative z-10">
                            <div className="sticky top-0 z-50 flex justify-between items-center mb-16 py-6 bg-[#FBFBFC]/70 dark:bg-slate-950/70 backdrop-blur-xl">
                                <h1 className="text-3xl font-black tracking-tight"><span className="text-blue-600">Neural</span> Canvas</h1>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => handleCreateBoard("New Board")} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-premium hover:scale-110 transition-all"><Plus size={20} /></button>
                                    {user ? (
                                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl pl-2 pr-5 py-2 border border-slate-200 shadow-premium">
                                            {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-xl shadow-sm" />}
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold leading-none">{user.displayName}</span>
                                                <button onClick={handleLogout} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase mt-1 text-left">Sign Out</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={handleLogin} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-all">Sign In</button>
                                    )}
                                </div>
                            </div>
                            <BoardGallery boards={boardsList} onCreateBoard={handleCreateBoard} onSelectBoard={handleSelectBoard} onDeleteBoard={handleDeleteBoard} />
                        </div>
                        <div className="fixed bottom-10 right-10">
                            <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-white shadow-2xl rounded-2xl text-slate-400 hover:text-blue-600 hover:scale-110 transition-all border border-slate-100"><Settings size={24} /></button>
                        </div>
                    </div>
                } />
                <Route path="/board/:id" element={
                    <React.Fragment>
                        <Canvas />
                        <div className="fixed top-6 left-6 z-50 animate-slide-down">
                            <div className="flex items-center gap-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 p-1.5 rounded-2xl shadow-xl">
                                <button onClick={handleBackToGallery} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all"><LayoutGrid size={18} /><span>Gallery</span></button>
                                <div className="h-6 w-[1px] bg-slate-200 mx-2" />
                                <input type="text" key={currentBoardId} defaultValue={boardsList.find(b => b.id === currentBoardId)?.name || 'Untitled Board'} onBlur={(e) => handleUpdateBoardTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (handleUpdateBoardTitle(e.target.value), e.target.blur())} className="bg-transparent border-none outline-none font-bold text-sm px-2 py-0.5 rounded" />
                            </div>
                        </div>
                        <ChatBar onSubmit={handleCreateCard} onCreateNote={handleCreateNote} onImageUpload={handleGlobalImageUpload} globalImages={globalImages} onRemoveImage={removeGlobalImage} />
                        {selectedIds.length > 0 && (
                            <div className="fixed top-6 inset-x-0 mx-auto w-fit glass-panel px-6 py-3 rounded-full flex items-center gap-4 z-50 animate-slide-up shadow-2xl">
                                <span className="text-sm font-semibold text-slate-300">{selectedIds.length} items</span>
                                {selectedIds.length === 1 && cards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0 && (
                                    <>
                                        <div className="h-4 w-px bg-slate-300"></div>
                                        <button onClick={() => handleExpandTopics(selectedIds[0])} className="flex items-center gap-2 text-purple-600 px-3 py-1.5 rounded-lg transition-colors"><Sparkles size={16} /><span className="text-sm font-medium">Expand</span></button>
                                    </>
                                )}
                                <div className="h-4 w-px bg-slate-300"></div>
                                <button onClick={handleRegenerate} className="flex items-center gap-2 text-blue-600 px-3 py-1.5 rounded-lg transition-colors"><RefreshCw size={16} /><span className="text-sm font-medium">Retry</span></button>
                                <div className="h-4 w-px bg-slate-300"></div>
                                <button onClick={handleBatchDelete} className="flex items-center gap-2 text-red-500 px-3 py-1.5 rounded-lg transition-colors"><Trash2 size={16} /><span className="text-sm font-medium">Delete</span></button>
                            </div>
                        )}
                    </React.Fragment>
                } />
                <Route path="*" element={<Navigate to="/gallery" replace />} />
            </Routes>
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} />
            {expandedCardId && (
                <ChatModal card={cards.find(c => c.id === expandedCardId)} isOpen={!!expandedCardId} onClose={() => setExpandedCardId(null)} onUpdate={updateCardFull} onGenerateResponse={handleChatGenerate} isGenerating={generatingCardIds.has(expandedCardId)} onCreateNote={handleCreateNote} />
            )}
        </React.Fragment>
    );
}

if (typeof window !== 'undefined') window.App = App;
