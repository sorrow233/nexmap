import React, { Suspense, lazy } from 'react';
import { Sparkles, RefreshCw, Trash2, Sprout, BoxSelect } from 'lucide-react';
import Canvas from '../components/Canvas';
import ChatBar from '../components/ChatBar';
import ErrorBoundary from '../components/ErrorBoundary';
import Loading from '../components/Loading';
import StatusBar from '../components/StatusBar';
import BoardTopBar from '../components/board/BoardTopBar';
import Sidebar from '../components/board/Sidebar';
import QuickPromptModal from '../components/QuickPromptModal';
import useBoardBackground from '../hooks/useBoardBackground';
import { useEffect, useRef } from 'react';

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
                    onCreateNote={handleCreateNote}
                    onImageUpload={handleGlobalImageUpload}
                    globalImages={globalImages}
                    onRemoveImage={removeGlobalImage}
                    onClearImages={() => setGlobalImages([])}
                    onGroup={(ids) => createGroup(ids)}
                    onSelectConnected={handleSelectConnected}
                    onLayoutGrid={arrangeSelectionGrid}
                    onPromptDrop={handlePromptDropOnChat}
                    instructions={tempInstructions}
                    onClearInstructions={() => setTempInstructions([])}
                />

                {selectedIds.length > 0 && (
                    <div className="fixed top-3 md:top-6 inset-x-0 mx-auto w-fit glass-panel px-3 md:px-6 py-2 md:py-3 rounded-full flex items-center gap-2 md:gap-4 z-50 animate-slide-up shadow-2xl">
                        <span className="text-xs md:text-sm font-semibold text-slate-300">{selectedIds.length} <span className="hidden sm:inline">{t.toolbar?.items || "items"}</span></span>
                        {selectedIds.length === 1 && cards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0 && (
                            <>
                                <div className="h-4 w-px bg-slate-300"></div>
                                <button onClick={() => handleExpandTopics(selectedIds[0])} className="flex items-center gap-2 text-purple-600 px-3 py-1.5 rounded-lg transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20 active:scale-95"><Sparkles size={16} /><span className="text-sm font-medium">{t.toolbar?.expand || "Expand"}</span></button>
                            </>
                        )}
                        <div className="h-3 md:h-4 w-px bg-slate-300"></div>
                        <button onClick={handleRegenerate} className="flex items-center gap-1 md:gap-2 text-blue-600 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95">
                            <RefreshCw size={14} className="md:w-4 md:h-4" />
                            <span className="hidden sm:inline text-sm font-medium">{t.toolbar?.retry || "Retry"}</span>
                        </button>
                        <div className="h-3 md:h-4 w-px bg-slate-300"></div>
                        <button onClick={() => selectedIds.forEach(id => handleQuickSprout(id))} className="flex items-center gap-1 md:gap-2 text-emerald-600 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-95">
                            <Sprout size={14} className="md:w-4 md:h-4" />
                            <span className="hidden sm:inline text-sm font-medium">{t.toolbar?.sprout || "Sprout"}</span>
                        </button>
                        <div className="h-3 md:h-4 w-px bg-slate-300"></div>
                        <button onClick={() => createGroup(selectedIds)} className="flex items-center gap-1 md:gap-2 text-indigo-600 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95">
                            <BoxSelect size={14} className="md:w-4 md:h-4" />
                            <span className="hidden sm:inline text-sm font-medium">{t.toolbar?.zone || "Zone"}</span>
                        </button>
                        <div className="h-3 md:h-4 w-px bg-slate-300"></div>
                        <button onClick={handleBatchDelete} className="flex items-center gap-1 md:gap-2 text-red-500 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95">
                            <Trash2 size={14} className="md:w-4 md:h-4" />
                            <span className="hidden sm:inline text-sm font-medium">{t.toolbar?.delete || "Delete"}</span>
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
            </div>
        </div>
    );
}
