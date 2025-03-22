import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutGrid, Sparkles, RefreshCw, Trash2, Undo2, Redo2 } from 'lucide-react';
import Canvas from '../components/Canvas';
import ChatBar from '../components/ChatBar';
import ChatModal from '../components/ChatModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { useStore, useTemporalStore } from '../store/useStore';
import { useCardCreator } from '../hooks/useCardCreator';
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys';
import { saveBoard, saveBoardToCloud } from '../services/storage';

export default function BoardPage({ user, boardsList, onUpdateBoardTitle, onBack }) {
    const { id: currentBoardId } = useParams();
    const { undo, redo, pastStates, futureStates } = useTemporalStore((state) => state);
    const {
        cards,
        connections,
        selectedIds,
        generatingCardIds,
        expandedCardId,
        setExpandedCardId,
        updateCardFull,
        handleRegenerate,
        handleBatchDelete,
        handleChatGenerate,
        offset,
        scale
    } = useStore();

    const {
        handleCreateCard,
        handleCreateNote,
        handleExpandTopics,
        handleSprout
    } = useCardCreator();

    const [globalImages, setGlobalImages] = useState([]);
    const [clipboard, setClipboard] = useState(null);

    // Initial setup for document title
    useEffect(() => {
        if (currentBoardId) {
            const board = boardsList.find(b => b.id === currentBoardId);
            document.title = board ? `${board.name} | Neural Canvas` : 'Neural Canvas';
        }
        return () => { document.title = 'Neural Canvas'; };
    }, [currentBoardId, boardsList]);

    // Autosave Logic
    const lastSavedState = useRef('');
    useEffect(() => {
        if (currentBoardId && cards.length > 0) {
            const currentState = JSON.stringify({ cards, connections });
            if (currentState === lastSavedState.current) return;

            const saveTimeout = setTimeout(() => {
                saveBoard(currentBoardId, { cards, connections });
                lastSavedState.current = currentState;
            }, 500);

            let cloudTimeout;
            if (user) {
                cloudTimeout = setTimeout(() => {
                    saveBoardToCloud(user.uid, currentBoardId, { cards, connections });
                }, 2000);
            }

            return () => {
                clearTimeout(saveTimeout);
                if (cloudTimeout) clearTimeout(cloudTimeout);
            };
        }
    }, [cards, connections, currentBoardId, user]);

    // Persist canvas state
    useEffect(() => {
        localStorage.setItem('canvas_offset', JSON.stringify(offset));
        localStorage.setItem('canvas_scale', scale.toString());
    }, [offset, scale]);


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


    return (
        <React.Fragment>
            <ErrorBoundary level="canvas">
                <Canvas onCreateNote={handleCreateNote} />
            </ErrorBoundary>

            {/* Top Bar */}
            <div className="fixed top-6 left-6 z-50 animate-slide-down">
                <div className="flex items-center gap-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 p-1.5 rounded-2xl shadow-xl">
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all"><LayoutGrid size={18} /><span>Gallery</span></button>
                    <div className="h-6 w-[1px] bg-slate-200 mx-2" />
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
                    <div className="h-6 w-[1px] bg-slate-200 mx-2" />
                    <input
                        type="text"
                        key={currentBoardId}
                        defaultValue={boardsList.find(b => b.id === currentBoardId)?.name || 'Untitled Board'}
                        onBlur={(e) => onUpdateBoardTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (onUpdateBoardTitle(e.target.value), e.target.blur())}
                        className="bg-transparent border-none outline-none font-bold text-sm px-2 py-0.5 rounded"
                    />
                </div>
            </div>

            <ChatBar
                cards={cards}
                selectedIds={selectedIds}
                generatingCardIds={generatingCardIds}
                onSubmit={handleCreateCard}
                onCreateNote={handleCreateNote}
                onImageUpload={handleGlobalImageUpload}
                globalImages={globalImages}
                onRemoveImage={removeGlobalImage}
            />

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

            {expandedCardId && (
                <ChatModal
                    card={cards.find(c => c.id === expandedCardId)}
                    isOpen={!!expandedCardId}
                    onClose={() => setExpandedCardId(null)}
                    onUpdate={updateCardFull}
                    onGenerateResponse={handleChatGenerate}
                    isGenerating={generatingCardIds.has(expandedCardId)}
                    onCreateNote={handleCreateNote}
                    onSprout={handleSprout}
                />
            )}
        </React.Fragment>
    );
}
