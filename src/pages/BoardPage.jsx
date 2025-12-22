import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Star, RefreshCw, Trash2, Sprout, BoxSelect } from 'lucide-react';
import Canvas from '../components/Canvas';
import ChatBar from '../components/ChatBar';
import ErrorBoundary from '../components/ErrorBoundary';
import Loading from '../components/Loading';
import StatusBar from '../components/StatusBar';
import BoardTopBar from '../components/board/BoardTopBar';
import Sidebar from '../components/board/Sidebar';
import QuickPromptModal from '../components/QuickPromptModal';
import useBoardBackground from '../hooks/useBoardBackground';
import { useStore } from '../store/useStore';

const NotePage = lazy(() => import('./NotePage'));
const ChatModal = lazy(() => import('../components/ChatModal'));
const SettingsModal = lazy(() => import('../components/SettingsModal'));

import { useBoardLogic } from '../hooks/useBoardLogic';

export default function BoardPage({ user, boardsList, onUpdateBoardTitle, onUpdateBoardMetadata, onBack }) {

    // Extracted Logic
    const {
        // Data
        cards,
        generatingCardIds,
        selectedIds,
        expandedCardId,
        currentBoard,
        cloudSyncStatus,
        globalImages,
        isSettingsOpen,
        quickPrompt,
        boardPrompts,
        tempInstructions,
        t,
        noteId,
        currentBoardId,

        // Refs
        canvasContainerRef,

        // Actions
        setIsSettingsOpen,
        setGlobalImages,
        setQuickPrompt,
        setExpandedCardId,
        setTempInstructions,
        navigate,
        toggleFavorite,
        updateCardFull,

        handleRegenerate,
        handleBatchDelete,
        handleGlobalImageUpload,
        removeGlobalImage,
        createGroup,
        arrangeSelectionGrid,
        handleBatchChat,

        // Complex Handlers
        handleCanvasDoubleClick,
        handleQuickPromptSubmit,
        handleFullScreen,
        handleChatModalGenerate,
        handleSelectConnected,
        handleChatSubmitWithInstructions,
        handlePromptDropOnChat,
        handlePromptDropOnCanvas,
        handlePromptDropOnCard,
        handleQuickSprout,
        handleSprout,
        handleCreateNote,
        createStandaloneNote,
        handleExpandTopics,
        // NEW
        customSproutPrompt,
        setCustomSproutPrompt,
        handleCustomSprout,
        handleCustomSproutSubmit

    } = useBoardLogic({ user, boardsList, onUpdateBoardTitle, onBack });

    // Background Generation
    const { generateBoardSummary, generateBoardImage, generatingBoardId } = useBoardBackground();
    const hasAutoImageGeneratedRef = useRef(false);
    const hasAutoSummaryGeneratedRef = useRef(false);

    // Auto-generate background when active cards > 10
    // Auto-generation Logic
    useEffect(() => {
        // Filter out soft-deleted cards
        const activeCards = cards.filter(c => !c.deletedAt);
        const count = activeCards.length;

        if (!currentBoardId) return;

        // 1. Text Summary (Cards > 3)
        // Trigger if: Enough cards, not generated this session, no existing summary, AND NO EXISTING IMAGE
        if (count > 3 && !hasAutoSummaryGeneratedRef.current && !currentBoard?.summary && !currentBoard?.backgroundImage) {
            console.log(`[AutoGen] Triggering Summary (Count: ${count})`);
            generateBoardSummary(currentBoardId, (id, updates) => {
                if (onUpdateBoardMetadata) onUpdateBoardMetadata(id, updates);
            });
            hasAutoSummaryGeneratedRef.current = true;
        }

        // 2. Visual Background (Cards > 10)
        // Trigger if: Enough cards, not generated this session, and no existing image
        if (count > 10 && !hasAutoImageGeneratedRef.current && !currentBoard?.backgroundImage) {
            console.log(`[AutoGen] Triggering Image (Count: ${count})`);
            generateBoardImage(currentBoardId, (id, updates) => {
                if (onUpdateBoardMetadata) onUpdateBoardMetadata(id, updates);
            });
            hasAutoImageGeneratedRef.current = true;
        }
    }, [cards, currentBoardId, onUpdateBoardMetadata, currentBoard?.summary, currentBoard?.backgroundImage]);



    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
            <Sidebar className="absolute left-4 top-24 z-40" />

            <div className="absolute inset-0 h-full overflow-hidden">
                <ErrorBoundary level="canvas">
                    <div ref={canvasContainerRef} className="absolute inset-0">
                        <Canvas
                            onCreateNote={handleCreateNote}
                            onCreateStandaloneNote={createStandaloneNote}
                            onCanvasDoubleClick={handleCanvasDoubleClick}
                            onCustomSprout={handleCustomSprout}
                            onCardFullScreen={handleFullScreen}
                            onPromptDrop={handlePromptDropOnCanvas}
                            onCardPromptDrop={handlePromptDropOnCard}
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

                {/* Custom Sprout Modal */}
                <QuickPromptModal
                    isOpen={customSproutPrompt.isOpen}
                    onClose={() => setCustomSproutPrompt(prev => ({ ...prev, isOpen: false }))}
                    onSubmit={handleCustomSproutSubmit}
                    initialPosition={{ x: customSproutPrompt.x, y: customSproutPrompt.y }}
                    placeholder="Tell AI how to generate cards from this..."
                />

                {/* Top Bar */}
                <BoardTopBar
                    onBack={onBack}
                    board={currentBoard}
                    onUpdateTitle={onUpdateBoardTitle}
                />

                <ChatBar
                    cards={cards}
                    selectedIds={selectedIds}
                    generatingCardIds={generatingCardIds}
                    onSubmit={handleChatSubmitWithInstructions}
                    onBatchChat={handleBatchChat}
                    onRegenerate={handleRegenerate}
                    onSprout={handleQuickSprout}
                    onDelete={handleBatchDelete}
                    onCreateNote={handleCreateNote}
                    onImageUpload={handleGlobalImageUpload}
                    globalImages={globalImages}
                    onRemoveImage={removeGlobalImage}
                    onClearImages={() => setGlobalImages([])}
                    onGroup={(ids) => createGroup(ids)}
                    onSelectConnected={handleSelectConnected}
                    onLayoutGrid={arrangeSelectionGrid}
                    onPromptDrop={handlePromptDropOnChat}
                    onExpandTopics={handleExpandTopics}
                    instructions={[...boardPrompts, ...tempInstructions]}
                    onClearInstructions={() => setTempInstructions([])}
                />
                Greenland
                {selectedIds.length > 0 && (
                    <div className="fixed top-3 md:top-6 inset-x-0 mx-auto w-fit bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border border-pink-100/50 dark:border-white/10 px-4 py-2 rounded-full flex items-center gap-3 z-50 animate-slide-up shadow-[0_8px_32px_rgba(244,114,182,0.15)] ring-1 ring-pink-200/20 dark:ring-white/5">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">{selectedIds.length} ITEMS</span>
                        <div className="h-4 w-px bg-slate-100 dark:bg-white/5"></div>

                        {selectedIds.length === 1 && cards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0 && (
                            <button
                                onClick={() => handleExpandTopics(selectedIds[0])}
                                className="p-2 rounded-full text-pink-500 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-all active:scale-90"
                                title={t.toolbar?.expand || "Expand Topics"}
                            >
                                <Star size={18} fill="currentColor" />
                            </button>
                        )}

                        <button
                            onClick={handleRegenerate}
                            className="p-2 rounded-full text-blue-500 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-90"
                            title={t.toolbar?.retry || "Retry Generation"}
                        >
                            <RefreshCw size={18} />
                        </button>

                        <button
                            onClick={() => selectedIds.forEach(id => handleQuickSprout(id))}
                            className="p-2 rounded-full text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all active:scale-90"
                            title={t.toolbar?.sprout || "Sprout Inspiration"}
                        >
                            <Sprout size={18} />
                        </button>

                        <button
                            onClick={() => createGroup(selectedIds)}
                            className="p-2 rounded-full text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-90"
                            title={t.toolbar?.zone || "Create Zone"}
                        >
                            <BoxSelect size={18} />
                        </button>

                        <button
                            onClick={handleBatchDelete}
                            className="p-2 rounded-full text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-90"
                            title={t.toolbar?.delete || "Delete Selected"}
                        >
                            <Trash2 size={18} />
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
                            instructions={[...boardPrompts, ...tempInstructions]}
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
            </div>
        </div>
    );
}
