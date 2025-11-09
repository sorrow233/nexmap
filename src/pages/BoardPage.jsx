import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, Sparkles, RefreshCw, Trash2, Undo2, Redo2 } from 'lucide-react';
import Canvas from '../components/Canvas';
import ChatBar from '../components/ChatBar';
import ErrorBoundary from '../components/ErrorBoundary';
import Loading from '../components/Loading';
import StatusBar from '../components/StatusBar';

const NotePage = lazy(() => import('./NotePage'));
const ChatModal = lazy(() => import('../components/ChatModal'));
const SettingsModal = lazy(() => import('../components/SettingsModal'));
import { useStore, useTemporalStore } from '../store/useStore';
import { useCardCreator } from '../hooks/useCardCreator';
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys';
import { saveBoard, saveBoardToCloud, saveViewportState } from '../services/storage';
import { debugLog } from '../utils/debugLogger';
import favoritesService from '../services/favoritesService';
import QuickPromptModal from '../components/QuickPromptModal';
import { useToast } from '../components/Toast';
import { useThumbnailCapture } from '../hooks/useThumbnailCapture';

export default function BoardPage({ user, boardsList, onUpdateBoardTitle, onBack }) {
    const { id: currentBoardId, noteId } = useParams();
    const navigate = useNavigate();
    const cards = useStore(state => state.cards);
    const connections = useStore(state => state.connections);
    const groups = useStore(state => state.groups);
    const selectedIds = useStore(state => state.selectedIds);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const expandedCardId = useStore(state => state.expandedCardId);
    const offset = useStore(state => state.offset);
    const scale = useStore(state => state.scale);
    const isBoardLoading = useStore(state => state.isBoardLoading);
    const favoritesLastUpdate = useStore(state => state.favoritesLastUpdate);

    const setExpandedCardId = useStore(state => state.setExpandedCardId);
    const updateCardFull = useStore(state => state.updateCardFull);
    const handleRegenerate = useStore(state => state.handleRegenerate);
    const handleBatchDelete = useStore(state => state.handleBatchDelete);
    const handleChatGenerate = useStore(state => state.handleChatGenerate);
    const updateCardContent = useStore(state => state.updateCardContent);
    const toggleFavorite = useStore(state => state.toggleFavorite);
    const createGroup = useStore(state => state.createGroup);
    const getConnectedCards = useStore(state => state.getConnectedCards);
    const setSelectedIds = useStore(state => state.setSelectedIds);
    const arrangeSelectionGrid = useStore(state => state.arrangeSelectionGrid);
    const setLastSavedAt = useStore(state => state.setLastSavedAt);

    const undo = useTemporalStore((state) => state.undo);
    const redo = useTemporalStore((state) => state.redo);
    const pastStates = useTemporalStore((state) => state.pastStates);
    const futureStates = useTemporalStore((state) => state.futureStates);

    const {
        handleCreateCard,
        handleCreateNote,
        handleExpandTopics,
        handleBatchChat,
        handleSprout
    } = useCardCreator();

    const toast = useToast();

    // Get current board info for thumbnail capture
    const currentBoard = boardsList.find(b => b.id === currentBoardId);
    const hasBackgroundImage = !!currentBoard?.backgroundImage;

    // Thumbnail auto-capture hook - captures card-dense area during usage
    const { canvasContainerRef } = useThumbnailCapture(cards, connections, currentBoardId, hasBackgroundImage);

    const [cloudSyncStatus, setCloudSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
    const [globalImages, setGlobalImages] = useState([]);
    const [clipboard, setClipboard] = useState(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleJustSaved, setTitleJustSaved] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Initial setup for document title
    useEffect(() => {
        if (currentBoardId) {
            const board = boardsList.find(b => b.id === currentBoardId);
            document.title = board ? `${board.name} | NexMap` : 'NexMap';
        }
        return () => { document.title = 'NexMap'; };
    }, [currentBoardId, boardsList]);

    // Autosave Logic
    const lastSavedState = useRef('');
    useEffect(() => {
        if (isBoardLoading) return; // SKIP SAVE IF LOADING
        if (currentBoardId && cards.length > 0) {
            // Use a normalized state for comparison to avoid loops caused by field order or undefined
            const currentStateObj = {
                cards: cards.map(c => ({ ...c, data: { ...c.data } })),
                connections: connections || [],
                groups: groups || []
            };
            const currentState = JSON.stringify(currentStateObj);

            if (currentState === lastSavedState.current) return;

            const saveTimeout = setTimeout(() => {
                try {
                    const now = Date.now();
                    saveBoard(currentBoardId, { cards, connections, groups });
                    if (setLastSavedAt && typeof setLastSavedAt === 'function') {
                        setLastSavedAt(now);
                    }
                    lastSavedState.current = currentState;
                    debugLog.storage(`Local autosave complete for board: ${currentBoardId}`, { timestamp: now });
                } catch (e) {
                    console.error("[BoardPage] Autosave failed", e);
                    toast.error('保存失败，请检查存储空间');
                }
            }, 1000); // Slightly longer delay for local debounce

            let cloudTimeout;
            if (user) {
                cloudTimeout = setTimeout(async () => {
                    setCloudSyncStatus('syncing');
                    try {
                        await saveBoardToCloud(user.uid, currentBoardId, { cards, connections, groups });
                        setCloudSyncStatus('synced');
                        debugLog.sync(`Cloud autosave complete for board: ${currentBoardId}`);
                    } catch (e) {
                        setCloudSyncStatus('error');
                        console.error('[BoardPage] Cloud sync failed:', e);
                        toast.error('云同步失败');
                    }
                }, 3000); // Longer delay for cloud to avoid hammering
            }

            return () => {
                clearTimeout(saveTimeout);
                if (cloudTimeout) clearTimeout(cloudTimeout);
            };
        }
    }, [cards, connections, groups, currentBoardId, user, isBoardLoading]);

    // Persist canvas state per board
    useEffect(() => {
        if (currentBoardId && !isBoardLoading) {
            saveViewportState(currentBoardId, { offset, scale });
        }
    }, [offset, scale, currentBoardId, isBoardLoading]);


    // Hotkeys
    useGlobalHotkeys(clipboard, setClipboard);

    // Handlers
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

    const saveTitleWithFeedback = (value) => {
        if (!value || !value.trim()) return;
        onUpdateBoardTitle(value);
        setTitleJustSaved(true);
        setTimeout(() => setTitleJustSaved(false), 1000);
    };

    // Note: Global paste for images is handled in App.jsx (window listener), 
    // but maybe we should move it here? 
    // The original code had it in AppContent. 
    // If we want it only on the board, we can put it here.
    // Let's implement it here for better modularity.
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData.items;
            for (const item of items) {
                if (item.type.indexOf("image") !== -1) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => setGlobalImages(prev => [...prev, {
                        file, previewUrl: URL.createObjectURL(file), base64: event.target.result.split(',')[1], mimeType: file.type
                    }]);
                    reader.readAsDataURL(file);
                    e.preventDefault(); // Prevent default paste if it's an image
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);


    // Double-click Quick Prompt Logic
    const [quickPrompt, setQuickPrompt] = useState({ isOpen: false, x: 0, y: 0, canvasX: 0, canvasY: 0 });

    const handleCanvasDoubleClick = (e) => {
        setQuickPrompt({
            isOpen: true,
            x: e.screenX,
            y: e.screenY,
            canvasX: e.canvasX,
            canvasY: e.canvasY
        });
    };

    const handleQuickPromptSubmit = (text) => {
        if (!quickPrompt.isOpen) return;
        handleCreateCard(text, [], { x: quickPrompt.canvasX, y: quickPrompt.canvasY });
    };

    const handleFullScreen = (cardId) => {
        navigate(`/board/${currentBoardId}/note/${cardId}`);
    };

    // Wrapper to bridge ChatModal's signature with handleChatGenerate
    const handleChatModalGenerate = async (cardId, text, images = []) => {

        // FIX: Gets fresh state to avoid stale closures in message queue
        const freshCards = useStore.getState().cards;
        const card = freshCards.find(c => c.id === cardId);

        if (!card) {
            return;
        }

        // Construct the new user message
        let userContent;
        if (images.length > 0) {
            const imageParts = images.map(img => ({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: img.mimeType,
                    data: img.base64
                }
            }));
            userContent = [
                { type: 'text', text },
                ...imageParts
            ];
        } else {
            userContent = text;
        }

        const userMsg = { role: 'user', content: userContent };
        // FIX: Generate unique ID for assistant message to handle concurrency
        const assistantMsgId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const assistantMsg = { role: 'assistant', content: '', id: assistantMsgId };

        // Optimistically update the card's messages
        updateCardFull(cardId, (currentData) => ({
            ...currentData,
            messages: [...(currentData.messages || []), userMsg, assistantMsg]
        }));

        // Prepare the history for AI (exclude the empty assistant message we just added)
        const history = [...(card.data.messages || []), userMsg];

        // Call handleChatGenerate with the proper signature
        try {
            await handleChatGenerate(cardId, history, (chunk) => {
                // FIX: Update specific message by ID
                updateCardContent(cardId, chunk, assistantMsgId);
            });
        } catch (error) {
            console.error('[DEBUG handleChatModalGenerate] Generation failed with error:', error);
            updateCardContent(cardId, `\n\n[System Error: ${error.message || 'Unknown error in UI layer'}]`, assistantMsgId);
        }
    };

    const handleSelectConnected = (startId) => {
        const connectedIds = getConnectedCards(startId);
        // Include the start card itself if not already included (graphUtils usually returns visited set including start)
        // Ensure unique
        const uniqueIds = Array.from(new Set([...connectedIds, startId]));
        setSelectedIds(uniqueIds);
    };

    return (
        <React.Fragment>
            <ErrorBoundary level="canvas">
                <div ref={canvasContainerRef} className="absolute inset-0">
                    <Canvas
                        onCreateNote={handleCreateNote}
                        onCanvasDoubleClick={handleCanvasDoubleClick}
                        onCardFullScreen={handleFullScreen}
                    />
                </div>
            </ErrorBoundary>

            {noteId && (
                <div className="fixed inset-0 z-[200]">
                    <Suspense fallback={<Loading message="Loading note..." />}>
                        <NotePage onBack={() => navigate(`/board/${currentBoardId}`)} />
                    </Suspense>
                </div>
            )}

            {/* Quick Prompt Modal */}
            <QuickPromptModal
                isOpen={quickPrompt.isOpen}
                onClose={() => setQuickPrompt(prev => ({ ...prev, isOpen: false }))}
                onSubmit={handleQuickPromptSubmit}
                initialPosition={{ x: quickPrompt.x, y: quickPrompt.y }}
            />

            {/* Top Bar */}
            <div className="fixed top-3 md:top-6 left-3 md:left-6 z-50 animate-slide-down">
                <div className="flex items-center gap-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 p-1 md:p-1.5 rounded-xl md:rounded-2xl shadow-xl">
                    <button onClick={onBack} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">
                        <LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" />
                        <span className="hidden sm:inline text-sm">Gallery</span>
                    </button>
                    <div className="h-5 md:h-6 w-[1px] bg-slate-200 mx-1 md:mx-2" />
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => undo()}
                            disabled={pastStates.length === 0}
                            className={`p-2 rounded-xl transition-all ${pastStates.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 size={18} />
                        </button>
                        <button
                            onClick={() => redo()}
                            disabled={futureStates.length === 0}
                            className={`p-2 rounded-xl transition-all ${futureStates.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo2 size={18} />
                        </button>
                    </div>
                    <div className="hidden sm:block h-5 md:h-6 w-[1px] bg-slate-200 mx-1 md:mx-2" />
                    <div className="hidden sm:block relative flex items-center group">
                        <input
                            type="text"
                            key={currentBoardId}
                            defaultValue={boardsList.find(b => b.id === currentBoardId)?.name || 'Untitled Board'}
                            onFocus={() => setIsEditingTitle(true)}
                            onBlur={(e) => {
                                setIsEditingTitle(false);
                                saveTitleWithFeedback(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.target.blur(); // This will trigger onBlur which handles save
                                }
                            }}
                            className={`
                                bg-transparent border-none outline-none font-bold text-sm px-2 py-1.5 rounded-lg
                                transition-all duration-200
                                ${isEditingTitle ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                                ${titleJustSaved ? 'ring-2 ring-green-400' : ''}
                            `}
                            style={{ minWidth: '120px' }}
                        />
                        {!isEditingTitle && (
                            <svg
                                className="absolute right-1 w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>

            <ChatBar
                cards={cards}
                selectedIds={selectedIds}
                generatingCardIds={generatingCardIds}
                onSubmit={handleCreateCard}
                onBatchChat={handleBatchChat}
                onCreateNote={handleCreateNote}
                onImageUpload={handleGlobalImageUpload}
                globalImages={globalImages}
                onRemoveImage={removeGlobalImage}
                onClearImages={() => setGlobalImages([])}
                onGroup={(ids) => createGroup(ids)}
                onSelectConnected={handleSelectConnected}
                onLayoutGrid={arrangeSelectionGrid} // Wire up the action
            />

            {selectedIds.length > 0 && (
                <div className="fixed top-3 md:top-6 inset-x-0 mx-auto w-fit glass-panel px-3 md:px-6 py-2 md:py-3 rounded-full flex items-center gap-2 md:gap-4 z-50 animate-slide-up shadow-2xl">
                    <span className="text-xs md:text-sm font-semibold text-slate-300">{selectedIds.length} <span className="hidden sm:inline">items</span></span>
                    {selectedIds.length === 1 && cards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0 && (
                        <>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <button onClick={() => handleExpandTopics(selectedIds[0])} className="flex items-center gap-2 text-purple-600 px-3 py-1.5 rounded-lg transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20 active:scale-95"><Sparkles size={16} /><span className="text-sm font-medium">Expand</span></button>
                        </>
                    )}
                    <div className="h-3 md:h-4 w-px bg-slate-300"></div>
                    <button onClick={handleRegenerate} className="flex items-center gap-1 md:gap-2 text-blue-600 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95">
                        <RefreshCw size={14} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline text-sm font-medium">Retry</span>
                    </button>
                    <div className="h-3 md:h-4 w-px bg-slate-300"></div>
                    <button onClick={handleBatchDelete} className="flex items-center gap-1 md:gap-2 text-red-500 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95">
                        <Trash2 size={14} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline text-sm font-medium">Delete</span>
                    </button>
                </div>
            )}

            {expandedCardId && (
                <Suspense fallback={null}>
                    <ChatModal
                        card={cards.find(c => c.id === expandedCardId)}
                        isOpen={!!expandedCardId}
                        onClose={() => setExpandedCardId(null)}
                        onUpdate={updateCardFull}
                        onGenerateResponse={handleChatModalGenerate}
                        isGenerating={generatingCardIds.has(expandedCardId)}
                        onCreateNote={handleCreateNote}
                        onSprout={handleSprout}
                        onToggleFavorite={toggleFavorite}
                    />
                </Suspense>
            )}

            {/* Status Bar */}
            <StatusBar
                boardName={boardsList.find(b => b.id === currentBoardId)?.name}
                syncStatus={cloudSyncStatus}
                onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Settings Modal */}
            <Suspense fallback={null}>
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    user={user}
                />
            </Suspense>
        </React.Fragment>
    );
}
